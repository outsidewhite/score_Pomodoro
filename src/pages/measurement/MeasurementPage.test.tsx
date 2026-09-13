import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  AppToaster,
  dismissAllNotifications,
} from '../../components/Notification/AppToaster.tsx'
import {
  createTimerSession,
  saveTimerSession,
} from '../../features/session/timerSession.ts'
import { createJourney } from '../../features/trip/createJourney.ts'
import type { MeasurementStatus } from '../../shared/types/measurement.ts'
import { MeasurementPage } from './MeasurementPage.tsx'

const usePoseScoringMock = vi.hoisted(() => vi.fn())

vi.mock('../../features/pose/usePoseScoring.ts', () => ({
  usePoseScoring: usePoseScoringMock,
}))

type PoseScoringCallbacks = {
  enabled: boolean
  onModelLoadError: (message: string) => void
  onModelLoadStart: () => void
  onModelReady: () => void
  reloadRequest: number
}

type RenderOverrides = {
  scoreIncrement?: number
  cameraError?: string | null
  cameraStopRequest?: number
  cameraStream?: MediaStream | null
}

function measurementPageElement(
  status: MeasurementStatus = 'measuring',
  overrides: RenderOverrides = {},
) {
  const {
    cameraError = null,
    cameraStopRequest = 0,
    cameraStream = {} as MediaStream,
  } = overrides
  return (
    <>
      <AppToaster />
      <MeasurementPage
        baseline={null}
        cameraError={cameraError}
        cameraStopRequest={cameraStopRequest}
        cameraStream={cameraStream}
        elapsedMs={0}
        isPreparingCamera={false}
        journey={createJourney(() => 0)}
        latestEarnedScore={null}
        nextIntervalNumber={1}
        onBaselineChange={vi.fn()}
        onCameraRetry={vi.fn()}
        onFinish={vi.fn()}
        onScoreUpdate={vi.fn()}
        originalScore={0}
        scoreIncrement={overrides.scoreIncrement ?? 0}
        sessionId="test-session"
        status={status}
      />
    </>
  )
}

function renderMeasurementPage(
  status: MeasurementStatus = 'measuring',
  overrides: RenderOverrides = {},
) {
  return render(measurementPageElement(status, overrides))
}

function getLatestScoringCallbacks() {
  return usePoseScoringMock.mock.calls.at(-1)?.[0] as PoseScoringCallbacks
}

beforeEach(() => {
  usePoseScoringMock.mockClear()
  window.sessionStorage.clear()
  // jsdomでは映像再生を実行できないため、準備済みPromiseとして置き換える。
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
})

afterEach(() => {
  dismissAllNotifications()
  vi.restoreAllMocks()
})

