export type ScoreWeights = {
  posture: number
  presence: number
  stability: number
}

export type ScoreConfig = {
  goodScoreThreshold: number
  maxMovement: number
  maxTilt: number
  weights: ScoreWeights
}

export type ScoreResult = {
  earnedScore: number
  focusScore: number
  measuredDurationMs: number
  postureScore: number
  presenceScore: number
  stabilityScore: number
}
