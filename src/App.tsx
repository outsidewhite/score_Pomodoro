import { useEffect, useState } from 'react'
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
  targetScore: 80,
}

// バックエンド接続前に加算表示を確認するための元スコア。
const PREVIEW_ORIGINAL_SCORE = 1_200

// 結果画面のデザイン確認用データ。実計測との接続時に置き換える。
const PREVIEW_RESULT: ScoreResult = {
  measuredDurationMs: 25 * 60 * 1_000,
  postureScore: 82,
  presenceScore: 91,
  stabilityScore: 76,
  totalScore: 83,
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

  useEffect(() => {
    // ブラウザの戻る・進む操作でも表示ページをURLと同期する。
    const handlePopState = () => setPage(getPageFromPath())
    window.addEventListener('popstate', handlePopState)

    const availablePaths = ['/start', '/measurement', '/result']
    if (!availablePaths.includes(window.location.pathname)) {
      window.history.replaceState(null, '', '/start')
    }

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleStart = (nextSettings: SessionSettings) => {
    setSettings(nextSettings)
    window.history.pushState(null, '', '/measurement')
    setPage('measurement')
  }

  const handleFinish = () => {
    window.history.pushState(null, '', '/result')
    setPage('result')
  }

  const handleRestart = () => {
    window.history.pushState(null, '', '/start')
    setPage('start')
  }

  return (
    <div className="app-shell">
      {page === 'start' && (
        <StartPage initialSettings={settings} onStart={handleStart} />
      )}
      {page === 'measurement' && (
        <MeasurementPage
          elapsedMs={0}
          onFinish={handleFinish}
          originalScore={PREVIEW_ORIGINAL_SCORE}
          scoreIncrement={PREVIEW_RESULT.totalScore}
          status="measuring"
          targetMinutes={settings.targetMinutes}
          targetScore={settings.targetScore}
        />
      )}
      {page === 'result' && (
        <ResultPage
          onRestart={handleRestart}
          originalScore={PREVIEW_ORIGINAL_SCORE}
          result={PREVIEW_RESULT}
        />
      )}
    </div>
  )
}

export default App
