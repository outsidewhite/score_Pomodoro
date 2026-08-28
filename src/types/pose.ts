import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export type AnalysisResult = {
  detectedAt: number
  people: NormalizedLandmark[][]
}
