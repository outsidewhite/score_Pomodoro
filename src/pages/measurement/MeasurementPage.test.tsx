import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { toast } from 'sonner'
import { AppToaster } from '../../components/Notification/AppToaster.tsx'
import {
  createTimerSession,
  saveTimerSession,
} from '../../features/session/timerSession.ts'
import { createJourney } from '../../features/trip/createJourney.ts'
import { MeasurementPage } from './MeasurementPage.tsx'

const usePoseScoringMock = vi.hoisted(() => vi.fn())

vi.mock('../../features/pose/usePoseScoring.ts', () => ({
  usePoseScoring: usePoseScoringMock,
}))

type PoseScoringCallbacks = {
  onModelLoadError: (message: string) => void
  onModelLoadStart: () => void
  onModelReady: () => void
  reloadRequest: number
}

function renderMeasurementPage() {
  render(
    <>
      <AppToaster />
      <MeasurementPage
        baseline={null}
        cameraError={null}
        cameraStream={{} as MediaStream}
        elapsedMs={0}
        isPreparingCamera={false}
        journey={createJourney(() => 0)}
        nextIntervalNumber={1}
        onBaselineChange={vi.fn()}
        onCameraRetry={vi.fn()}
        onFinish={vi.fn()}
        onScoreUpdate={vi.fn()}
        originalScore={0}
        scoreIncrement={0}
        sessionId="test-session"
        status="measuring"
      />
    </>,
  )
}

function getLatestScoringCallbacks() {
  return usePoseScoringMock.mock.calls.at(-1)?.[0] as PoseScoringCallbacks
}

describe('MeasurementPageのモデル準備', () => {
  beforeEach(() => {
    usePoseScoringMock.mockClear()
    window.sessionStorage.clear()
    // jsdomでは映像再生を実行できないため、準備済みPromiseとして置き換える。
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  })

  afterEach(() => {
    toast.dismiss()
    vi.restoreAllMocks()
  })

  test('読み込み完了までタイマー開始を無効化して通知する', async () => {
    renderMeasurementPage()
    const callbacks = getLatestScoringCallbacks()

    act(() => callbacks.onModelLoadStart())

    expect(await screen.findByText('モデル読み込み中です')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'タイマーを開始する' }),
    ).toBeDisabled()

    act(() => callbacks.onModelReady())

    expect(await screen.findByText('読み込みに成功しました！')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'タイマーを開始する' }),
    ).toBeEnabled()
  })

  test('読み込み失敗通知からユーザーが再読み込みを要求できる', async () => {
    const user = userEvent.setup()
    renderMeasurementPage()
    const callbacks = getLatestScoringCallbacks()

    act(() => callbacks.onModelLoadError('モデルを取得できませんでした。'))

    await user.click(await screen.findByRole('button', { name: '再読み込み' }))

    await waitFor(() => {
      expect(getLatestScoringCallbacks().reloadRequest).toBe(1)
    })
    expect(
      screen.getByRole('button', { name: 'タイマーを開始する' }),
    ).toBeDisabled()
  })

  test('同じ採点セッションの経過時間とログを復元する', () => {
    const observedAt = Date.now() - 5_000
    const timerSession = createTimerSession('test-session', observedAt)
    timerSession.logs = [
      {
        endedAt: null,
        id: 1,
        mode: 'focus',
        startedAt: observedAt - 60_000,
      },
    ]
    saveTimerSession(timerSession)

    renderMeasurementPage()

    expect(screen.getByText('00:01:00')).toBeInTheDocument()
    expect(screen.getByText('集中')).toBeInTheDocument()
    expect(screen.getByText('離席')).toBeInTheDocument()
  })
})
