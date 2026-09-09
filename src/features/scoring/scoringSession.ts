import type {
  PostureBaseline,
  ScoreIntervalResult,
} from './intervalScoring.ts'
import type { ScoreResult } from './scoreTypes.ts'

const STORAGE_KEY = 'score-pomodoro:scoring-session'
const STORAGE_VERSION = 1

export type ScoringSession = {
  baseline: PostureBaseline | null
  intervals: ScoreIntervalResult[]
  nextIntervalNumber: number
  sessionId: string
  targetMinutes: number
  version: number
}

function createSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidBaseline(value: unknown): value is PostureBaseline {
  if (!value || typeof value !== 'object') return false
  const baseline = value as Partial<PostureBaseline>
  return (
    isFiniteNumber(baseline.centerX) &&
    isFiniteNumber(baseline.centerY) &&
    isFiniteNumber(baseline.shoulderAngle) &&
    isFiniteNumber(baseline.shoulderWidth) &&
    baseline.shoulderWidth > 0
  )
}

function isValidInterval(value: unknown): value is ScoreIntervalResult {
  if (!value || typeof value !== 'object') return false
  const interval = value as Partial<ScoreIntervalResult>
  return (
    typeof interval.id === 'string' &&
    typeof interval.isCalibration === 'boolean' &&
    typeof interval.calibrationSucceeded === 'boolean' &&
    (interval.postureScore === null || isFiniteNumber(interval.postureScore)) &&
    isFiniteNumber(interval.stabilityScore) &&
    isFiniteNumber(interval.detectionScore) &&
    isFiniteNumber(interval.totalScore) &&
    (interval.earnedScore === 0 ||
      interval.earnedScore === 1 ||
      interval.earnedScore === 2 ||
      interval.earnedScore === 3) &&
    isFiniteNumber(interval.startedAt) &&
    isFiniteNumber(interval.endedAt) &&
    Number.isInteger(interval.detectedCount) &&
    Number.isInteger(interval.absentCount) &&
    Number.isInteger(interval.missedCount) &&
    Number.isInteger(interval.failedCount)
  )
}

export function createScoringSession(targetMinutes = 25): ScoringSession {
  return {
    baseline: null,
    intervals: [],
    nextIntervalNumber: 1,
    sessionId: createSessionId(),
    targetMinutes,
    version: STORAGE_VERSION,
  }
}

function isValidSession(value: unknown): value is ScoringSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<ScoringSession>
  return (
    session.version === STORAGE_VERSION &&
    typeof session.sessionId === 'string' &&
    Number.isInteger(session.nextIntervalNumber) &&
    (session.nextIntervalNumber ?? 0) > 0 &&
    isFiniteNumber(session.targetMinutes) &&
    Array.isArray(session.intervals) &&
    session.intervals.every(isValidInterval) &&
    (session.baseline === null || isValidBaseline(session.baseline))
  )
}

export function loadScoringSession(): ScoringSession | null {
  try {
    const serialized = window.sessionStorage.getItem(STORAGE_KEY)
    if (!serialized) return null
    const parsed: unknown = JSON.parse(serialized)
    if (!isValidSession(parsed)) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    // 保存データの破損やブラウザの利用制限時は、新規セッションへ安全に戻す。
    return null
  }
}

export function saveScoringSession(session: ScoringSession) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // 保存不可でも計測そのものは継続できるよう、例外を画面へ伝播させない。
  }
}

export function clearScoringSession() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ストレージが利用できない環境では、メモリ上の初期化だけで継続する。
  }
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

export function summarizeScoringSession(session: ScoringSession): ScoreResult {
  const postureScores = session.intervals.flatMap(({ postureScore }) =>
    postureScore === null ? [] : [postureScore],
  )

  return {
    detectionScore: Math.round(
      average(session.intervals.map(({ detectionScore }) => detectionScore)),
    ),
    measuredDurationMs: session.intervals.length * 60_000,
    postureScore: Math.round(average(postureScores)),
    stabilityScore: Math.round(
      average(session.intervals.map(({ stabilityScore }) => stabilityScore)),
    ),
    totalScore: Math.round(
      average(session.intervals.map(({ totalScore }) => totalScore)),
    ),
  }
}

export function getTotalEarnedScore(session: ScoringSession) {
  return session.intervals.reduce(
    (total, interval) => total + interval.earnedScore,
    0,
  )
}

export function appendScoreInterval(
  session: ScoringSession,
  interval: ScoreIntervalResult,
): ScoringSession {
  if (session.intervals.some(({ id }) => id === interval.id)) return session
  return {
    ...session,
    intervals: [...session.intervals, interval],
    nextIntervalNumber: session.nextIntervalNumber + 1,
  }
}
