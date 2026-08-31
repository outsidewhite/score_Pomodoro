export type ScoreWeights = {
  posture: number
  presence: number
  stability: number
}

export type ScoreConfig = {
  maxMovement: number
  maxTilt: number
  weights: ScoreWeights
}

export type ScoreResult = {
  measuredDurationMs: number
  postureScore: number
  presenceScore: number
  stabilityScore: number
  totalScore: number
}
