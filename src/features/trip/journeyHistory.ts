import { getJourneyPoints, getJourneyPosition } from './getJourneyPosition.ts'
import type { Journey, RoutePoint } from './types.ts'

// 到着時のタイマー表示値を累積スコアで識別し、地図とリストで共有する。
export type JourneyArrivals = Readonly<Record<number, number>>
export type JourneyStop = {
  point: RoutePoint
  state: 'visited' | 'current' | 'next' | 'hidden'
  arrivalMs: number | null
  estimateMs: number | null
}

const STORAGE_KEY = 'score-pomodoro:journey-arrivals'
// 45点基準の履歴を新しい30点基準へ誤って対応付けないため、保存形式を更新する。
const STORAGE_VERSION = 2
const ESTIMATED_LEG_MS = 15 * 60_000

export function formatJourneyTime(elapsedMs: number) {
  const seconds = Math.floor(Math.max(0, elapsedMs) / 1000)
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((value) => String(value).padStart(2, '0')).join(':')
}

export function recordJourneyArrivals(
  arrivals: JourneyArrivals, journey: Journey, previousScore: number,
  score: number, elapsedMs: number,
): JourneyArrivals {
  const next = { ...arrivals }
  let changed = false
  // 初回到着だけを記録し、再通知やスコアの巻き戻りでも時刻を上書きしない。
  for (const point of getJourneyPoints(journey)) {
    if (point.requiredScore > previousScore && point.requiredScore <= score &&
      next[point.requiredScore] === undefined) {
      next[point.requiredScore] = Math.floor(Math.max(0, elapsedMs) / 1000) * 1000
      changed = true
    }
  }
  return changed ? next : arrivals
}

export function getJourneyStops(journey: Journey, score: number, arrivals: JourneyArrivals): JourneyStop[] {
  const points = getJourneyPoints(journey)
  const position = getJourneyPosition(score, journey)
  const currentIndex = points.indexOf(position.currentPoint)
  const lastArrival = arrivals[position.currentPoint.requiredScore] ??
    (currentIndex === 0 ? 0 : null)
  return points.map((point, index) => ({
    point,
    state: index < currentIndex ? 'visited' : index === currentIndex ? 'current' :
      point === position.destination ? 'next' : 'hidden',
    arrivalMs: arrivals[point.requiredScore] ?? null,
    // 将来の参考値は直前の到着から15分ずつ加算し、実測値として保存しない。
    estimateMs: index > currentIndex && lastArrival !== null
      ? lastArrival + (index - currentIndex) * ESTIMATED_LEG_MS : null,
  }))
}

export function loadJourneyArrivals(sessionId: string, journey: Journey): JourneyArrivals {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    if (value?.sessionId !== sessionId || value?.version !== STORAGE_VERSION ||
      value?.routeIds !== `${journey.japanRoute.id}/${journey.worldRoute.id}` ||
      !value.arrivals || typeof value.arrivals !== 'object') return {}
    const scores = new Set(getJourneyPoints(journey).map((point) => point.requiredScore))
    return Object.fromEntries(Object.entries(value.arrivals).filter(([score, time]) =>
      scores.has(Number(score)) && typeof time === 'number' && Number.isFinite(time) && time >= 0,
    )) as JourneyArrivals
  } catch {
    // 古いセッションや破損データから到着時刻を推測しない。
    return {}
  }
}

export function saveJourneyArrivals(sessionId: string, journey: Journey, arrivals: JourneyArrivals) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION, sessionId,
      routeIds: `${journey.japanRoute.id}/${journey.worldRoute.id}`, arrivals,
    }))
  } catch {
    // 保存が制限されている環境でも、メモリ上の履歴で計測を続ける。
  }
}

export const JOURNEY_STATE_LABELS = {
  visited: '到達済み', current: '現在地', next: '次の目的地', hidden: '未到達',
} as const
