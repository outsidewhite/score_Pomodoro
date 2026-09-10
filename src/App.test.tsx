import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CAMERA_DISCONNECTED_MESSAGE } from './features/camera/useCameraDisconnect.ts'
import { createScoringSession, saveScoringSession } from './features/scoring/scoringSession.ts'
import App from './App.tsx'

const measurementPageMock = vi.hoisted(() => vi.fn())

vi.mock('./components/Notification/AppToaster.tsx', () => ({
  AppToaster: () => null,
}))

vi.mock('./pages/measurement/MeasurementPage.tsx', () => ({
  MeasurementPage: (props: {
    cameraError: string | null
    cameraStopRequest: number
    cameraStream: MediaStream | null
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

  test('切断しても保存済みの完了区間と基準姿勢は破棄しない', async () => {
    const session = createScoringSession(25)
    session.baseline = {
      centerX: 0.5,
      centerY: 0.5,
      shoulderAngle: 0,
      shoulderWidth: 0.2,
    }
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

    act(() => acquiredTracks[0].forEach((track) => track.end()))
    await screen.findByText('preparing')

    const stored = JSON.parse(
      window.sessionStorage.getItem('score-pomodoro:scoring-session') ?? 'null',
    )
    expect(stored.intervals).toHaveLength(1)
    expect(stored.baseline).toEqual(session.baseline)
    expect(stored.nextIntervalNumber).toBe(2)
  })
})
