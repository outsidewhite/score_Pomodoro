import { describe, expect, test } from 'vitest'
import { getTimerStatus } from './statusTone.ts'

describe('getTimerStatus', () => {
  test.each([
    { expectedLabel: '計測中', expectedTone: 'measuring', mode: 'focus' },
    { expectedLabel: '休憩中', expectedTone: 'break', mode: 'break' },
    { expectedLabel: '離席中', expectedTone: 'away', mode: 'away' },
  ] as const)(
    '$mode のときは $expectedLabel と $expectedTone を返す',
    ({ expectedLabel, expectedTone, mode }) => {
      expect(getTimerStatus(mode)).toEqual({
        label: expectedLabel,
        tone: expectedTone,
      })
    },
  )
})
