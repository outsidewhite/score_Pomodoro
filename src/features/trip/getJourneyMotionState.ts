import type { EarnedScore } from '../scoring/intervalScoring.ts'
import type { TimerMode } from '../../components/Timer/timerTypes.ts'

export type JourneyMotionState =
  | 'idle'
  | 'preparing'
  | 'score0'
  | 'score1'
  | 'score2'
  | 'score3'
  | 'break'

type JourneyMotionContext = {
  hasStarted: boolean
  isPreparing: boolean
  latestEarnedScore: EarnedScore | null
  timerMode: TimerMode
}

// 画面の複数状態を、旅アニメーションが扱う単一の動きへ変換する。
export function getJourneyMotionState({
  hasStarted,
  isPreparing,
  latestEarnedScore,
  timerMode,
}: JourneyMotionContext): JourneyMotionState {
  if (isPreparing) return 'preparing'
  if (!hasStarted) return 'idle'
  // 離席は独立した演出にせず、開始前と同じ停止状態として扱う。
  if (timerMode === 'away') return 'idle'
  if (timerMode === 'break') return 'break'
  if (latestEarnedScore === null) return 'preparing'
  return `score${latestEarnedScore}`
}
