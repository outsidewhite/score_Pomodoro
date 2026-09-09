import { useCallback, useEffect, useRef, useState } from 'react'
import { AppToaster } from './components/Notification/AppToaster.tsx'
import type {
  PostureBaseline,
  ScoreIntervalResult,
} from './features/scoring/intervalScoring.ts'
import {
  appendScoreInterval,
  clearScoringSession,
  createScoringSession,
  getTotalEarnedScore,
  loadScoringSession,
  saveScoringSession,
  summarizeScoringSession,
} from './features/scoring/scoringSession.ts'
import { clearTimerSession } from './features/session/timerSession.ts'
import { MeasurementPage } from './pages/measurement/MeasurementPage.tsx'
import { ResultPage } from './pages/result/ResultPage.tsx'
import {
  StartPage,
  type SessionSettings,
} from './pages/start/StartPage.tsx'
import './App.css'

type AppPage = 'measurement' | 'result' | 'start'

const DEFAULT_SETTINGS: SessionSettings = {
  targetMinutes: 25,
}

// 旅の累積値は現在のセッションで獲得した点数から始める。
const INITIAL_SCORE = 0

function createInitialScoringSession() {
  const restoredSession = loadScoringSession()
  if (restoredSession) return restoredSession

  // 採点データが無い、または破損している場合は古いタイマーログも引き継がない。
  clearTimerSession()
  return createScoringSession(DEFAULT_SETTINGS.targetMinutes)
}

function getPageFromPath(): AppPage {
  if (window.location.pathname === '/measurement') {
    return 'measurement'
  }

  if (window.location.pathname === '/result') {
    return 'result'
  }

  return 'start'
}

function App() {
  const [page, setPage] = useState<AppPage>(getPageFromPath)
  const [scoringSession, setScoringSession] = useState(
    createInitialScoringSession,
  )
  const [settings, setSettings] = useState<SessionSettings>({
    targetMinutes: scoringSession.targetMinutes,
  })
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isPreparingCamera, setIsPreparingCamera] = useState(false)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const isPreparingCameraRef = useRef(false)
  const scoreResult = summarizeScoringSession(scoringSession)
  const totalEarnedScore = getTotalEarnedScore(scoringSession)

  useEffect(() => {
    // 完了区間と基準姿勢を毎回保存し、再読み込み後も同じセッションを復元する。
    saveScoringSession(scoringSession)
  }, [scoringSession])

  // 計測終了後にカメラが動き続けないよう、保持中の全トラックをまとめて終了する。
  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    setCameraStream(null)
  }, [])

  const requestCamera = useCallback(async () => {
    if (cameraStreamRef.current) return cameraStreamRef.current
    if (isPreparingCameraRef.current) return null

    isPreparingCameraRef.current = true
    setIsPreparingCamera(true)
    setCameraError(null)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('unsupported')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      })
      cameraStreamRef.current = stream
      setCameraStream(stream)
      return stream
    } catch (error) {
      const permissionDenied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')

      setCameraError(
        permissionDenied
          ? 'カメラの使用が許可されていません。ブラウザの設定から許可して、もう一度お試しください。'
          : 'カメラを利用できませんでした。接続状況を確認して、もう一度お試しください。',
      )
      return null
    } finally {
      isPreparingCameraRef.current = false
      setIsPreparingCamera(false)
    }
  }, [])

  useEffect(() => {
    // ブラウザの戻る・進む操作でも表示ページをURLと同期する。
    const handlePopState = () => {
      const nextPage = getPageFromPath()

      if (nextPage !== 'measurement') {
        stopCamera()
      }
      setPage(nextPage)
    }
    window.addEventListener('popstate', handlePopState)

    const availablePaths = ['/start', '/measurement', '/result']
    if (!availablePaths.includes(window.location.pathname)) {
      window.history.replaceState(null, '', '/start')
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [stopCamera])

  useEffect(() => {
    if (page !== 'measurement' || cameraStreamRef.current) return

    // リロード後も計測画面を維持し、失われたカメラストリームだけを再取得する。
    void requestCamera()
  }, [page, requestCamera])

  const handleStart = async (nextSettings: SessionSettings) => {
    // START操作をユーザー起点としてカメラ許可を求め、成功した場合だけ計測へ進む。
    const stream = await requestCamera()
    if (!stream) return

    setSettings(nextSettings)
    setScoringSession((currentSession) => ({
      ...currentSession,
      targetMinutes: nextSettings.targetMinutes,
    }))
    window.history.pushState(null, '', '/measurement')
    setPage('measurement')
  }

  const handleCameraRetry = useCallback(() => {
    void requestCamera()
  }, [requestCamera])

  const handleFinish = () => {
    stopCamera()
    window.history.pushState(null, '', '/result')
    setPage('result')
  }

  const handleScoreUpdate = useCallback((evaluation: ScoreIntervalResult) => {
    // Reactの再描画や再通知でも、同じ区間を二重加算しない。
    setScoringSession((currentSession) => {
      const nextSession = appendScoreInterval(currentSession, evaluation)
      // 完了通知と同じ処理内で保存し、直後のリロードでも確定区間を失わない。
      saveScoringSession(nextSession)
      return nextSession
    })
  }, [])

  const handleBaselineChange = useCallback((baseline: PostureBaseline) => {
    setScoringSession((currentSession) => ({ ...currentSession, baseline }))
  }, [])

  const handleRestart = () => {
    stopCamera()
    clearScoringSession()
    clearTimerSession()
    const nextSession = createScoringSession(settings.targetMinutes)
    setScoringSession(nextSession)
    window.history.pushState(null, '', '/start')
    setPage('start')
  }

  return (
    <div className="app-shell">
      {/* 通知はアプリ全体で1箇所にまとめ、各画面からはtoast経由で呼び出す。 */}
      <AppToaster />

      {page === 'start' && (
        <StartPage
          cameraError={cameraError}
          initialSettings={settings}
          isPreparing={isPreparingCamera}
          onStart={handleStart}
        />
      )}
      {page === 'measurement' && (
        <MeasurementPage
          baseline={scoringSession.baseline}
          cameraError={cameraError}
          cameraStream={cameraStream}
          elapsedMs={0}
          isPreparingCamera={isPreparingCamera}
          nextIntervalNumber={scoringSession.nextIntervalNumber}
          onBaselineChange={handleBaselineChange}
          onCameraRetry={handleCameraRetry}
          onFinish={handleFinish}
          onScoreUpdate={handleScoreUpdate}
          originalScore={INITIAL_SCORE}
          scoreIncrement={totalEarnedScore}
          sessionId={scoringSession.sessionId}
          status={cameraStream ? 'measuring' : 'preparing'}
          targetMinutes={settings.targetMinutes}
        />
      )}
      {page === 'result' && (
        <ResultPage
          earnedScore={totalEarnedScore}
          onRestart={handleRestart}
          originalScore={INITIAL_SCORE}
          result={scoreResult}
        />
      )}
    </div>
  )
}

export default App
