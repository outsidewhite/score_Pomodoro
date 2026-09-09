export type ScoreWeights = {
  detection: number
  posture: number
  stability: number
}

export type ScoreConfig = {
  maxMovement: number
  maxTilt: number
  weights: ScoreWeights
}

export type ScoreResult = {
  detectionScore: number
  measuredDurationMs: number
  postureScore: number
  stabilityScore: number
  totalScore: number
}
