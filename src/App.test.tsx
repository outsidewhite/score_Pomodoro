import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CAMERA_DISCONNECTED_MESSAGE } from './features/camera/useCameraDisconnect.ts'
import type { PostureBaseline } from './features/scoring/intervalScoring.ts'
import { createScoringSession, saveScoringSession } from './features/scoring/scoringSession.ts'
import { createJourney } from './features/trip/createJourney.ts'
import { saveJourneySession } from './features/trip/journeySession.ts'
import App from './App.tsx'

const measurementPageMock = vi.hoisted(() => vi.fn())

vi.mock('./components/Notification/AppToaster.tsx', () => ({
  AppToaster: () => null,
  CAMERA_DISCONNECTED_MESSAGE:
    'カメラが切断されました。接続を確認して、カメラを再取得してください。',
  dismissCameraDisconnectedNotification: vi.fn(),
  showCameraDisconnectedNotification: vi.fn(),
}))

vi.mock('./pages/measurement/MeasurementPage.tsx', () => ({
  MeasurementPage: (props: {
    baseline: PostureBaseline | null
    cameraError: string | null
    cameraStopRequest: number
    cameraStream: MediaStream | null
    onBaselineChange: (baseline: PostureBaseline) => void
    onCameraFreeze: () => void
    onCameraRetry: () => void
    sessionId: string
    status: string
  }) => {
    measurementPageMock(props)
    return (
      <div data-testid="measurement-page">
        <span>{props.status}</span>
        <span>{props.cameraError}</span>
        <span data-testid="camera-stop-request">{props.cameraStopRequest}</span>
        <button
          type="button"
          onClick={() =>
            props.onBaselineChange({
              centerX: 0.5,
              centerY: 0.5,
              shoulderAngle: 0,
              shoulderWidth: 0.2,
            })
          }
        >
          基準姿勢を設定
        </button>
        <button type="button" onClick={props.onCameraRetry}>
          カメラを再取得
        </button>
        <button type="button" onClick={props.onCameraFreeze}>
          映像フリーズを通知
        </button>
      </div>
    )
  },
}))

// jsdomにはMediaStreamTrackが無いため、EventTargetでended発火だけを再現する。
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

describe('measurementの再読み込み', () => {
  const originalMediaDevices = navigator.mediaDevices

  beforeEach(() => {
    measurementPageMock.mockClear()
    window.sessionStorage.clear()
    window.history.replaceState(null, '', '/measurement')
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    })
    window.history.replaceState(null, '', '/start')
  })

  test('カメラ再取得に失敗してもmeasurementに留まり、ユーザー操作で再試行する', async () => {
    const user = userEvent.setup()
    const cameraStream = {
      getTracks: () => [new FakeTrack()],
    } as unknown as MediaStream
    const getUserMedia = vi.fn()
      .mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
      .mockResolvedValueOnce(cameraStream)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })

    render(<App />)

    expect(screen.getByTestId('measurement-page')).toBeInTheDocument()
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1))
    await screen.findByText('カメラの使用が許可されていません。ブラウザの設定から許可して、もう一度お試しください。')
    expect(window.location.pathname).toBe('/measurement')

    await user.click(screen.getByRole('button', { name: 'カメラを再取得' }))

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2))
    await screen.findByText('measuring')
    expect(window.location.pathname).toBe('/measurement')
  })

  test('採点データが破損している場合は関連するタイマーデータも初期化する', () => {
    window.sessionStorage.setItem('score-pomodoro:scoring-session', '{broken')
    window.sessionStorage.setItem(
      'score-pomodoro:timer-session',
      JSON.stringify({
        lastObservedAt: 5_000,
        logs: [
          { endedAt: null, id: 1, mode: 'focus', startedAt: 1_000 },
        ],
        sessionId: 'old-session',
        version: 1,
      }),
    )

    render(<App />)

    expect(
      window.sessionStorage.getItem('score-pomodoro:timer-session'),
    ).toBeNull()
    expect(measurementPageMock.mock.calls.at(-1)?.[0].sessionId).not.toBe(
      'old-session',
    )
  })

  test('採点セッションに紐づく旅のルートを再読み込み後も復元する', () => {
    const session = createScoringSession()
    const values = [0.999, 0.999]
    const journey = createJourney(() => values.shift() ?? 0)
    saveScoringSession(session)
    saveJourneySession(session.sessionId, journey)

    render(<App />)

    expect(measurementPageMock.mock.calls.at(-1)?.[0].journey).toEqual(journey)
  })

  test('目標時間0分のセッションも再読み込み後に復元する', () => {
    const session = createScoringSession(0)
    saveScoringSession(session)

    render(<App />)

    const props = measurementPageMock.mock.calls.at(-1)?.[0]
    expect(props.sessionId).toBe(session.sessionId)
    expect(props.targetMinutes).toBe(0)
  })
})

