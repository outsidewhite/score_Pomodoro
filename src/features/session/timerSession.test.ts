import { beforeEach, describe, expect, test } from 'vitest'
import {
  clearTimerSession,
  createTimerSession,
  getMeasuredWorkDuration,
  loadTimerSession,
  saveTimerSession,
} from './timerSession.ts'

beforeEach(() => {
  window.sessionStorage.clear()
})

describe('timerSession', () => {
  test('リロード直前の集中ログを確定して離席へ切り替える', () => {
    const session = createTimerSession('session-1', 5_000)
    session.logs = [
      { endedAt: null, id: 1, mode: 'focus', startedAt: 1_000 },
    ]
    saveTimerSession(session)

    const restored = loadTimerSession('session-1', 10_000)

    expect(restored.logs).toEqual([
      { endedAt: 5_000, id: 1, mode: 'focus', startedAt: 1_000 },
      { endedAt: null, id: 2, mode: 'away', startedAt: 5_000 },
    ])
    expect(getMeasuredWorkDuration(restored.logs, 10_000)).toBe(4_000)
  })

  test('離席中の再読み込みでは同じ離席ログを継続する', () => {
    const session = createTimerSession('session-1', 5_000)
    session.logs = [
      { endedAt: null, id: 1, mode: 'away', startedAt: 1_000 },
    ]
    saveTimerSession(session)

    expect(loadTimerSession('session-1', 10_000).logs).toEqual(session.logs)
  })

  test('異なる採点セッションのログは引き継がない', () => {
    const session = createTimerSession('old-session', 5_000)
    session.logs = [
      { endedAt: null, id: 1, mode: 'focus', startedAt: 1_000 },
    ]
    saveTimerSession(session)

    expect(loadTimerSession('new-session', 10_000).logs).toEqual([])
  })

  test('削除後はログを復元しない', () => {
    saveTimerSession(createTimerSession('session-1'))
    clearTimerSession()

    expect(loadTimerSession('session-1').logs).toEqual([])
  })
})
