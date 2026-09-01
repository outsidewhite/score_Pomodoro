export type PoseLandmark = {
  visibility?: number
  x: number
  y: number
  z: number
}

export type PoseFrame = {
  landmarks: PoseLandmark[]
  timestampMs: number
}

export type PoseMetrics = {
  presenceRatio: number
  continuityRatio: number
  movementRatio: number
  orientationRatio: number
}

export type PoseMetricOptions = {
  absenceGraceSamples: number
  fullScoreOrientationAngleDegrees: number
  maxOrientationAngleDegrees: number
  maxConsecutiveAbsenceSamples: number
  maxMovement: number
  movementGrace: number
  minLandmarkVisibility: number
}
