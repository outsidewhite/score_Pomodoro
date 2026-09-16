import { describe, expect, it } from 'vitest'
import { createJourney } from './createJourney.ts'
import { getJourneyPosition } from './getJourneyPosition.ts'

describe('createJourney', () => {
  it('与えられた乱数で国内と世界のルートを選ぶ', () => {
    const values = [0, 0.999]
    const journey = createJourney(() => values.shift() ?? 0)

    expect(journey.japanRoute.id).toBe('japan-west-east')
    expect(journey.worldRoute.id).toBe('world-europe')
    expect(journey.spaceRoute.id).toBe('space-main')
  })

  it('範囲外の乱数を拒否する', () => {
    expect(() => createJourney(() => 1)).toThrow(RangeError)
  })
})

describe('getJourneyPosition', () => {
  const journey = createJourney(() => 0)

  it('30点ごとに次の目的地へ移動する', () => {
    expect(getJourneyPosition(0, journey).currentPoint.name).toBe('スタート')
    expect(getJourneyPosition(29, journey).currentPoint.name).toBe('スタート')
    expect(getJourneyPosition(30, journey).currentPoint.name).toBe('福岡')
    expect(getJourneyPosition(60, journey).currentPoint.name).toBe('広島')
  })

  it('目的地を越えた点数を次の区間へ持ち越す', () => {
    const position = getJourneyPosition(32, journey)

    expect(position.currentPoint.name).toBe('福岡')
    expect(position.destination?.name).toBe('広島')
    expect(position.progressScore).toBe(2)
    expect(position.requiredScore).toBe(30)
  })

  it('最後の目的地以降は30点ごとに探索レベルを上げる', () => {
    expect(getJourneyPosition(689, journey).explorationLevel).toBeNull()
    expect(getJourneyPosition(690, journey)).toMatchObject({
      explorationLevel: 1,
      progressScore: 0,
      requiredScore: 30,
    })
    expect(getJourneyPosition(719, journey)).toMatchObject({
      explorationLevel: 1,
      progressScore: 29,
    })
    expect(getJourneyPosition(720, journey)).toMatchObject({
      explorationLevel: 2,
      progressScore: 0,
    })
  })

  it('不正な点数は0点として現在地を計算する', () => {
    expect(getJourneyPosition(-1, journey).currentPoint.name).toBe('スタート')
    expect(getJourneyPosition(Number.NaN, journey).currentPoint.name).toBe('スタート')
  })
})
