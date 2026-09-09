import { beforeEach, describe, expect, test, vi } from 'vitest'
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

  test('休憩ログを確定してリロード後の時間を離席として扱う', () => {
    const session = createTimerSession('session-1', 8_000)
    session.logs = [
      { endedAt: null, id: 1, mode: 'break', startedAt: 2_000 },
    ]
    saveTimerSession(session)

    const restored = loadTimerSession('session-1', 12_000)

    expect(restored.logs).toEqual([
      { endedAt: 8_000, id: 1, mode: 'break', startedAt: 2_000 },
      { endedAt: null, id: 2, mode: 'away', startedAt: 8_000 },
    ])
    expect(getMeasuredWorkDuration(restored.logs, 12_000)).toBe(6_000)
  })

  test('離席への復元を即時保存し、連続リロードでもログを増やさない', () => {
    const session = createTimerSession('session-1', 5_000)
    session.logs = [
      { endedAt: null, id: 1, mode: 'focus', startedAt: 1_000 },
    ]
    saveTimerSession(session)

    loadTimerSession('session-1', 10_000)
    const restoredAgain = loadTimerSession('session-1', 15_000)

    expect(restoredAgain.logs).toHaveLength(2)
    expect(restoredAgain.logs.at(-1)).toEqual({
      endedAt: null,
      id: 2,
      mode: 'away',
      startedAt: 5_000,
    })
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

  test('ログIDが重複したタイマーデータは安全に初期化する', () => {
    const session = createTimerSession('session-1', 5_000)
    session.logs = [
      { endedAt: 2_000, id: 1, mode: 'focus', startedAt: 1_000 },
      { endedAt: null, id: 1, mode: 'away', startedAt: 2_000 },
    ]
    saveTimerSession(session)

    expect(loadTimerSession('session-1', 10_000)).toEqual(
      createTimerSession('session-1', 10_000),
    )
  })

  test('開始・終了時刻が逆転したログは安全に初期化する', () => {
    const session = createTimerSession('session-1', 5_000)
    session.logs = [
      { endedAt: 1_000, id: 1, mode: 'focus', startedAt: 2_000 },
    ]
    saveTimerSession(session)

    expect(loadTimerSession('session-1', 10_000).logs).toEqual([])
  })

  test('sessionStorageを利用できなくても安全な初期状態を返す', () => {
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

    expect(loadTimerSession('session-1', 10_000)).toEqual(
      createTimerSession('session-1', 10_000),
    )
    getItem.mockRestore()
    setItem.mockRestore()
  })
})
