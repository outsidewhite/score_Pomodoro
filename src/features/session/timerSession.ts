import type { TimerLogEntry } from '../../components/Timer/timerTypes.ts'

const STORAGE_KEY = 'score-pomodoro:timer-session'
const STORAGE_VERSION = 1

export type TimerSession = {
  lastObservedAt: number
  logs: TimerLogEntry[]
  sessionId: string
  version: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidLog(value: unknown): value is TimerLogEntry {
  if (!value || typeof value !== 'object') return false
  const log = value as Partial<TimerLogEntry>
  return (
    Number.isInteger(log.id) &&
    (log.id ?? 0) > 0 &&
    (log.mode === 'away' || log.mode === 'break' || log.mode === 'focus') &&
    isFiniteNumber(log.startedAt) &&
    (log.endedAt === null ||
      (isFiniteNumber(log.endedAt) && log.endedAt >= (log.startedAt ?? 0)))
  )
}

function isValidTimerSession(value: unknown): value is TimerSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<TimerSession>
  return (
    session.version === STORAGE_VERSION &&
    typeof session.sessionId === 'string' &&
    isFiniteNumber(session.lastObservedAt) &&
    Array.isArray(session.logs) &&
    session.logs.every(isValidLog)
  )
}

export function createTimerSession(
  sessionId: string,
  lastObservedAt = Date.now(),
): TimerSession {
  return {
    lastObservedAt,
    logs: [],
    sessionId,
    version: STORAGE_VERSION,
  }
}

function resumeAsAway(session: TimerSession, resumedAt: number): TimerSession {
  const logs = session.logs.map((log) => ({ ...log }))
  const lastLog = logs.at(-1)
  if (!lastLog) return { ...session, lastObservedAt: resumedAt, logs }

  const interruptionAt = Math.max(
    lastLog.startedAt,
    Math.min(session.lastObservedAt, resumedAt),
  )

  if (lastLog.endedAt === null && lastLog.mode !== 'away') {
    // リロード直前までの動作時間だけを確定し、画面外の時間は離席として扱う。
    lastLog.endedAt = interruptionAt
  }

  if (lastLog.endedAt !== null) {
    const nextId = Math.max(...logs.map(({ id }) => id)) + 1
    logs.push({
      endedAt: null,
      id: nextId,
      mode: 'away',
      startedAt: Math.max(lastLog.endedAt, interruptionAt),
    })
  }

  return { ...session, lastObservedAt: resumedAt, logs }
}

export function loadTimerSession(
  sessionId: string,
  resumedAt = Date.now(),
): TimerSession {
  try {
    const serialized = window.sessionStorage.getItem(STORAGE_KEY)
    if (!serialized) return createTimerSession(sessionId, resumedAt)

    const parsed: unknown = JSON.parse(serialized)
    if (!isValidTimerSession(parsed) || parsed.sessionId !== sessionId) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return createTimerSession(sessionId, resumedAt)
    }
    return resumeAsAway(parsed, resumedAt)
  } catch {
    // 保存データの破損やストレージ制限時は、ログだけを安全に初期化する。
    return createTimerSession(sessionId, resumedAt)
  }
}

export function saveTimerSession(session: TimerSession) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // ログを保存できない環境でも、タイマーと採点処理は継続する。
  }
}

export function clearTimerSession() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ストレージが利用できない場合は、画面上の初期化だけで継続する。
  }
}

export function getMeasuredWorkDuration(
  logs: TimerLogEntry[],
  observedAt: number,
) {
  return logs.reduce((total, log) => {
    if (log.mode === 'away') return total
    const endedAt = log.endedAt ?? observedAt
    return total + Math.max(0, endedAt - log.startedAt)
  }, 0)
}
