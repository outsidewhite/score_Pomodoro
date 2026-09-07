import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createJourney } from './createJourney.ts'
import { getJourneyPosition } from './getJourneyPosition.ts'

describe('createJourney', () => {
  it('与えられた乱数で国内と世界のルートを選ぶ', () => {
    const values = [0, 0.999]
    const journey = createJourney(() => values.shift() ?? 0)

    assert.equal(journey.japanRoute.id, 'japan-west-east')
    assert.equal(journey.worldRoute.id, 'world-europe')
    assert.equal(journey.spaceRoute.id, 'space-main')
  })

  it('範囲外の乱数を拒否する', () => {
    assert.throws(() => createJourney(() => 1), RangeError)
  })
})

describe('getJourneyPosition', () => {
  const journey = createJourney(() => 0)

  it('45点ごとに次の目的地へ移動する', () => {
    assert.equal(getJourneyPosition(0, journey).currentPoint.name, 'スタート')
    assert.equal(getJourneyPosition(44, journey).currentPoint.name, 'スタート')
    assert.equal(getJourneyPosition(45, journey).currentPoint.name, '福岡')
    assert.equal(getJourneyPosition(90, journey).currentPoint.name, '広島')
  })

  it('目的地を越えた点数を次の区間へ持ち越す', () => {
    const position = getJourneyPosition(47, journey)

    assert.equal(position.currentPoint.name, '福岡')
    assert.equal(position.destination?.name, '広島')
    assert.equal(position.progressScore, 2)
    assert.equal(position.requiredScore, 45)
  })

  it('不正な点数は0点として現在地を計算する', () => {
    assert.equal(getJourneyPosition(-1, journey).currentPoint.name, 'スタート')
    assert.equal(getJourneyPosition(Number.NaN, journey).currentPoint.name, 'スタート')
  })
})
