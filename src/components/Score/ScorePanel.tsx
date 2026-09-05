import './ScorePanel.css'

type ScorePanelProps = {
  analysisError?: string | null
  analysisStatus?: 'loading' | 'ready' | 'error'
  originalScore: number
  scoreIncrement: number | null
}

function formatScore(score: number) {
  return score.toLocaleString('ja-JP')
}

export function ScorePanel({
  analysisError = null,
  analysisStatus = 'ready',
  originalScore,
  scoreIncrement,
}: ScorePanelProps) {
  // 総合スコアは、計測開始前の値へ今回の加算分を足して表示する。
  const totalScore = originalScore + (scoreIncrement ?? 0)

  return (
    <section className="score-panel" aria-label="集中スコア">
      <div className="score-panel__body">
        <div className="score-panel__display">
          <span aria-hidden="true">↗</span>
          <div>
            <strong>
              {analysisStatus === 'loading' ? '姿勢解析を準備中…' : '3分間の平均スコアを計測中'}
            </strong>
            <p>
              {analysisError ??
                '途中の評価は表示せず、3分ごとに確定したスコアを加算します。'}
            </p>
          </div>
        </div>

        <div className="score-panel__total" aria-live="polite">
          <span>総合スコア</span>
          <strong>{formatScore(totalScore)}</strong>
          <small>
            {formatScore(originalScore)} ＋ {formatScore(scoreIncrement ?? 0)} ＝{' '}
            {formatScore(totalScore)}
          </small>
        </div>
      </div>
    </section>
  )
}
