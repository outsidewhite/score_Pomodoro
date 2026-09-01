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
            <dt>在席</dt>
            <dd>{result.presencePoints}</dd>
          </div>
          <div>
            <dt>作業継続</dt>
            <dd>{result.continuityPoints}</dd>
          </div>
          <div>
            <dt>動作</dt>
            <dd>{result.movementPoints}</dd>
          </div>
          <div>
            <dt>体の向き</dt>
            <dd>{result.orientationPoints}</dd>
          </div>
        </dl>

        <Button onClick={onRestart}>もう一度計測する</Button>
      </section>
    </main>
  )
}
