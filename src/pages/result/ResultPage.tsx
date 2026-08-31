import { Button } from '../../components/ui/Button.tsx'
import type { ScoreResult } from '../../features/scoring/scoreTypes.ts'
import './ResultPage.css'

type ResultPageProps = {
  onRestart: () => void
  result: ScoreResult
}

export function ResultPage({ onRestart, result }: ResultPageProps) {
  return (
    <main className="result-page">
      <section className="result-page__card" aria-labelledby="result-title">
        <p>MEASUREMENT RESULT</p>
        <h1 id="result-title">今回の集中スコア</h1>
        <strong className="result-page__total">{result.totalScore}</strong>

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
    </main>
  )
}