describe('MeasurementPageのモデル準備', () => {
  test('モデルが準備できても初回開始までは自宅、開始後の再読込待ちは停止になる', async () => {
    const user = userEvent.setup()
    renderMeasurementPage()
    act(() => getLatestScoringCallbacks().onModelReady())
    expect(screen.getByText('準備ステージ')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'タイマーを開始する' }))
    expect(screen.getByText('ゆっくり前進中')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'タイマーを停止する' }))
    act(() => getLatestScoringCallbacks().onModelLoadStart())
    expect(screen.getByText('停止中')).toBeInTheDocument()
    expect(screen.queryByText('準備ステージ')).not.toBeInTheDocument()
  })

  test('タイマーの実測値を到着時に固定し、開閉と再読込でも同じ履歴を表示する', () => {
    vi.useFakeTimers()
    try {
      // 仮想時間下では同期クリックを使い、入力処理の待機とクロックを分離する。
      const page = renderMeasurementPage()
      act(() => getLatestScoringCallbacks().onModelReady())
      fireEvent.click(screen.getByRole('button', { name: 'タイマーを開始する' }))
      act(() => { vi.advanceTimersByTime(60_000) })
      fireEvent.click(screen.getByRole('button', { name: '休憩に入る' }))
      act(() => { vi.advanceTimersByTime(15_000) })
      fireEvent.click(screen.getByRole('button', { name: '集中に戻る' }))
      act(() => { vi.advanceTimersByTime(2_000) })
      // 採点確定による累積点の更新を再現し、休憩を含む表示時刻を記録する。
      page.rerender(measurementPageElement('measuring', { scoreIncrement: 45 }))
      fireEvent.click(screen.getByRole('button', { name: '休憩に入る' }))
      fireEvent.click(screen.getByRole('button', { name: '地図を開く' }))
      expect(within(screen.getByRole('dialog')).getByText('00:01:17')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(5_000) })
      expect(within(screen.getByRole('region', { name: 'タイマー' })).getByText('00:01:22')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: '目的地リストを開く' }))
      expect(within(screen.getByRole('dialog')).getByText('00:01:17')).toBeInTheDocument()
      expect(within(screen.getByRole('dialog')).getByText('00:16:17')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: '集中に戻る' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      page.unmount()
      renderMeasurementPage('measuring', { scoreIncrement: 45 })
      fireEvent.click(screen.getByRole('button', { name: '目的地リストを開く' }))
      expect(within(screen.getByRole('dialog')).getByText('00:01:17')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
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
    const sessionLog = screen.getByRole('region', { name: 'セッションログ' })
    expect(within(sessionLog).getByText('集中')).toBeInTheDocument()
    expect(within(sessionLog).getByText('離席')).toBeInTheDocument()

    act(() => getLatestScoringCallbacks().onModelReady())
    expect(
      screen.getByRole('button', { name: 'タイマーを開始する' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })
})

// ランプ（ヘッダー）とタイマーの表示が、同じ状態を指していることを確認する。
function expectStatus(label: string, tone: string, timerMode: string) {
  const status = screen.getByRole('status')
  expect(status).toHaveTextContent(label)
  expect(status).toHaveClass(`app-header__status--${tone}`)
  expect(
    screen.getByText(/^\d\d:\d\d:\d\d$/).closest('.session-timer'),
  ).toHaveClass(`session-timer--${timerMode}`)
}

describe('MeasurementPageの状態表示', () => {
  test('タイマー開始前は離席中として表示する', () => {
    renderMeasurementPage()

    expectStatus('離席中', 'away', 'away')
  })

  test('タイマーの開始・休憩・停止に合わせて状態表示が切り替わる', async () => {
    const user = userEvent.setup()
    renderMeasurementPage()
    // タイマーはモデルの読み込みが完了してから開始できる。
    act(() => getLatestScoringCallbacks().onModelReady())

    await user.click(screen.getByRole('button', { name: 'タイマーを開始する' }))
    expectStatus('計測中', 'measuring', 'focus')

    await user.click(screen.getByRole('button', { name: '休憩に入る' }))
    expectStatus('休憩中', 'break', 'break')

    await user.click(screen.getByRole('button', { name: '集中に戻る' }))
    expectStatus('計測中', 'measuring', 'focus')

    await user.click(screen.getByRole('button', { name: 'タイマーを停止する' }))
    expectStatus('離席中', 'away', 'away')
  })

  test('計測開始前の状態では計測準備中として表示する', () => {
    renderMeasurementPage('preparing')

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('計測準備中')
    expect(status).toHaveClass('app-header__status--setup')
  })
})


describe('MeasurementPageのカメラ切断', () => {
  test('カメラ切断の停止要求でタイマーを停止する', async () => {
    const user = userEvent.setup()
    const { rerender } = renderMeasurementPage()
    act(() => getLatestScoringCallbacks().onModelReady())

    await user.click(screen.getByRole('button', { name: 'タイマーを開始する' }))
    expectStatus('計測中', 'measuring', 'focus')

    rerender(measurementPageElement('measuring', { cameraStopRequest: 1 }))

    await screen.findByRole('button', { name: 'タイマーを開始する' })
    expectStatus('離席中', 'away', 'away')
  })

  test('カメラ切断後は姿勢解析を停止する', async () => {
    const user = userEvent.setup()
    const { rerender } = renderMeasurementPage()
    act(() => getLatestScoringCallbacks().onModelReady())

    await user.click(screen.getByRole('button', { name: 'タイマーを開始する' }))
    await waitFor(() => expect(getLatestScoringCallbacks().enabled).toBe(true))

    // 切断でカメラが未接続へ戻ると、計測準備中として解析を止める。
    rerender(
      measurementPageElement('preparing', {
        cameraStopRequest: 1,
        cameraStream: null,
      }),
    )

    await waitFor(() => expect(getLatestScoringCallbacks().enabled).toBe(false))
  })

  test('カメラ切断時は既存の再取得操作を表示する', () => {
    renderMeasurementPage('preparing', {
      cameraError: 'カメラが切断されました。接続を確認して、カメラを再取得してください。',
      cameraStopRequest: 1,
      cameraStream: null,
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'カメラが切断されました。接続を確認して、カメラを再取得してください。',
    )
    expect(
      screen.getByRole('button', { name: 'カメラを再取得' }),
    ).toBeInTheDocument()
  })
})
