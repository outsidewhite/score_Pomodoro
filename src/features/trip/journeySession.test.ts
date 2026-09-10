import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createJourney } from './createJourney.ts'
import {
  clearJourneySession,
  loadJourneySession,
  saveJourneySession,
} from './journeySession.ts'

beforeEach(() => {
  window.sessionStorage.clear()
})

describe('journeySession', () => {
  it('セッションIDに紐づく国内ルートと世界ルートを復元する', () => {
    const journey = createJourney(() => 0)

    saveJourneySession('session-1', journey)

    expect(loadJourneySession('session-1')).toEqual(journey)
    expect(loadJourneySession('another-session')).toBeNull()
  })

  it('存在しないルートや破損した保存データは利用しない', () => {
    window.sessionStorage.setItem(
      'score-pomodoro:journey-session',
      JSON.stringify({
        japanRouteId: 'unknown',
        sessionId: 'session-1',
        version: 1,
        worldRouteId: 'world-standard',
      }),
    )
    expect(loadJourneySession('session-1')).toBeNull()

    window.sessionStorage.setItem('score-pomodoro:journey-session', '{broken')
    expect(loadJourneySession('session-1')).toBeNull()
  })

  it('保存を明示的に削除できる', () => {
    saveJourneySession('session-1', createJourney(() => 0))
    clearJourneySession()

    expect(loadJourneySession('session-1')).toBeNull()
  })

  it('sessionStorageを利用できなくても例外を発生させない', () => {
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

    expect(loadJourneySession('session-1')).toBeNull()
    expect(() =>
      saveJourneySession('session-1', createJourney(() => 0)),
    ).not.toThrow()
    getItem.mockRestore()
    setItem.mockRestore()
  })
})
