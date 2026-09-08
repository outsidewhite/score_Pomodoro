import { useCallback, useEffect, useRef, useState } from 'react'
import { AppToaster } from './components/Notification/AppToaster.tsx'
import type { ScoreResult } from './features/scoring/scoreTypes.ts'
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

// セッション開始時の累積スコアは0点から始める。
const INITIAL_SCORE = 0

const EMPTY_RESULT: ScoreResult = {
  measuredDurationMs: 0,
  postureScore: 0,
  presenceScore: 0,
  stabilityScore: 0,
  totalScore: 0,
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
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SETTINGS)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isPreparingCamera, setIsPreparingCamera] = useState(false)
  const [scoreResult, setScoreResult] = useState<ScoreResult>(EMPTY_RESULT)
  const cameraStreamRef = useRef<MediaStream | null>(null)

  // 計測終了後にカメラが動き続けないよう、保持中の全トラックをまとめて終了する。
  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    setCameraStream(null)
  }, [])

  useEffect(() => {
    // ブラウザの戻る・進む操作でも表示ページをURLと同期する。
    const handlePopState = () => {
      const nextPage = getPageFromPath()

      // カメラ未許可の状態では、履歴操作から計測画面へ直接入れないようにする。
      if (nextPage === 'measurement' && !cameraStreamRef.current) {
        window.history.replaceState(null, '', '/start')
        setPage('start')
        return
      }

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

    // 再読み込みなどでカメラなしに計測URLを開いた場合も、開始画面へ戻す。
    if (window.location.pathname === '/measurement' && !cameraStreamRef.current) {
      window.history.replaceState(null, '', '/start')
      setPage('start')
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [stopCamera])

  const handleStart = async (nextSettings: SessionSettings) => {
    setIsPreparingCamera(true)
    setCameraError(null)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('unsupported')
      }

      // START操作をユーザー起点としてカメラ許可を求め、成功した場合だけ計測へ進む。
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      })
      cameraStreamRef.current = stream
      setCameraStream(stream)
      setScoreResult(EMPTY_RESULT)
      setSettings(nextSettings)
      window.history.pushState(null, '', '/measurement')
      setPage('measurement')
    } catch (error) {
      const permissionDenied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')

      setCameraError(
        permissionDenied
          ? 'カメラの使用が許可されていません。ブラウザの設定から許可して、もう一度お試しください。'
          : 'カメラを利用できませんでした。接続状況を確認して、もう一度お試しください。',
      )
    } finally {
      setIsPreparingCamera(false)
    }
  }

  const handleFinish = () => {
    stopCamera()
    window.history.pushState(null, '', '/result')
    setPage('result')
  }

  const handleScoreUpdate = useCallback((evaluation: ScoreResult) => {
    // 完了した3分区間の平均スコアだけを、今回の獲得スコアへ加算する。
    setScoreResult((currentResult) => ({
      ...evaluation,
      measuredDurationMs:
        currentResult.measuredDurationMs + evaluation.measuredDurationMs,
      totalScore: currentResult.totalScore + evaluation.totalScore,
    }))
  }, [])

  const handleRestart = () => {
    stopCamera()
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
      {page === 'measurement' && cameraStream && (
        <MeasurementPage
          cameraStream={cameraStream}
          elapsedMs={0}
          onFinish={handleFinish}
          onScoreUpdate={handleScoreUpdate}
          originalScore={INITIAL_SCORE}
          scoreIncrement={scoreResult.totalScore}
          status="measuring"
          targetMinutes={settings.targetMinutes}
        />
      )}
      {page === 'result' && (
        <ResultPage
          onRestart={handleRestart}
          originalScore={INITIAL_SCORE}
          result={scoreResult}
        />
      )}
    </div>
  )
}

export default App
