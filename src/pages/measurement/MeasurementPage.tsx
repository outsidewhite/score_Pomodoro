import { useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import type { MeasurementStatus } from '../../shared/types/measurement.ts'
import './MeasurementPage.css'

type MeasurementPageProps = {
  currentScore: number | null
  elapsedMs: number
  onFinish: () => void
  status: MeasurementStatus
}

function formatElapsedTime(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function MeasurementPage({
  currentScore,
  elapsedMs,
  onFinish,
  status,
}: MeasurementPageProps) {
  // 実際のカメラ制御を接続するまで、画面上の表示状態だけを管理する。
  const [isCameraVisible, setIsCameraVisible] = useState(true)
  const [isCameraRunning, setIsCameraRunning] = useState(false)
  const scoreLabel = currentScore === null ? '—' : currentScore

  return (
    <main className="measurement-page">
      <header className="measurement-page__header">
        <div className="measurement-page__brand">
          <span aria-hidden="true">S</span>
          <div>
            <strong>Score Pomodoro</strong>
            <small>FOCUS SESSION</small>
          </div>
        </div>
        <div className="measurement-page__session-status" role="status">
          <span aria-hidden="true" />
          {status === 'measuring' ? '計測中' : '計測準備中'}
        </div>
      </header>

      {/* 左を上下1:1、画面全体を横3:2に分ける計測画面の基本骨格。 */}
      <div className="measurement-page__layout">
        <div className="measurement-page__left-column">
          <section
            className="measurement-panel measurement-panel--camera"
            aria-labelledby="camera-panel-title"
          >
            <header className="measurement-panel__header">
              <div>
                <span className="measurement-panel__accent" aria-hidden="true" />
                <div>
                  <p>CAMERA</p>
                  <h2 id="camera-panel-title">カメラ</h2>
                </div>
              </div>
              <span className="measurement-panel__badge">
                {isCameraRunning ? '起動中' : '停止中'}
              </span>
            </header>

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
            aria-labelledby="timer-panel-title"
          >
            <header className="measurement-panel__header">
              <div>
                <span className="measurement-panel__accent" aria-hidden="true" />
                <div>
                  <p>TIMER</p>
                  <h2 id="timer-panel-title">タイマー</h2>
                </div>
              </div>
            </header>

            <div className="timer-panel__body">
              <div className="timer-panel__log" aria-label="セッションログ">
                <h3>セッションログ</h3>
                <ol>
                  <li>
                    <time>00:00</time>
                    <span>計測を開始しました</span>
                  </li>
                  <li className="timer-panel__log-placeholder">
                    <span>新しいイベントがここに追加されます</span>
                  </li>
                </ol>
              </div>

              <div className="timer-panel__clock">
                <p>経過時間</p>
                <strong aria-live="polite">{formatElapsedTime(elapsedMs)}</strong>
                <Button onClick={onFinish} disabled={status !== 'measuring'}>
                  計測を終了
                </Button>
              </div>
            </div>
          </section>
        </div>

        <section
          className="measurement-panel measurement-panel--score"
          aria-labelledby="score-panel-title"
        >
          <header className="measurement-panel__header">
            <div>
              <span className="measurement-panel__accent" aria-hidden="true" />
              <div>
                <p>SCORE</p>
                <h2 id="score-panel-title">集中スコア</h2>
              </div>
            </div>
            <span className="measurement-panel__badge">LIVE</span>
          </header>

          <div className="score-panel__body">
            <div className="score-panel__current" aria-live="polite">
              <span>現在のスコア</span>
              <strong>{scoreLabel}</strong>
              <small>/ 100</small>
            </div>

            <div className="score-panel__target">
              <div>
                <span>目標スコア</span>
                <strong>80</strong>
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
