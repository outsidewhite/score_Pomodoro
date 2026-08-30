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
  posture: number
  presence: number
  stability: number
}

export type PoseMetricOptions = {
  maxMovement: number
  maxTilt: number
}
