import { ScoreJourney } from '../Animation/ScoreJourney.tsx'
import { JourneyReview } from '../Animation/JourneyReview.tsx'
import type { JourneyArrivals } from '../../features/trip/journeyHistory.ts'
import type { Journey } from '../../features/trip/types.ts'
import type { JourneyMotionState } from '../../features/trip/getJourneyMotionState.ts'
import './ScorePanel.css'

type ScorePanelProps = {
  arrivals: JourneyArrivals
  isFocused: boolean
  analysisError?: string | null
  analysisStatus?: 'error' | 'loading' | 'paused' | 'ready'
  journey: Journey
  motionState: JourneyMotionState
  onDebugEarnedScoreChange?: (score: number | null) => void
  originalScore: number
  scoreIncrement: number | null
}

function formatScore(score: number) {
  return score.toLocaleString('ja-JP')
}

export function ScorePanel({
  arrivals,
  isFocused,
  journey,
  motionState,
  onDebugEarnedScoreChange,
  originalScore,
  scoreIncrement,
}: ScorePanelProps) {
  // 総合スコアは、計測開始前の値へ今回の加算分を足して表示する。
  const totalScore = originalScore + (scoreIncrement ?? 0)

  return (
    <section className="score-panel" aria-label="集中スコア">
      <div className="score-panel__body">
        {/* 旅の表示と総合スコアが常に同期するよう、同じ計算値を子コンポーネントへ渡す。 */}
        <JourneyReview arrivals={arrivals} isFocused={isFocused} journey={journey} score={totalScore}>
          <ScoreJourney
            journey={journey}
            motionState={motionState}
            earnedScore={scoreIncrement ?? 0}
            onDebugEarnedScoreChange={onDebugEarnedScoreChange}
            score={totalScore}
          />
        </JourneyReview>

        <div className="score-panel__total" aria-live="polite">
          <span>累積獲得スコア</span>
          <strong>{formatScore(totalScore)}</strong>
        </div>
      </div>
    </section>
  )
}
