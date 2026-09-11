import { isAnalyzableSegment, type FrameEvaluation } from './intervalScoring.ts'

// 15秒区間が2回連続で解析不能なら、約30秒解析できなかったものとして停止条件を成立させる。
export const CONSECUTIVE_UNAVAILABLE_LIMIT = 2

export type AnalysisAvailabilityState = {
  consecutiveUnavailableSegments: number
  // 停止要求と通知が重複しないよう、成立済みかどうかを保持する。
  hasRequestedStop: boolean
}

export const initialAnalysisAvailabilityState: AnalysisAvailabilityState = {
  consecutiveUnavailableSegments: 0,
  hasRequestedStop: false,
}

export type AnalysisAvailabilityEvaluation = {
  isAnalyzable: boolean
  shouldStop: boolean
  state: AnalysisAvailabilityState
}

// focus以外へ切り替わった際に呼ぶ。連続回数と停止済みフラグをまとめて初期化する。
export function resetAnalysisAvailabilityTracking(): AnalysisAvailabilityState {
  return initialAnalysisAvailabilityState
}

// 15秒区間が閉じるたびに呼ぶ純粋関数。既存のスコア計算には関与しない。
export function evaluateAnalysisAvailability(
  state: AnalysisAvailabilityState,
  samples: FrameEvaluation[],
): AnalysisAvailabilityEvaluation {
  // 解析可能な区間が入った時点で連続回数を戻し、離席判定へ渡せる状態にする。
  if (isAnalyzableSegment(samples)) {
    return {
      isAnalyzable: true,
      shouldStop: false,
      state: initialAnalysisAvailabilityState,
    }
  }

  const consecutiveUnavailableSegments = state.consecutiveUnavailableSegments + 1
  const shouldStop =
    !state.hasRequestedStop &&
    consecutiveUnavailableSegments >= CONSECUTIVE_UNAVAILABLE_LIMIT

  return {
    isAnalyzable: false,
    shouldStop,
    state: {
      consecutiveUnavailableSegments,
      hasRequestedStop: state.hasRequestedStop || shouldStop,
    },
  }
}
