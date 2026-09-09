import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Timer } from './Timer.tsx'

test('姿勢解析からの離席要求で集中タイマーを停止する', async () => {
  const user = userEvent.setup()
  const onLogEntry = vi.fn()
  const onModeChange = vi.fn()
  const props = {
    onExit: vi.fn(),
    onLogEntry,
    onModeChange,
  }
  const { rerender } = render(<Timer {...props} autoPauseRequest={0} />)

  await user.click(screen.getByRole('button', { name: 'タイマーを開始する' }))
  await waitFor(() => expect(onModeChange).toHaveBeenLastCalledWith('focus'))

  rerender(<Timer {...props} autoPauseRequest={1} />)

  await screen.findByRole('button', { name: 'タイマーを開始する' })
  await waitFor(() => expect(onModeChange).toHaveBeenLastCalledWith('away'))
  expect(onLogEntry).toHaveBeenLastCalledWith(
    expect.objectContaining({ mode: 'away' }),
  )
})

test('集中切れ通知からの休憩要求で休憩モードへ切り替える', async () => {
  const user = userEvent.setup()
  const onLogEntry = vi.fn()
  const onModeChange = vi.fn()
  const props = {
    onExit: vi.fn(),
    onLogEntry,
    onModeChange,
  }
  const { rerender } = render(<Timer {...props} autoBreakRequest={0} />)

  await user.click(screen.getByRole('button', { name: 'タイマーを開始する' }))
  await waitFor(() => expect(onModeChange).toHaveBeenLastCalledWith('focus'))

  rerender(<Timer {...props} autoBreakRequest={1} />)

  await waitFor(() => expect(onModeChange).toHaveBeenLastCalledWith('break'))
  expect(onLogEntry).toHaveBeenLastCalledWith(
    expect.objectContaining({ mode: 'break' }),
  )
})

test('モデル準備中は開始だけを無効化し、終了操作は利用できる', () => {
  render(<Timer onExit={vi.fn()} startDisabled />)

  expect(
    screen.getByRole('button', { name: 'タイマーを開始する' }),
  ).toBeDisabled()
  expect(
    screen.getByRole('button', { name: 'セッションを終了する' }),
  ).toBeEnabled()
})

test('復元したログIDの続きから新しいログを発行する', async () => {
  const user = userEvent.setup()
  const onLogEntry = vi.fn()
  render(
    <Timer
      initialElapsedMs={60_000}
      initialLogId={4}
      onExit={vi.fn()}
      onLogEntry={onLogEntry}
    />,
  )

  await user.click(screen.getByRole('button', { name: 'タイマーを開始する' }))

  expect(onLogEntry).toHaveBeenCalledWith(
    expect.objectContaining({ id: 5, mode: 'focus' }),
  )
})
