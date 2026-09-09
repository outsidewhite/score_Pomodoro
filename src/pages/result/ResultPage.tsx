import { AppHeader } from '../../components/ui/AppHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import type { ScoreResult } from '../../features/scoring/scoreTypes.ts'
import './ResultPage.css'

type ResultPageProps = {
  earnedScore: number
  onRestart: () => void
  originalScore: number
  result: ScoreResult
}

export function ResultPage({
  earnedScore,
  onRestart,
  originalScore,
  result,
}: ResultPageProps) {
  // 最終評価と旅に加算する獲得スコアは、用途が異なるため分けて表示する。
  const currentScore = originalScore + earnedScore

  return (
    <main className="result-page">
      <AppHeader status="計測完了" statusTone="complete" />
      <div className="result-page__content">
        <section className="result-page__card" aria-labelledby="result-title">
          <p>MEASUREMENT RESULT</p>
          <h1 id="result-title">最終総合評価</h1>
          <strong className="result-page__total">
            {result.measuredDurationMs > 0 ? result.totalScore : '評価なし'}
          </strong>

          <div className="result-page__current-score">
            <span>現在のスコア</span>
            <strong>{currentScore.toLocaleString('ja-JP')}</strong>
            <small>
              {originalScore.toLocaleString('ja-JP')} ＋ {earnedScore.toLocaleString('ja-JP')}
            </small>
          </div>

          <dl className="result-page__details">
            <div>
              <dt>姿勢</dt>
              <dd>{result.postureScore}</dd>
            </div>
            <div>
              <dt>安定性</dt>
              <dd>{result.stabilityScore}</dd>
            </div>
            <div>
              <dt>検出状態</dt>
              <dd>{result.detectionScore}</dd>
            </div>
          </dl>

          <Button onClick={onRestart}>もう一度計測する</Button>
        </section>
      </div>
    </main>
  )
}
