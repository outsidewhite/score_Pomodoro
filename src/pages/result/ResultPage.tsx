import { AppHeader } from '../../components/ui/AppHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import type { ScoreResult } from '../../features/scoring/scoreTypes.ts'
import './ResultPage.css'

type ResultPageProps = {
  onRestart: () => void
  originalScore: number
  result: ScoreResult
}

export function ResultPage({ onRestart, originalScore, result }: ResultPageProps) {
  // バックエンドから返された今回分を、計測開始前のスコアへ加算する。
  const currentScore = originalScore + result.totalScore

  return (
    <main className="result-page">
      <AppHeader status="計測完了" statusTone="complete" />
      <div className="result-page__content">
        <section className="result-page__card" aria-labelledby="result-title">
          <p>MEASUREMENT RESULT</p>
          <h1 id="result-title">今回の加算スコア</h1>
          <strong className="result-page__total">+{result.totalScore}</strong>

          <div className="result-page__current-score">
            <span>現在のスコア</span>
            <strong>{currentScore.toLocaleString('ja-JP')}</strong>
            <small>
              {originalScore.toLocaleString('ja-JP')} ＋ {result.totalScore.toLocaleString('ja-JP')}
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
              <dd>{result.presenceScore}</dd>
            </div>
          </dl>

          <Button onClick={onRestart}>もう一度計測する</Button>
        </section>
      </div>
    </main>
  )
}
