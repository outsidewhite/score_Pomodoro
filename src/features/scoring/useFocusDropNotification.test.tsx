import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { AppToaster } from '../../components/Notification/AppToaster.tsx'
import type { ScoreIntervalResult } from './intervalScoring.ts'
import { toast } from 'sonner'
import { useFocusDropNotification } from './useFocusDropNotification.ts'

afterEach(() => {
  toast.dismiss()
})

function createInterval(intervalNumber: number, totalScore: number): ScoreIntervalResult {
  const startedAt = (intervalNumber - 1) * 60_000
  return {
    absentCount: 0,
    calibrationSucceeded: false,
    detectedCount: 120,
    detectionScore: totalScore,
    earnedScore: 1,
    endedAt: startedAt + 60_000,
    failedCount: 0,
    id: `interval:${intervalNumber}`,
    isCalibration: false,
    missedCount: 0,
    postureScore: totalScore,
    stabilityScore: totalScore,
    startedAt,
    totalScore,
  }
}

test('集中切れ時に青色の通知と休憩操作を表示する', async () => {
  const user = userEvent.setup()
  const onBreakRequest = vi.fn()
  render(<AppToaster />)
  const { result } = renderHook(() =>
    useFocusDropNotification({ onBreakRequest }),
  )

  act(() => {
    for (let intervalNumber = 1; intervalNumber <= 9; intervalNumber += 1) {
      result.current.handleIntervalComplete(createInterval(intervalNumber, 60))
    }
    result.current.handleIntervalComplete(createInterval(10, 30))
  })

  const message = await screen.findByText(
    '集中力が落ちてきているようです。休憩を検討しましょう',
  )
  expect(message.closest('[data-sonner-toast]')).toHaveAttribute('data-type', 'info')

  await user.click(screen.getByRole('button', { name: '休憩する' }))

  expect(onBreakRequest).toHaveBeenCalledTimes(1)
})
