import type { ScoreResult } from '../../features/scoring/scoreTypes.ts'

export type MeasurementStatus =
  | 'idle'
  | 'preparing'
  | 'measuring'
  | 'completed'
  | 'error'

export type MeasurementSession = {
  elapsedMs: number
  result: ScoreResult | null
  startedAt: number | null
  status: MeasurementStatus
}
