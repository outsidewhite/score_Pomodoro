import { describe, expect, test, vi } from 'vitest'
import { watchCameraStream } from './cameraStreamMonitor.ts'

// jsdomにはMediaStreamTrackが無いため、EventTargetでended発火だけを再現する。
class FakeTrack extends EventTarget {
  readyState: 'ended' | 'live' = 'live'

  // 実ブラウザと同じく、自分で停止した場合はendedを発火させない。
  stop() {
    this.readyState = 'ended'
  }

  end() {
    this.readyState = 'ended'
    this.dispatchEvent(new Event('ended'))
  }
}

function createFakeStream(tracks: FakeTrack[]) {
  return {
    getTracks: () => tracks,
  } as unknown as MediaStream
}

describe('watchCameraStream', () => {
  test('映像トラックの終了で切断を通知する', () => {
    const track = new FakeTrack()
    const onDisconnect = vi.fn()
    watchCameraStream({ onDisconnect, stream: createFakeStream([track]) })

    track.end()

    expect(onDisconnect).toHaveBeenCalledTimes(1)
  })

  test('複数トラックが終了しても切断処理は1回だけ実行する', () => {
    const tracks = [new FakeTrack(), new FakeTrack()]
    const onDisconnect = vi.fn()
    watchCameraStream({ onDisconnect, stream: createFakeStream(tracks) })

    tracks.forEach((track) => track.end())

    expect(onDisconnect).toHaveBeenCalledTimes(1)
  })

  test('監視を解除するとその後の終了を無視する', () => {
    const track = new FakeTrack()
    const onDisconnect = vi.fn()
    const stopWatching = watchCameraStream({
      onDisconnect,
      stream: createFakeStream([track]),
    })

    stopWatching()
    track.end()

    expect(onDisconnect).not.toHaveBeenCalled()
  })

  test('自分でトラックを停止した場合は切断として扱わない', () => {
    const track = new FakeTrack()
    const onDisconnect = vi.fn()
    watchCameraStream({ onDisconnect, stream: createFakeStream([track]) })

    track.stop()

    expect(onDisconnect).not.toHaveBeenCalled()
  })

  test('終了済みのストリームは監視開始時点で切断として扱う', () => {
    const track = new FakeTrack()
    track.stop()
    const onDisconnect = vi.fn()

    watchCameraStream({ onDisconnect, stream: createFakeStream([track]) })

    expect(onDisconnect).toHaveBeenCalledTimes(1)
  })
})
