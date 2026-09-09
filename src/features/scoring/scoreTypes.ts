// セッション内の完了区間を集計し、結果画面へ渡す最終評価。
export type ScoreResult = {
  detectionScore: number
  measuredDurationMs: number
  postureScore: number
  stabilityScore: number
  totalScore: number
}
