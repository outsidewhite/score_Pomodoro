import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createJourney } from './createJourney.ts'
import { formatJourneyTime, getJourneyStops, loadJourneyArrivals, recordJourneyArrivals, saveJourneyArrivals } from './journeyHistory.ts'

const journey = createJourney(() => 0)
beforeEach(() => { sessionStorage.clear(); vi.restoreAllMocks() })

describe('旅の到着履歴', () => {
  it('到着境界を跨いだ時刻を秒単位で保存し、再到着で上書きしない', () => {
    const before = recordJourneyArrivals({}, journey, 0, 29, 800_000)
    expect(before).toEqual({})
    const arrived = recordJourneyArrivals(before, journey, 29, 31, 901_999)
    expect(arrived).toEqual({ 30: 901_000 })
    expect(recordJourneyArrivals(arrived, journey, 29, 31, 999_000)).toEqual(arrived)
    expect(formatJourneyTime(arrived[30]!)).toBe('00:15:01')
  })

  it('飛び越した複数の目的地にも同じ実測値を記録する', () => {
    expect(recordJourneyArrivals({}, journey, 29, 61, 2_000_000))
      .toEqual({ 30: 2_000_000, 60: 2_000_000 })
  })

  it('実際の到着が遅れても、その到着から15分刻みで参考値を計算する', () => {
    const stops = getJourneyStops(journey, 30, { 30: 1_200_000 })
    expect(stops[1]).toMatchObject({ state: 'current', arrivalMs: 1_200_000 })
    expect(stops[2]).toMatchObject({ state: 'next', estimateMs: 2_100_000 })
    expect(stops[3]).toMatchObject({ state: 'hidden', estimateMs: 3_000_000 })
    expect(getJourneyStops(journey, 30, {})[2]?.estimateMs).toBeNull()
  })

  it.each([210, 570, 690, 720])('%i点でもステージ境界と最終目的地は既存の旅に従う', (score) => {
    const stops = getJourneyStops(journey, score, {})
    expect(stops.filter((stop) => stop.state === 'current')).toHaveLength(1)
    expect(stops.filter((stop) => stop.state === 'next')).toHaveLength(score >= 690 ? 0 : 1)
    expect(stops.at(-1)?.point.name).toBe('月周回軌道')
  })

  it('同じセッションとルートだけを復元する', () => {
    saveJourneyArrivals('session-a', journey, { 30: 901_000 })
    expect(loadJourneyArrivals('session-a', journey)).toEqual({ 30: 901_000 })
    expect(loadJourneyArrivals('session-b', journey)).toEqual({})
    expect(loadJourneyArrivals('session-a', createJourney(() => 0.99))).toEqual({})
  })

  it('45点基準で保存した旧形式の到着履歴を復元しない', () => {
    // 旧形式のキーが30点基準の別目的地へ誤対応しないことを確認する。
    sessionStorage.setItem('score-pomodoro:journey-arrivals', JSON.stringify({
      version: 1,
      sessionId: 'session-a',
      routeIds: 'japan-west-east/world-standard',
      arrivals: { 45: 901_000 },
    }))
    expect(loadJourneyArrivals('session-a', journey)).toEqual({})
  })

  it('保存データの破損や保存制限で計測を妨げない', () => {
    // ブラウザの保存制限を再現し、例外が計測へ伝播しないことを確認する。
    sessionStorage.setItem('score-pomodoro:journey-arrivals', '{broken')
    expect(loadJourneyArrivals('session-a', journey)).toEqual({})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('制限') })
    expect(() => saveJourneyArrivals('session-a', journey, {})).not.toThrow()
  })
})
