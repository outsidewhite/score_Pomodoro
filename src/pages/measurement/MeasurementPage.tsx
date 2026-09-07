import { useCallback, useEffect, useRef, useState } from 'react'
import { ScoreJourney } from '../../components/Animation/ScoreJourney.tsx'
import { SessionLog } from '../../components/Timer/SessionLog.tsx'
import { Timer } from '../../components/Timer/Timer.tsx'
import type { TimerLogEntry, TimerMode } from '../../components/Timer/timerTypes.ts'
import { ScorePanel } from '../../components/Score/ScorePanel.tsx'
import { AppHeader } from '../../components/ui/AppHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { usePoseScoring } from '../../features/pose/usePoseScoring.ts'
import type { ScoreResult } from '../../features/scoring/scoreTypes.ts'
import type { Journey } from '../../features/trip/types.ts'
import type { MeasurementStatus } from '../../shared/types/measurement.ts'
import './MeasurementPage.css'

type MeasurementPageProps = {
  cameraStream: MediaStream
  elapsedMs: number
  journey: Journey
  onFinish: () => void
  onScoreUpdate: (result: ScoreResult) => void
  originalScore: number
  scoreIncrement: number | null
  status: MeasurementStatus
  targetMinutes?: number
}

export function MeasurementPage({
  cameraStream,
  elapsedMs,
  journey,
  onFinish,
  onScoreUpdate,
  originalScore,
  scoreIncrement,
  status,
  targetMinutes = 25,
}: MeasurementPageProps) {
  const [isCameraBlurred, setIsCameraBlurred] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [timerNow, setTimerNow] = useState(Date.now)
  const [timerLogs, setTimerLogs] = useState<TimerLogEntry[]>([])
  const [analysisStatus, setAnalysisStatus] = useState<'error' | 'loading' | 'paused' | 'ready'>('paused')
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [timerMode, setTimerMode] = useState<TimerMode>('away')
  // Timerの単一クロックをログ表示にも渡し、秒の切り替わりを同期する。
  const handleTimerClockUpdate = useCallback((currentTimeMs: number) => {
    setTimerNow(currentTimeMs)
  }, [])
  // 新しいモードが始まった時刻で直前のログを確定する。
  const handleTimerLog = useCallback((entry: TimerLogEntry) => {
    setTimerLogs((currentLogs) => {
      const nextLogs = [...currentLogs]
      const previousEntry = nextLogs.at(-1)

      if (previousEntry && previousEntry.endedAt === null) {
        nextLogs[nextLogs.length - 1] = {
          ...previousEntry,
          endedAt: Math.max(previousEntry.startedAt, entry.startedAt),
        }
      }

      nextLogs.push(entry)
      return nextLogs
    })
  }, [])
  const handleAnalysisReady = useCallback(() => {
    setAnalysisStatus('ready')
    setAnalysisError(null)
  }, [])
  const handleAnalysisError = useCallback((message: string) => {
    setAnalysisStatus('error')
    setAnalysisError(message)
  }, [])
  const handleTimerModeChange = useCallback((nextMode: TimerMode) => {
    setTimerMode(nextMode)
    setAnalysisError(null)
    // 集中開始時だけ解析準備へ入り、それ以外では未確定の採点を停止状態として扱う。
    setAnalysisStatus(nextMode === 'focus' ? 'loading' : 'paused')
  }, [])
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // START時に取得したストリームを表示する。ぼかし操作でもストリーム自体は停止しない。
    video.srcObject = cameraStream
    void video.play()

    return () => {
      video.srcObject = null
    }
  }, [cameraStream])

  usePoseScoring({
    enabled: status === 'measuring' && timerMode === 'focus',
    onError: handleAnalysisError,
    onReady: handleAnalysisReady,
    onResult: onScoreUpdate,
    videoRef,
  })

  return (
    <main className="measurement-page">
      <AppHeader
        status={status === 'measuring' ? '計測中' : '計測準備中'}
        statusTone={status === 'measuring' ? 'active' : 'setup'}
      />

      {/* 左を上下1:1、画面全体を横3:2に分ける計測画面の基本骨格。 */}
      <div className="measurement-page__layout">
        <div className="measurement-page__left-column">
          <section
            className="measurement-panel measurement-panel--camera"
            aria-label="カメラ"
          >
            <div className="camera-panel__body">
              <div
                className={`camera-panel__preview ${isCameraBlurred ? 'camera-panel__preview--blurred' : ''}`}
                aria-label="カメラ映像表示領域"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                />
                {isCameraBlurred && (
                  <div className="camera-panel__blur-message">
                    <strong>カメラ映像をぼかしています</strong>
                    <small>計測は引き続き動作しています</small>
                  </div>
                )}
              </div>

              <div className="camera-panel__controls" aria-label="カメラ操作">
                <Button
                  variant="secondary"
                  aria-pressed={isCameraBlurred}
                  onClick={() => setIsCameraBlurred((blurred) => !blurred)}
                >
                  {isCameraBlurred ? 'ぼかしを解除' : 'カメラをぼかす'}
                </Button>
              </div>
            </div>
          </section>

          <section
            className="measurement-panel measurement-panel--timer"
            aria-label="タイマー"
          >
            <div className="timer-panel__body">
              <SessionLog currentTimeMs={timerNow} entries={timerLogs} />

              <div className="timer-panel__clock">
                <Timer
                  disabled={status !== 'measuring'}
                  initialElapsedMs={elapsedMs}
                  onClockUpdate={handleTimerClockUpdate}
                  onExit={onFinish}
                  onLogEntry={handleTimerLog}
                  onModeChange={handleTimerModeChange}
                  targetMinutes={targetMinutes}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="measurement-page__score-column">
          <ScoreJourney
            journey={journey}
            score={originalScore + (scoreIncrement ?? 0)}
          />
          <ScorePanel
            analysisError={analysisError}
            analysisStatus={analysisStatus}
            originalScore={originalScore}
            scoreIncrement={scoreIncrement}
          />
        </div>
      </div>
    </main>
  )
}
