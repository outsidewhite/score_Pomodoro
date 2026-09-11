import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  AppToaster,
  dismissAllNotifications,
} from '../../components/Notification/AppToaster.tsx'
import { useCameraDisconnect } from './useCameraDisconnect.ts'

class FakeTrack extends EventTarget {
  readyState: 'ended' | 'live' = 'live'

  stop() {
    this.readyState = 'ended'
  }

  end() {
    this.readyState = 'ended'
    this.dispatchEvent(new Event('ended'))
  }
}

function createFakeStream(track: FakeTrack) {
  return {
    getTracks: () => [track],
  } as unknown as MediaStream
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <>
      <AppToaster />
      {children}
    </>
  )
}

afterEach(() => {
  dismissAllNotifications()
})

describe('useCameraDisconnect', () => {
  test('映像トラックの終了で停止を依頼し、切断通知を1件だけ表示する', async () => {
    const track = new FakeTrack()
    const onDisconnect = vi.fn()
    renderHook(
      () => useCameraDisconnect({ onDisconnect, stream: createFakeStream(track) }),
      { wrapper: Wrapper },
    )

    act(() => track.end())

    expect(onDisconnect).toHaveBeenCalledTimes(1)
    expect(
      await screen.findAllByText('カメラが切断されました'),
    ).toHaveLength(1)
  })

  test('コールバックが再生成されてもイベントリスナーを重複登録しない', () => {
    const track = new FakeTrack()
    const stream = createFakeStream(track)
    const onDisconnect = vi.fn()
    const { rerender } = renderHook(
      // 呼び出しごとに新しい関数を渡し、親の再描画と同じ状況を作る。
      () => useCameraDisconnect({ onDisconnect: () => onDisconnect(), stream }),
      { wrapper: Wrapper },
    )

    rerender()
    rerender()
    act(() => track.end())

    expect(onDisconnect).toHaveBeenCalledTimes(1)
  })

  test('ストリームを差し替えると旧ストリームの終了を無視し、切断通知を閉じる', async () => {
    const oldTrack = new FakeTrack()
    const newTrack = new FakeTrack()
    const onDisconnect = vi.fn()
    render(<AppToaster />)
    const { rerender } = renderHook(
      ({ track }: { track: FakeTrack }) =>
        useCameraDisconnect({ onDisconnect, stream: createFakeStream(track) }),
      { initialProps: { track: oldTrack } },
    )

    act(() => oldTrack.end())
    expect(onDisconnect).toHaveBeenCalledTimes(1)
    await screen.findByText('カメラが切断されました')

    rerender({ track: newTrack })

    await waitFor(() => {
      expect(screen.queryByText('カメラが切断されました')).not.toBeInTheDocument()
    })
    act(() => oldTrack.end())
    expect(onDisconnect).toHaveBeenCalledTimes(1)
  })
})
