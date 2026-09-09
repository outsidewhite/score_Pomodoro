import type { ScoreIntervalResult } from './intervalScoring.ts'

export const FOCUS_DROP_GATE_MS = 10 * 60_000
export const FOCUS_DROP_SCORE_DECREASE_THRESHOLD = 20
export const FOCUS_DROP_SCORE_FLOOR = 30
export const FOCUS_DROP_COOLDOWN_MS = 5 * 60_000

export type FocusDropDetectionState = {
  focusStartedAt: number | null
  lastNotifiedAt: number | null
  previousInterval: ScoreIntervalResult | null
}

export const initialFocusDropDetectionState: FocusDropDetectionState = {
  focusStartedAt: null,
  lastNotifiedAt: null,
  previousInterval: null,
}

export type FocusDropEvaluation = {
  shouldNotify: boolean
  state: FocusDropDetectionState
}

// away/breakへ切り替わった際に呼ぶ。経過時間・クールダウン・比較基準をすべてリセットする。
export function resetFocusDropTracking(): FocusDropDetectionState {
  return initialFocusDropDetectionState
}

// 1分区間が確定するたびに呼ぶ純粋関数。既存のスコア計算ロジックは参照するだけで変更しない。
export function evaluateFocusDrop(
  state: FocusDropDetectionState,
  currentInterval: ScoreIntervalResult,
): FocusDropEvaluation {
  const focusStartedAt = state.focusStartedAt ?? currentInterval.startedAt
  const elapsedMs = currentInterval.endedAt - focusStartedAt

  if (elapsedMs < FOCUS_DROP_GATE_MS) {
    return {
      shouldNotify: false,
      state: { ...state, focusStartedAt, previousInterval: currentInterval },
    }
  }

  const isCooldownActive =
    state.lastNotifiedAt !== null &&
    currentInterval.endedAt - state.lastNotifiedAt < FOCUS_DROP_COOLDOWN_MS

  const droppedFromPrevious =
    state.previousInterval !== null &&
    state.previousInterval.totalScore - currentInterval.totalScore >=
      FOCUS_DROP_SCORE_DECREASE_THRESHOLD
  const isBelowFloor = currentInterval.totalScore <= FOCUS_DROP_SCORE_FLOOR
  const conditionMet = droppedFromPrevious || isBelowFloor

  const shouldNotify = conditionMet && !isCooldownActive

  return {
    shouldNotify,
    state: {
      focusStartedAt,
      lastNotifiedAt: shouldNotify ? currentInterval.endedAt : state.lastNotifiedAt,
      previousInterval: currentInterval,
    },
  }
}