describe('開始画面からの計測開始', () => {
  const originalMediaDevices = navigator.mediaDevices

  beforeEach(() => {
    measurementPageMock.mockClear()
    window.sessionStorage.clear()
    window.history.replaceState(null, '', '/start')
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    })
    window.history.replaceState(null, '', '/start')
  })

  test('00:00で開始すると目標時間0分として計測画面へ渡し、保存する', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [new FakeTrack()],
        })),
      },
    })

    render(<App />)

    const minutesInput = screen.getByRole('textbox', { name: '目標時間の分' })
    await user.clear(minutesInput)
    await user.type(minutesInput, '0')
    await user.click(screen.getByRole('button', { name: 'START' }))

    await screen.findByTestId('measurement-page')
    expect(window.location.pathname).toBe('/measurement')
    expect(measurementPageMock.mock.calls.at(-1)?.[0].targetMinutes).toBe(0)
    await waitFor(() => {
      const stored = JSON.parse(
        window.sessionStorage.getItem('score-pomodoro:scoring-session') ?? 'null',
      )
      expect(stored.targetMinutes).toBe(0)
    })
  })
})

describe('計測中のカメラ切断', () => {
  const originalMediaDevices = navigator.mediaDevices

  beforeEach(() => {
    measurementPageMock.mockClear()
    window.sessionStorage.clear()
    window.history.replaceState(null, '', '/measurement')
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    })
    window.history.replaceState(null, '', '/start')
  })

  // 取得のたびに新しいトラックを返し、実際のカメラ再取得と同じ状況を作る。
  function mockCameraTracks() {
    const acquiredTracks: FakeTrack[][] = []
    const getUserMedia = vi.fn(async () => {
      const tracks = [new FakeTrack(), new FakeTrack()]
      acquiredTracks.push(tracks)
      return { getTracks: () => tracks } as unknown as MediaStream
    })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })
    return { acquiredTracks, getUserMedia }
  }

  test('映像トラックの終了でタイマー停止を要求し、再取得で計測へ戻れる', async () => {
    const user = userEvent.setup()
    const { acquiredTracks, getUserMedia } = mockCameraTracks()

    render(<App />)

    await screen.findByText('measuring')
    expect(screen.getByTestId('camera-stop-request')).toHaveTextContent('0')

    // 抜去時は両方のトラックが終了するが、停止要求は1回だけ増える。
    act(() => acquiredTracks[0].forEach((track) => track.end()))

    await screen.findByText('preparing')
    expect(screen.getByTestId('camera-stop-request')).toHaveTextContent('1')
    expect(
      screen.getByText('カメラが切断されました。接続を確認して、カメラを再取得してください。'),
    ).toBeInTheDocument()
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe('/measurement')

    await user.click(screen.getByRole('button', { name: 'カメラを再取得' }))

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2))
    await screen.findByText('measuring')
    // 終了済みストリームを使い回さず、新しく取得したストリームで再開する。
    expect(acquiredTracks).toHaveLength(2)
    expect(screen.getByTestId('camera-stop-request')).toHaveTextContent('1')
  })

  test('映像フリーズの通知でもタイマー停止と再取得待ちへ移る', async () => {
    const user = userEvent.setup()
    mockCameraTracks()
    render(<App />)

    await screen.findByText('measuring')
    await user.click(screen.getByRole('button', { name: '映像フリーズを通知' }))

    await screen.findByText('preparing')
    expect(screen.getByTestId('camera-stop-request')).toHaveTextContent('1')
    expect(screen.getByText(CAMERA_DISCONNECTED_MESSAGE)).toBeInTheDocument()
  })

  test('手動設定した獲得スコアへ採点分を加算し、実測への復帰と再計測で解除できる', async () => {
    const user = userEvent.setup()
    mockCameraTracks()
    render(<App />)
    await screen.findByText('measuring')
    const currentProps = () => measurementPageMock.mock.calls.at(-1)![0]

    act(() => currentProps().onDebugEarnedScoreChange(900))
    expect(currentProps().scoreIncrement).toBe(900)
    // 架空の採点区間を増やさず、次の実測区間だけが保存されることを確認する。
    act(() => currentProps().onScoreUpdate({
      absentCount: 0,
      calibrationSucceeded: true,
      detectedCount: 120,
      detectionScore: 100,
      earnedScore: 3,
      endedAt: 60_000,
      failedCount: 0,
      id: `${currentProps().sessionId}:interval:1`,
      isCalibration: true,
      missedCount: 0,
      postureScore: null,
      stabilityScore: 100,
      startedAt: 0,
      totalScore: 100,
    }))
    expect(currentProps().scoreIncrement).toBe(903)
    const stored = JSON.parse(window.sessionStorage.getItem('score-pomodoro:scoring-session')!)
    expect(stored.intervals).toHaveLength(1)
    expect(stored.intervals[0].earnedScore).toBe(3)

    act(() => currentProps().onDebugEarnedScoreChange(null))
    expect(currentProps().scoreIncrement).toBe(3)
    act(() => currentProps().onDebugEarnedScoreChange(0))
    expect(currentProps().scoreIncrement).toBe(0)
    act(() => currentProps().onDebugEarnedScoreChange(900))
    act(() => currentProps().onFinish())
    expect(screen.getByText('900')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /もう一度/ }))
    act(() => {
      window.history.pushState(null, '', '/measurement')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await screen.findByText('measuring')
    expect(currentProps().scoreIncrement).toBe(0)
  })

  test('切断しても完了区間とメモリ上の基準姿勢は破棄しない', async () => {
    const user = userEvent.setup()
    const baseline: PostureBaseline = {
      centerX: 0.5,
      centerY: 0.5,
      shoulderAngle: 0,
      shoulderWidth: 0.2,
    }
    const session = createScoringSession(25)
    session.intervals = [
      {
        absentCount: 0,
        calibrationSucceeded: true,
        detectedCount: 120,
        detectionScore: 100,
        earnedScore: 3,
        endedAt: 60_000,
        failedCount: 0,
        id: `${session.sessionId}:interval:1`,
        isCalibration: true,
        missedCount: 0,
        postureScore: null,
        stabilityScore: 100,
        startedAt: 0,
        totalScore: 100,
      },
    ]
    session.nextIntervalNumber = 2
    saveScoringSession(session)
    const { acquiredTracks } = mockCameraTracks()

    render(<App />)
    await screen.findByText('measuring')
    await user.click(screen.getByRole('button', { name: '基準姿勢を設定' }))
    await waitFor(() =>
      expect(measurementPageMock.mock.calls.at(-1)?.[0].baseline).toEqual(
        baseline,
      ),
    )

    act(() => acquiredTracks[0].forEach((track) => track.end()))
    await screen.findByText('preparing')

    const stored = JSON.parse(
      window.sessionStorage.getItem('score-pomodoro:scoring-session') ?? 'null',
    )
    expect(stored.intervals).toHaveLength(1)
    expect(stored.baseline).toBeNull()
    expect(stored.nextIntervalNumber).toBe(2)
    // 切断ではAppを再生成しないため、基準姿勢はメモリ上で引き継がれる。
    expect(measurementPageMock.mock.calls.at(-1)?.[0].baseline).toEqual(baseline)
  })
})
