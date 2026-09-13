import { describe, expect, it } from 'vitest'
import { getJourneyMotionState } from './getJourneyMotionState.ts'

describe('getJourneyMotionState', () => {
  // 未採点でも開始直後は1点の移動演出を使い、0点とは区別する。
  it.each([[null, 'score1'], [0, 'score0']] as const)('集中中の%s点は%sになる', (latestEarnedScore, expected) => {
    expect(getJourneyMotionState({ hasStarted: true, latestEarnedScore, timerMode: 'focus' })).toBe(expected)
  })
  it('初回開始前だけ準備にし、開始後の停止は停止として判定する', () => {
    expect(getJourneyMotionState({
      hasStarted: false,
      latestEarnedScore: null,
      timerMode: 'away',
    })).toBe('preparing')
    expect(getJourneyMotionState({
      hasStarted: true,
      latestEarnedScore: null,
      timerMode: 'away',
    })).toBe('idle')
  })

  it('休憩・離席・直近スコアを表示状態へ変換する', () => {
    expect(getJourneyMotionState({
      hasStarted: true,
      latestEarnedScore: 3,
      timerMode: 'away',
    })).toBe('idle')
    expect(getJourneyMotionState({
      hasStarted: true,
      latestEarnedScore: 3,
      timerMode: 'break',
    })).toBe('break')
    expect(getJourneyMotionState({
      hasStarted: true,
      latestEarnedScore: 3,
      timerMode: 'focus',
    })).toBe('score3')
  })
})
