import { ScoreJourney } from '../Animation/ScoreJourney.tsx'
import type { Journey } from '../../features/trip/types.ts'
import './ScorePanel.css'

type ScorePanelProps = {
  analysisError?: string | null
  analysisStatus?: 'error' | 'loading' | 'paused' | 'ready'
  journey: Journey
  originalScore: number
  scoreIncrement: number | null
}

function formatScore(score: number) {
  return score.toLocaleString('ja-JP')
}

export function ScorePanel({
  journey,
  originalScore,
  scoreIncrement,
}: ScorePanelProps) {
  // 総合スコアは、計測開始前の値へ今回の加算分を足して表示する。
  const totalScore = originalScore + (scoreIncrement ?? 0)

  return (
    <section className="score-panel" aria-label="集中スコア">
      <div className="score-panel__body">
        {/* 旅の表示と総合スコアが常に同期するよう、同じ計算値を子コンポーネントへ渡す。 */}
        <ScoreJourney journey={journey} score={totalScore} />

        <div className="score-panel__total" aria-live="polite">
          <span>累積獲得スコア</span>
          <strong>{formatScore(totalScore)}</strong>
        </div>
      </div>
    </section>
  )
}
