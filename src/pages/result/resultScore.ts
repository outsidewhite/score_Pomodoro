export type ScoreRank = 'A' | 'B' | 'C' | 'S'

// スコアとランクの境界を一か所にまとめ、表示色と判定がずれないようにする。
export function getScoreRank(score: number): ScoreRank {
  if (score >= 90) return 'S'
  if (score >= 70) return 'A'
  if (score >= 50) return 'B'
  return 'C'
}
