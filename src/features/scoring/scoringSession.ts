import type {
  PostureBaseline,
  ScoreIntervalResult,
} from './intervalScoring.ts'
import {
  getEarnedScore,
  SCORE_INTERVAL_MS,
  SAMPLES_PER_INTERVAL,
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

// 目標時間0分は「目標なし」のセッションとして有効に扱う。
function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

function isScore(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 100
}

function isValidInterval(value: unknown): value is ScoreIntervalResult {
  if (!value || typeof value !== 'object') return false
  const interval = value as Partial<ScoreIntervalResult>
  return (
    typeof interval.id === 'string' &&
    typeof interval.isCalibration === 'boolean' &&
    typeof interval.calibrationSucceeded === 'boolean' &&
    (interval.postureScore === null || isScore(interval.postureScore)) &&
    isScore(interval.stabilityScore) &&
    isScore(interval.detectionScore) &&
    isScore(interval.totalScore) &&
    (interval.earnedScore === 0 ||
      interval.earnedScore === 1 ||
      interval.earnedScore === 2 ||
      interval.earnedScore === 3) &&
    interval.earnedScore === getEarnedScore(interval.totalScore) &&
    isFiniteNumber(interval.startedAt) &&
    isFiniteNumber(interval.endedAt) &&
    interval.endedAt - interval.startedAt === SCORE_INTERVAL_MS &&
    Number.isInteger(interval.detectedCount) &&
    (interval.detectedCount ?? -1) >= 0 &&
    Number.isInteger(interval.absentCount) &&
    (interval.absentCount ?? -1) >= 0 &&
    Number.isInteger(interval.missedCount) &&
    (interval.missedCount ?? -1) >= 0 &&
    Number.isInteger(interval.failedCount) &&
    (interval.failedCount ?? -1) >= 0 &&
    (interval.detectedCount ?? 0) +
      (interval.absentCount ?? 0) +
      (interval.missedCount ?? 0) +
      (interval.failedCount ?? 0) ===
      SAMPLES_PER_INTERVAL &&
    (interval.isCalibration
      ? interval.postureScore === null
      : interval.postureScore !== null) &&
    (!interval.calibrationSucceeded || interval.isCalibration)
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

function getIntervalNumber(sessionId: string, intervalId: string) {
  const prefix = `${sessionId}:interval:`
  if (!intervalId.startsWith(prefix)) return null

  const intervalNumber = Number(intervalId.slice(prefix.length))
  return Number.isInteger(intervalNumber) && intervalNumber > 0
    ? intervalNumber
    : null
}

function normalizeSession(value: unknown): ScoringSession | null {
  if (!value || typeof value !== 'object') return null
  const session = value as Partial<ScoringSession>
  if (
    session.version !== STORAGE_VERSION ||
    typeof session.sessionId !== 'string' ||
    session.sessionId.length === 0 ||
    !isNonNegativeInteger(session.targetMinutes) ||
    !Array.isArray(session.intervals) ||
    !session.intervals.every(isValidInterval)
  ) {
    return null
  }

  const intervalNumbers = session.intervals.map(({ id }) =>
    getIntervalNumber(session.sessionId!, id),
  )
  if (
    intervalNumbers.some((intervalNumber) => intervalNumber === null) ||
    new Set(intervalNumbers).size !== intervalNumbers.length
  ) {
    return null
  }

  const intervals = [...session.intervals].sort((left, right) =>
    left.startedAt - right.startedAt,
  )
  if (
    intervals.some((interval, index) =>
      index > 0 && interval.startedAt < intervals[index - 1]!.endedAt,
    )
  ) {
    return null
  }

  return {
    baseline: null,
    intervals,
    // 保存された番号は信用せず、確定済み区間の最大番号から再構築する。
    nextIntervalNumber: Math.max(0, ...(intervalNumbers as number[])) + 1,
    sessionId: session.sessionId,
    targetMinutes: session.targetMinutes,
    version: STORAGE_VERSION,
  }
}

export function loadScoringSession(): ScoringSession | null {
  try {
    const serialized = window.sessionStorage.getItem(STORAGE_KEY)
    if (!serialized) return null
    const parsed: unknown = JSON.parse(serialized)
    const normalized = normalizeSession(parsed)
    if (!normalized) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return normalized
  } catch {
    // 保存データの破損やブラウザの利用制限時は、新規セッションへ安全に戻す。
    return null
  }
}

export function saveScoringSession(session: ScoringSession) {
  try {
    // 基準姿勢はページ内だけで利用し、リロードをまたいで保持しない。
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, baseline: null }),
    )
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
  if (
    !isValidInterval(interval) ||
    session.intervals.some(
      (savedInterval) =>
        savedInterval.id === interval.id ||
        (interval.startedAt < savedInterval.endedAt &&
          interval.endedAt > savedInterval.startedAt),
    )
  ) {
    return session
  }
  const intervalNumber = getIntervalNumber(session.sessionId, interval.id)
  if (intervalNumber !== session.nextIntervalNumber) return session
  return {
    ...session,
    intervals: [...session.intervals, interval],
    nextIntervalNumber: Math.max(session.nextIntervalNumber, intervalNumber + 1),
  }
}
