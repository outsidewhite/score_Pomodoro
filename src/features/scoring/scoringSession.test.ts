import { beforeEach, describe, expect, test } from 'vitest'
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
  test('完了区間と基準姿勢をsessionStorageから復元する', () => {
    const session = createScoringSession(25)
    session.baseline = {
      centerX: 0.5,
      centerY: 0.5,
      shoulderAngle: 0,
      shoulderWidth: 0.2,
    }
    session.intervals = [createInterval('session:interval:1', 70, 3)]

    saveScoringSession(session)
    expect(loadScoringSession()).toEqual(session)
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
    const interval = createInterval('session:interval:1', 80, 3)

    const added = appendScoreInterval(session, interval)
    const duplicated = appendScoreInterval(added, interval)

    expect(duplicated.intervals).toHaveLength(1)
    expect(duplicated.nextIntervalNumber).toBe(2)
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
})
