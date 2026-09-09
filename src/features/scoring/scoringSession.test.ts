import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { ScoreIntervalResult } from './intervalScoring.ts'
import {
  appendScoreInterval,
  clearScoringSession,
  createScoringSession,
  getTotalEarnedScore,
  loadScoringSession,
  saveScoringSession,
  summarizeScoringSession,
} from './scoringSession.ts'

function createInterval(
  id: string,
  totalScore: number,
  earnedScore: ScoreIntervalResult['earnedScore'],
): ScoreIntervalResult {
  return {
    absentCount: 0,
    calibrationSucceeded: false,
    detectedCount: 120,
    detectionScore: 100,
    earnedScore,
    endedAt: 60_000,
    failedCount: 0,
    id,
    isCalibration: false,
    missedCount: 0,
    postureScore: 80,
    stabilityScore: 90,
    startedAt: 0,
    totalScore,
  }
}

beforeEach(() => {
  window.sessionStorage.clear()
})

describe('scoringSession', () => {
  test('完了区間を復元し、基準姿勢は破棄する', () => {
    const session = createScoringSession(25)
    session.baseline = {
      centerX: 0.5,
      centerY: 0.5,
      shoulderAngle: 0,
      shoulderWidth: 0.2,
    }
    session.intervals = [
      createInterval(`${session.sessionId}:interval:1`, 70, 2),
    ]

    saveScoringSession(session)
    expect(loadScoringSession()).toEqual({
      ...session,
      baseline: null,
      nextIntervalNumber: 2,
    })
  })

  test('破損した保存データは利用しない', () => {
    window.sessionStorage.setItem('score-pomodoro:scoring-session', '{broken')
    expect(loadScoringSession()).toBeNull()
  })

  test('確定できなかった基準姿勢区間も最終評価と獲得点へ含める', () => {
    const session = createScoringSession()
    session.intervals = [
      { ...createInterval('1', 20, 1), isCalibration: true },
      createInterval('2', 80, 3),
    ]

    expect(summarizeScoringSession(session).totalScore).toBe(50)
    expect(getTotalEarnedScore(session)).toBe(4)
  })

  test('削除後はセッションを復元しない', () => {
    saveScoringSession(createScoringSession())
    clearScoringSession()
    expect(loadScoringSession()).toBeNull()
  })

  test('同じ区間idは二重に追加しない', () => {
    const session = createScoringSession()
    const interval = createInterval(`${session.sessionId}:interval:1`, 80, 2)

    const added = appendScoreInterval(session, interval)
    const duplicated = appendScoreInterval(added, interval)

    expect(duplicated.intervals).toHaveLength(1)
    expect(duplicated.nextIntervalNumber).toBe(2)
  })

  test('次の区間番号を保存済み区間の最大番号から補正する', () => {
    const session = createScoringSession()
    session.intervals = [
      createInterval(`${session.sessionId}:interval:3`, 80, 2),
    ]
    session.nextIntervalNumber = 1
    saveScoringSession(session)

    expect(loadScoringSession()?.nextIntervalNumber).toBe(4)
  })

  test('未完了区間や異なるセッションの区間は復元しない', () => {
    const session = createScoringSession()
    session.intervals = [
      {
        ...createInterval('other-session:interval:1', 80, 2),
        endedAt: 30_000,
      },
    ]
    window.sessionStorage.setItem(
      'score-pomodoro:scoring-session',
      JSON.stringify(session),
    )

    expect(loadScoringSession()).toBeNull()
  })

  test('区間IDが重複した保存データは復元しない', () => {
    const session = createScoringSession()
    const interval = createInterval(
      `${session.sessionId}:interval:1`,
      80,
      2,
    )
    session.intervals = [
      interval,
      { ...interval, startedAt: 60_000, endedAt: 120_000 },
    ]
    window.sessionStorage.setItem(
      'score-pomodoro:scoring-session',
      JSON.stringify(session),
    )

    expect(loadScoringSession()).toBeNull()
  })

  test('完了していない区間は追加しない', () => {
    const session = createScoringSession()
    const incompleteInterval = {
      ...createInterval(`${session.sessionId}:interval:1`, 80, 2),
      endedAt: 30_000,
    }

    expect(appendScoreInterval(session, incompleteInterval)).toBe(session)
  })

  test('数値項目が壊れた保存データは利用しない', () => {
    const session = createScoringSession()
    session.intervals = [createInterval('1', Number.NaN, 1)]
    window.sessionStorage.setItem(
      'score-pomodoro:scoring-session',
      JSON.stringify(session),
    )

    expect(loadScoringSession()).toBeNull()
  })

  test('sessionStorageを利用できなくても例外を発生させない', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      () => {
        throw new DOMException('blocked', 'SecurityError')
      },
    )
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      () => {
        throw new DOMException('blocked', 'SecurityError')
      },
    )

    expect(loadScoringSession()).toBeNull()
    expect(() => saveScoringSession(createScoringSession())).not.toThrow()
    getItem.mockRestore()
    setItem.mockRestore()
  })
})
