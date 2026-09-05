import { useCallback, useState } from 'react'
import { SessionLog } from '../../components/Timer/SessionLog.tsx'
import { Timer } from '../../components/Timer/Timer.tsx'
import type { TimerLogEntry } from '../../components/Timer/timerTypes.ts'
import { AppHeader } from '../../components/ui/AppHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import type { MeasurementStatus } from '../../shared/types/measurement.ts'
import './MeasurementPage.css'

type MeasurementPageProps = {
  elapsedMs: number
  onFinish: () => void
  originalScore: number
  scoreIncrement: number | null
  status: MeasurementStatus
  targetMinutes?: number
  targetScore?: number
}

function formatScore(score: number) {
  return score.toLocaleString('ja-JP')
}

export function MeasurementPage({
  elapsedMs,
  onFinish,
  originalScore,
  scoreIncrement,
  status,
  targetMinutes = 25,
  targetScore = 80,
}: MeasurementPageProps) {
  // 実際のカメラ制御を接続するまで、画面上の表示状態だけを管理する。
  const [isCameraVisible, setIsCameraVisible] = useState(true)
  const [isCameraRunning, setIsCameraRunning] = useState(false)
  const [timerNow, setTimerNow] = useState(Date.now)
  const [timerLogs, setTimerLogs] = useState<TimerLogEntry[]>([])
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
  // 現在値は、計測開始前のスコアへバックエンドからの加算分を足して求める。
  const addedScore = scoreIncrement ?? 0
  const currentScore = originalScore + addedScore

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
                className={`camera-panel__preview ${!isCameraVisible ? 'camera-panel__preview--hidden' : ''}`}
                aria-label="カメラ映像表示領域"
              >
                <div className="camera-panel__placeholder">
                  <span className="camera-panel__camera-icon" aria-hidden="true" />
                  <strong>
                    {!isCameraVisible
                      ? 'カメラ映像は非表示です'
                      : isCameraRunning
                        ? 'カメラ映像を表示します'
                        : 'カメラは停止しています'}
                  </strong>
                  <small>映像コンポーネントは後からここへ接続できます</small>
                </div>
              </div>

              <div className="camera-panel__controls" aria-label="カメラ操作">
                <Button
                  variant="secondary"
                  aria-pressed={!isCameraVisible}
                  onClick={() => setIsCameraVisible((visible) => !visible)}
                >
                  {isCameraVisible ? 'カメラ非表示' : 'カメラ表示'}
                </Button>
                <Button
                  aria-pressed={isCameraRunning}
                  onClick={() => setIsCameraRunning((running) => !running)}
                >
                  {isCameraRunning ? 'カメラ停止' : 'カメラ起動'}
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
                  targetMinutes={targetMinutes}
                />
              </div>
            </div>
          </section>
        </div>

        <section
          className="measurement-panel measurement-panel--score"
          aria-label="集中スコア"
        >
          <div className="score-panel__body">
            <div className="score-panel__current" aria-live="polite">
              <span>現在のスコア</span>
              <strong>{formatScore(currentScore)}</strong>
              <small>
                元のスコア {formatScore(originalScore)} ＋ 加算{' '}
                {scoreIncrement === null ? '—' : formatScore(scoreIncrement)}
              </small>
            </div>

            <div className="score-panel__target">
              <div>
                <span>目標スコア</span>
                <strong>{targetScore}</strong>
              </div>
              <div className="score-panel__progress" aria-hidden="true">
                <span />
              </div>
            </div>

            <div className="score-panel__placeholder">
              <span aria-hidden="true">↗</span>
              <div>
                <strong>スコア表示エリア</strong>
                <p>推移グラフと目標に応じた演出を、次の実装で追加します。</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
