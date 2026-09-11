import { describe, expect, it } from 'vitest'
import { getJourneyMotionState } from './getJourneyMotionState.ts'

describe('getJourneyMotionState', () => {
  it('準備中と開始前を優先して判定する', () => {
    expect(getJourneyMotionState({
      hasStarted: false,
      isPreparing: true,
      latestEarnedScore: null,
      timerMode: 'away',
    })).toBe('preparing')
    expect(getJourneyMotionState({
      hasStarted: false,
      isPreparing: false,
      latestEarnedScore: null,
      timerMode: 'away',
    })).toBe('idle')
  })

  it('休憩・離席・直近スコアを表示状態へ変換する', () => {
    expect(getJourneyMotionState({
      hasStarted: true,
      isPreparing: false,
      latestEarnedScore: 3,
      timerMode: 'away',
    })).toBe('idle')
    expect(getJourneyMotionState({
      hasStarted: true,
      isPreparing: false,
      latestEarnedScore: 3,
      timerMode: 'break',
    })).toBe('break')
    expect(getJourneyMotionState({
      hasStarted: true,
      isPreparing: false,
      latestEarnedScore: 3,
      timerMode: 'focus',
    })).toBe('score3')
  })
})
