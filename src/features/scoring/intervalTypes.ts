import type { PoseFrame } from '../pose/poseTypes.ts'
import type { ScoreResult } from './scoreTypes.ts'

export type IntervalState = 'idle' | 'recording' | 'completed' | 'discarded'

export interface Interval {
  id: string
  startTimeMs: number
  endTimeMs: number | null
  frames: PoseFrame[]
  score: ScoreResult | null
  state: IntervalState
}

export interface IntervalManagerConfig {
  intervalDurationMs: number
}

export interface IntervalManagerEvents {
  onIntervalCompleted: (interval: Interval) => void
  onIntervalDiscarded: (interval: Interval) => void
}
