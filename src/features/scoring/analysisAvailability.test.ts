import { describe, expect, test } from 'vitest'
import {
  CONSECUTIVE_UNAVAILABLE_LIMIT,
  evaluateAnalysisAvailability,
  initialAnalysisAvailabilityState,
  resetAnalysisAvailabilityTracking,
} from './analysisAvailability.ts'
import {
  isConclusiveAbsentSegment,
  SAMPLES_PER_DETECTION_SEGMENT,
  type FrameEvaluation,
} from './intervalScoring.ts'

// 15秒区間の30件を、指定した内訳のステータスで埋める。
function createSegment(
  counts: Partial<Record<FrameEvaluation['status'], number>>,
): FrameEvaluation[] {
  const statuses = (
    ['detected', 'absent', 'missed', 'failed'] as const
  ).flatMap((status) => Array.from({ length: counts[status] ?? 0 }, () => status))
  const padded = [
    ...statuses,
    ...Array.from(
      { length: Math.max(0, SAMPLES_PER_DETECTION_SEGMENT - statuses.length) },
      () => 'failed' as const,
    ),
  ]

  return padded.map((status, index) => ({
    scheduledAt: (index + 1) * 500,
    status,
  }))
}

const analyzableSegment = createSegment({ detected: 30 })
const unavailableSegment = createSegment({ failed: 30 })

// 解析不能区間をcount回続けて流し込み、最後の評価結果を返す。
function repeatUnavailable(count: number) {
  let evaluation = evaluateAnalysisAvailability(
    initialAnalysisAvailabilityState,
    unavailableSegment,
  )

  for (let index = 1; index < count; index += 1) {
    evaluation = evaluateAnalysisAvailability(
      evaluation.state,
      unavailableSegment,
    )
  }

  return evaluation
}

describe('evaluateAnalysisAvailabilityの解析可否判定', () => {
  test('解析可能件数が9件の区間は解析不能と判定する', () => {
    const evaluation = evaluateAnalysisAvailability(
      initialAnalysisAvailabilityState,
      createSegment({ detected: 9, failed: 21 }),
    )

    expect(evaluation.isAnalyzable).toBe(false)
    expect(evaluation.state.consecutiveUnavailableSegments).toBe(1)
  })

  test('解析可能件数が10件の区間は解析可能と判定する', () => {
    const evaluation = evaluateAnalysisAvailability(
      initialAnalysisAvailabilityState,
      createSegment({ detected: 10, failed: 20 }),
    )

    expect(evaluation.isAnalyzable).toBe(true)
    expect(evaluation.state.consecutiveUnavailableSegments).toBe(0)
  })

  test('absentが十分にある区間は解析不能にせず離席判定へ渡す', () => {
    const segment = createSegment({ absent: 30 })

    expect(
      evaluateAnalysisAvailability(initialAnalysisAvailabilityState, segment)
        .isAnalyzable,
    ).toBe(true)
    // 解析可能と判定した区間は、既存の離席判定がそのまま材料にできる。
    expect(isConclusiveAbsentSegment(segment)).toBe(true)
  })

  test('detectedとabsentの合計で解析可能件数を数える', () => {
    const evaluation = evaluateAnalysisAvailability(
      initialAnalysisAvailabilityState,
      createSegment({ absent: 5, detected: 5, missed: 20 }),
    )

    expect(evaluation.isAnalyzable).toBe(true)
  })

  test('failedやmissedが多い区間は離席判定に使用されない', () => {
    const segment = createSegment({ absent: 9, missed: 21 })

    expect(
      evaluateAnalysisAvailability(initialAnalysisAvailabilityState, segment)
        .isAnalyzable,
    ).toBe(false)
    expect(isConclusiveAbsentSegment(segment)).toBe(false)
  })
})

describe('evaluateAnalysisAvailabilityの停止判定', () => {
  test('解析不能が1区間だけの場合は停止しない', () => {
    const evaluation = repeatUnavailable(1)

    expect(evaluation.shouldStop).toBe(false)
    expect(evaluation.state.consecutiveUnavailableSegments).toBe(1)
  })

  test('解析不能が2区間連続した場合に停止条件が成立する', () => {
    const evaluation = repeatUnavailable(CONSECUTIVE_UNAVAILABLE_LIMIT)

    expect(evaluation.shouldStop).toBe(true)
    expect(evaluation.state.consecutiveUnavailableSegments).toBe(2)
  })

  test('解析不能の間に解析可能区間が入ると連続回数がリセットされる', () => {
    const first = evaluateAnalysisAvailability(
      initialAnalysisAvailabilityState,
      unavailableSegment,
    )
    const recovered = evaluateAnalysisAvailability(
      first.state,
      analyzableSegment,
    )
    const afterRecovery = evaluateAnalysisAvailability(
      recovered.state,
      unavailableSegment,
    )

    expect(recovered.state.consecutiveUnavailableSegments).toBe(0)
    expect(afterRecovery.shouldStop).toBe(false)
    expect(afterRecovery.state.consecutiveUnavailableSegments).toBe(1)
  })

  test('停止成立後は解析不能が続いても停止要求を繰り返さない', () => {
    const stopped = repeatUnavailable(CONSECUTIVE_UNAVAILABLE_LIMIT)

    const third = evaluateAnalysisAvailability(stopped.state, unavailableSegment)
    const fourth = evaluateAnalysisAvailability(third.state, unavailableSegment)

    expect(third.shouldStop).toBe(false)
    expect(fourth.shouldStop).toBe(false)
  })

  test('resetAnalysisAvailabilityTrackingは初期状態を返す', () => {
    expect(resetAnalysisAvailabilityTracking()).toEqual(
      initialAnalysisAvailabilityState,
    )
  })

  test('リセット後は再び2区間連続で停止条件が成立する', () => {
    const stopped = repeatUnavailable(CONSECUTIVE_UNAVAILABLE_LIMIT)
    let resetState = resetAnalysisAvailabilityTracking()
    expect(stopped.state.hasRequestedStop).toBe(true)

    const first = evaluateAnalysisAvailability(resetState, unavailableSegment)
    resetState = first.state
    const second = evaluateAnalysisAvailability(resetState, unavailableSegment)

    expect(first.shouldStop).toBe(false)
    expect(second.shouldStop).toBe(true)
  })
})
