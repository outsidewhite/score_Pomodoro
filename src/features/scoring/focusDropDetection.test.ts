import { describe, expect, test } from 'vitest'
import type { ScoreIntervalResult } from './intervalScoring.ts'
import {
  evaluateFocusDrop,
  FOCUS_DROP_COOLDOWN_MS,
  FOCUS_DROP_GATE_MS,
  initialFocusDropDetectionState,
  resetFocusDropTracking,
} from './focusDropDetection.ts'

function createInterval(
  startedAt: number,
  totalScore: number,
): ScoreIntervalResult {
  return {
    absentCount: 0,
    calibrationSucceeded: false,
    detectedCount: 120,
    detectionScore: 100,
    earnedScore: 3,
    endedAt: startedAt + 60_000,
    failedCount: 0,
    id: `interval:${startedAt}`,
    isCalibration: false,
    missedCount: 0,
    postureScore: 80,
    stabilityScore: 90,
    startedAt,
    totalScore,
  }
}

describe('evaluateFocusDrop', () => {
  test('集中開始から10分未満はスコアが低くても通知しない', () => {
    const interval = createInterval(FOCUS_DROP_GATE_MS - 60_000, 10)
    const evaluation = evaluateFocusDrop(initialFocusDropDetectionState, interval)

    expect(evaluation.shouldNotify).toBe(false)
  })

  test('ちょうど10分経過した区間はfloor条件で判定される', () => {
    const interval = createInterval(0, 30)
    const state = {
      ...initialFocusDropDetectionState,
      focusStartedAt: 0,
    }
    const evaluation = evaluateFocusDrop(state, {
      ...interval,
      endedAt: FOCUS_DROP_GATE_MS,
    })

    expect(evaluation.shouldNotify).toBe(true)
  })

  test('10分経過後、低下なし・floor超えでは通知しない', () => {
    const state = {
      focusStartedAt: 0,
      lastNotifiedAt: null,
      previousInterval: createInterval(FOCUS_DROP_GATE_MS - 60_000, 60),
    }
    const interval = createInterval(FOCUS_DROP_GATE_MS, 55)

    const evaluation = evaluateFocusDrop(state, interval)

    expect(evaluation.shouldNotify).toBe(false)
  })

  test('前回比19点低下(閾値未満)では通知しない', () => {
    const state = {
      focusStartedAt: 0,
      lastNotifiedAt: null,
      previousInterval: createInterval(FOCUS_DROP_GATE_MS - 60_000, 60),
    }
    const interval = createInterval(FOCUS_DROP_GATE_MS, 41)

    const evaluation = evaluateFocusDrop(state, interval)

    expect(evaluation.shouldNotify).toBe(false)
  })

  test('前回比20点低下(境界値)で通知する', () => {
    const state = {
      focusStartedAt: 0,
      lastNotifiedAt: null,
      previousInterval: createInterval(FOCUS_DROP_GATE_MS - 60_000, 60),
    }
    const interval = createInterval(FOCUS_DROP_GATE_MS, 40)

    const evaluation = evaluateFocusDrop(state, interval)

    expect(evaluation.shouldNotify).toBe(true)
  })

  test('前回区間がない場合はfloor条件のみで判定する', () => {
    const state = {
      focusStartedAt: 0,
      lastNotifiedAt: null,
      previousInterval: null,
    }
    const interval = createInterval(FOCUS_DROP_GATE_MS, 30)

    const evaluation = evaluateFocusDrop(state, interval)

    expect(evaluation.shouldNotify).toBe(true)
  })

  test('通知直後の次区間は条件を満たしてもクールダウン中は通知しない', () => {
    const state = {
      focusStartedAt: 0,
      lastNotifiedAt: FOCUS_DROP_GATE_MS,
      previousInterval: createInterval(FOCUS_DROP_GATE_MS, 20),
    }
    const interval = createInterval(FOCUS_DROP_GATE_MS + 60_000, 15)

    const evaluation = evaluateFocusDrop(state, interval)

    expect(evaluation.shouldNotify).toBe(false)
  })

  test('通知から5分経過後、再度条件を満たせば通知する', () => {
    const state = {
      focusStartedAt: 0,
      lastNotifiedAt: FOCUS_DROP_GATE_MS,
      previousInterval: createInterval(FOCUS_DROP_GATE_MS, 20),
    }
    const interval = createInterval(
      FOCUS_DROP_GATE_MS + FOCUS_DROP_COOLDOWN_MS,
      15,
    )

    const evaluation = evaluateFocusDrop(state, interval)

    expect(evaluation.shouldNotify).toBe(true)
  })

  test('通知しなかった場合はlastNotifiedAtを更新しない', () => {
    const state = {
      focusStartedAt: 0,
      lastNotifiedAt: null,
      previousInterval: createInterval(FOCUS_DROP_GATE_MS - 60_000, 90),
    }
    const interval = createInterval(FOCUS_DROP_GATE_MS, 85)

    const evaluation = evaluateFocusDrop(state, interval)

    expect(evaluation.state.lastNotifiedAt).toBeNull()
  })

  test('resetFocusDropTrackingは初期状態を返す', () => {
    expect(resetFocusDropTracking()).toEqual(initialFocusDropDetectionState)
  })

  test('リセット後は新しい区間のstartedAtから10分ゲートが再スタートする', () => {
    const resetState = resetFocusDropTracking()
    const restartedAt = 10 * 60_000
    const interval = createInterval(restartedAt, 10)

    const evaluation = evaluateFocusDrop(resetState, interval)

    expect(evaluation.shouldNotify).toBe(false)
    expect(evaluation.state.focusStartedAt).toBe(restartedAt)
    expect(evaluation.state.previousInterval).toEqual(interval)
  })

  test('低下条件とfloor条件を同時に満たしても通知は1回だけ判定される', () => {
    const state = {
      focusStartedAt: 0,
      lastNotifiedAt: null,
      previousInterval: createInterval(FOCUS_DROP_GATE_MS - 60_000, 60),
    }
    const interval = createInterval(FOCUS_DROP_GATE_MS, 20)

    const evaluation = evaluateFocusDrop(state, interval)

    expect(evaluation.shouldNotify).toBe(true)
    expect(evaluation.state.lastNotifiedAt).toBe(interval.endedAt)
  })
})
