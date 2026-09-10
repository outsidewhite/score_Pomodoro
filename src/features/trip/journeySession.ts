import { japanRoutes, spaceRoute, worldRoutes } from './routes.ts'
import type { Journey } from './types.ts'

const STORAGE_KEY = 'score-pomodoro:journey-session'
const STORAGE_VERSION = 1

type StoredJourney = {
  japanRouteId: string
  sessionId: string
  version: number
  worldRouteId: string
}

export function loadJourneySession(sessionId: string): Journey | null {
  try {
    const serialized = window.sessionStorage.getItem(STORAGE_KEY)
    if (!serialized) return null

    const value: unknown = JSON.parse(serialized)
    if (!value || typeof value !== 'object') return null

    const stored = value as Partial<StoredJourney>
    if (
      stored.version !== STORAGE_VERSION ||
      stored.sessionId !== sessionId ||
      typeof stored.japanRouteId !== 'string' ||
      typeof stored.worldRouteId !== 'string'
    ) {
      return null
    }

    const japanRoute = japanRoutes.find(({ id }) => id === stored.japanRouteId)
    const worldRoute = worldRoutes.find(({ id }) => id === stored.worldRouteId)
    if (!japanRoute || !worldRoute) return null

    return { japanRoute, spaceRoute, worldRoute }
  } catch {
    // 保存データの破損やブラウザの利用制限時は、新しい旅を選べるようにする。
    return null
  }
}

export function saveJourneySession(sessionId: string, journey: Journey) {
  try {
    const stored: StoredJourney = {
      japanRouteId: journey.japanRoute.id,
      sessionId,
      version: STORAGE_VERSION,
      worldRouteId: journey.worldRoute.id,
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // 旅を保存できない環境でも、計測自体は継続できるようにする。
  }
}

export function clearJourneySession() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ストレージが利用できない環境では、メモリ上の再生成だけで継続する。
  }
}
