import { describe, expect, test } from 'vitest'
import {
  formatTimeUnit,
  getTimeUnitError,
  parseTimeUnit,
  splitTargetMinutes,
  toTargetMinutes,
} from './targetTime.ts'

describe('splitTargetMinutes', () => {
  test('分を時と分へ分割する', () => {
    expect(splitTargetMinutes(25)).toEqual({ hours: 0, minutes: 25 })
    expect(splitTargetMinutes(90)).toEqual({ hours: 1, minutes: 30 })
    expect(splitTargetMinutes(0)).toEqual({ hours: 0, minutes: 0 })
    expect(splitTargetMinutes(23 * 60 + 59)).toEqual({ hours: 23, minutes: 59 })
  })

  test('範囲外や不正な保存値はホイールの選択肢へ丸める', () => {
    expect(splitTargetMinutes(3_000)).toEqual({ hours: 23, minutes: 59 })
    expect(splitTargetMinutes(-5)).toEqual({ hours: 0, minutes: 0 })
    expect(splitTargetMinutes(25.5)).toEqual({ hours: 0, minutes: 25 })
    expect(splitTargetMinutes(Number.NaN)).toEqual({ hours: 0, minutes: 0 })
  })
})

test('時と分を分へ変換する', () => {
  expect(toTargetMinutes({ hours: 1, minutes: 30 })).toBe(90)
  expect(toTargetMinutes({ hours: 0, minutes: 0 })).toBe(0)
})

test('2桁のゼロ埋めで表示する', () => {
  expect(formatTimeUnit(0)).toBe('00')
  expect(formatTimeUnit(5)).toBe('05')
  expect(formatTimeUnit(23)).toBe('23')
})

describe('parseTimeUnit', () => {
  test.each([
    ['0', 'hours', 0],
    ['05', 'minutes', 5],
    ['23', 'hours', 23],
    ['59', 'minutes', 59],
    ['２５', 'minutes', 25],
  ] as const)('%sを%sの値として受け付ける', (text, unit, expected) => {
    expect(parseTimeUnit(text, unit)).toBe(expected)
  })

  test.each([
    ['', 'hours'],
    ['-1', 'minutes'],
    ['1.5', 'minutes'],
    ['a', 'hours'],
    ['100', 'minutes'],
    ['24', 'hours'],
    ['60', 'minutes'],
  ] as const)('%sは%sとして無効にする', (text, unit) => {
    expect(parseTimeUnit(text, unit)).toBeNull()
  })
})

describe('getTimeUnitError', () => {
  test('有効な値ではエラーを返さない', () => {
    expect(getTimeUnitError('00', 'hours')).toBeNull()
    expect(getTimeUnitError('59', 'minutes')).toBeNull()
  })

  test('空欄と不正値で異なるエラー文を返す', () => {
    expect(getTimeUnitError('', 'hours')).toBe('時間を入力してください')
    expect(getTimeUnitError('24', 'hours')).toBe(
      '時間は00〜23の数字で入力してください',
    )
    expect(getTimeUnitError('-1', 'minutes')).toBe(
      '分は00〜59の数字で入力してください',
    )
  })
})
