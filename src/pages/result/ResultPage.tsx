import { useId, useState } from 'react'
import { JourneyList } from '../../components/Animation/JourneyList.tsx'
import { JourneyMap } from '../../components/Animation/JourneyMap.tsx'
import { AppHeader } from '../../components/ui/AppHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import type { ScoreResult } from '../../features/scoring/scoreTypes.ts'
import {
  getMeasuredWorkDuration,
  loadTimerSession,
} from '../../features/session/timerSession.ts'
import { getJourneyPosition } from '../../features/trip/getJourneyPosition.ts'
import {
  getJourneyStops,
  loadJourneyArrivals,
} from '../../features/trip/journeyHistory.ts'
import type { Journey } from '../../features/trip/types.ts'
import './ResultPage.css'
import { getScoreRank } from './resultScore.ts'

type ResultPageProps = {
  earnedScore: number
  journey: Journey
  onRestart: () => void
  originalScore: number
  result: ScoreResult
  sessionId: string
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(Math.max(0, durationMs) / 1_000)
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor(totalSeconds / 60) % 60
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

export function ResultPage({
  earnedScore,
  journey,
  onRestart,
  originalScore,
  result,
  sessionId,
}: ResultPageProps) {
  // 計測画面と同じセッションの到着記録を使い、地図とリストへそのまま引き継ぐ。
  const [arrivals] = useState(() => loadJourneyArrivals(sessionId, journey))
  const [measuredDurationMs] = useState(() => {
    const timerSession = loadTimerSession(sessionId)
    const measuredDuration = getMeasuredWorkDuration(
      timerSession.logs,
      timerSession.lastObservedAt,
    )
    // タイマーログがない旧セッションでは、採点区間から求めた従来値を使用する。
    return measuredDuration > 0 ? measuredDuration : result.measuredDurationMs
  })
  const currentScore = originalScore + earnedScore
  const currentPlace = getJourneyPosition(currentScore, journey).currentPoint.name
  const stops = getJourneyStops(journey, currentScore, arrivals)
  const hasMapHistory = stops.some(({ point, state }) =>
    point.requiredScore > 0 && (state === 'visited' || state === 'current'),
  )
  const [historyView, setHistoryView] = useState<'list' | 'map'>(
    hasMapHistory ? 'map' : 'list',
  )
  const [isShared, setIsShared] = useState(false)
  const historyPanelId = useId()
  const overallRank = getScoreRank(result.totalScore)
  const metrics = [
    { label: '姿勢', score: result.postureScore },
    { label: '安定性', score: result.stabilityScore },
    { label: '検出状態', score: result.detectionScore },
  ]

  const handleShare = async () => {
    const shareText = `歩モロードで${currentScore.toLocaleString('ja-JP')}点を獲得し、${currentPlace}に到着しました！ 作業時間 ${formatDuration(measuredDurationMs)}`

    try {
      if (navigator.share) {
        await navigator.share({ title: '歩モロード 計測結果', text: shareText })
        setIsShared(true)
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText)
        setIsShared(true)
      }
    } catch (error) {
      // キャンセルや失敗時は反転させず、共有前のボタン表示を維持する。
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }

  return (
    <main className="result-page">
      <AppHeader status="計測完了" statusTone="complete" />

      <div className="result-page__layout">
        <section
          className="result-summary"
          aria-label="総合スコア"
        >
          <div className="result-summary__overview">
            <dl className="result-summary__facts">
              <div className="result-summary__fact--score">
                <dt>今回のスコア：</dt>
                <dd>{earnedScore.toLocaleString('ja-JP')}</dd>
              </div>
              <div>
                <dt>作業時間：</dt>
                <dd>{formatDuration(measuredDurationMs)}</dd>
              </div>
              <div>
                <dt>到着した場所：</dt>
                <dd>{currentPlace}</dd>
              </div>
              <div className="result-summary__fact--rank">
                <dt>総合ランク：</dt>
                <dd aria-label={`総合ランク ${overallRank}`}>{overallRank}</dd>
              </div>
            </dl>
          </div>

          <div className="result-summary__metrics" aria-label="平均スコア">
            <dl className="result-summary__metric-list">
              {metrics.map(({ label, score }) => {
                const rank = getScoreRank(score)
                return (
                  <div
                    key={label}
                    className={`result-metric result-score-tone--${rank.toLowerCase()}`}
                  >
                    <dt>{label}</dt>
                    <dd>
                      <strong>{score}</strong>
                      <span aria-label={`${label}ランク ${rank}`}>{rank}</span>
                    </dd>
                  </div>
                )
              })}
            </dl>
          </div>
        </section>

        <div className="result-page__right-column">
          <section className="result-history" aria-labelledby="history-title">
            <header className="result-history__header">
              <div>
                <p>JOURNEY LOG</p>
                <h2 id="history-title">これまでの道のり</h2>
              </div>

              <div className="result-history__switch" role="group" aria-label="道のりの表示切り替え">
                <button
                  type="button"
                  aria-controls={historyPanelId}
                  aria-pressed={historyView === 'map'}
                  onClick={() => setHistoryView('map')}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16" />
                  </svg>
                  地図
                </button>
                <button
                  type="button"
                  aria-controls={historyPanelId}
                  aria-pressed={historyView === 'list'}
                  onClick={() => setHistoryView('list')}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1" />
                  </svg>
                  リスト
                </button>
              </div>
            </header>

            <div id={historyPanelId} className="result-history__content" aria-live="polite">
              {historyView === 'map' ? (
                hasMapHistory ? (
                  <JourneyMap journey={journey} stops={stops} />
                ) : (
                  <p className="result-history__empty">最初の目的地に到着すると地図が表示されます。</p>
                )
              ) : (
                <JourneyList journey={journey} stops={stops} />
              )}
            </div>
          </section>

          <section className="result-actions" aria-label="結果の操作">
            <button
              type="button"
              className={`result-actions__share${isShared ? ' result-actions__share--complete' : ''}`}
              aria-label={isShared ? '共有済み' : '結果を共有'}
              aria-pressed={isShared}
              title="結果を共有"
              onClick={() => void handleShare()}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="18" cy="5" r="2.5" />
                <circle cx="6" cy="12" r="2.5" />
                <circle cx="18" cy="19" r="2.5" />
                <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
              </svg>
            </button>
            <Button className="result-actions__retry" onClick={onRestart}>
              リトライ
            </Button>
          </section>
        </div>
      </div>
    </main>
  )
}
