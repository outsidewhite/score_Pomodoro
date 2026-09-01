export type ScoreWeights = {
  presence: number
  continuity: number
  movement: number
  orientation: number
}

export type ScoreConfig = {
  absenceGraceSamples: number
  fullScoreThreshold: number
  fullScoreOrientationAngleDegrees: number
  maxOrientationAngleDegrees: number
  maxConsecutiveAbsenceSamples: number
  maxMovement: number
  minLandmarkVisibility: number
  movementGrace: number
  weights: ScoreWeights
}

export type ScoreResult = {
  continuityPoints: number
  measuredDurationMs: number
  movementPoints: number
  orientationPoints: number
  presencePoints: number
  rawScore: number
  sampleCount: number
  totalScore: number
}
