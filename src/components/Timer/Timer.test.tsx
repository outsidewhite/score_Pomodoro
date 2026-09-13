import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { Timer } from './Timer.tsx'

afterEach(() => {
  vi.useRealTimers()
})

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

test('休憩中の停止要求でもタイマーを停止する', async () => {
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
  await user.click(screen.getByRole('button', { name: '休憩に入る' }))
  await waitFor(() => expect(onModeChange).toHaveBeenLastCalledWith('break'))

  // カメラ切断は休憩中にも起こり得るため、集中中と同じ経路で停止する。
  rerender(<Timer {...props} autoPauseRequest={1} />)

  await screen.findByRole('button', { name: 'タイマーを開始する' })
  await waitFor(() => expect(onModeChange).toHaveBeenLastCalledWith('away'))
  expect(onLogEntry).toHaveBeenLastCalledWith(
    expect.objectContaining({ mode: 'away' }),
  )
})

test('10分休憩の残り1分で一度だけ通知する', async () => {
  vi.useFakeTimers()
  const onBreakEndingSoon = vi.fn()
  render(
    <Timer
      onBreakEndingSoon={onBreakEndingSoon}
      onExit={vi.fn()}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'タイマーを開始する' }))
  fireEvent.click(screen.getByRole('button', { name: '休憩に入る' }))

  await act(() => vi.advanceTimersByTimeAsync(8 * 60_000 + 59_000))
  expect(onBreakEndingSoon).not.toHaveBeenCalled()

  await act(() => vi.advanceTimersByTimeAsync(1_000))
  expect(onBreakEndingSoon).toHaveBeenCalledTimes(1)

  await act(() => vi.advanceTimersByTimeAsync(60_000))
  expect(onBreakEndingSoon).toHaveBeenCalledTimes(1)
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

test('目標時間が渡されない場合はシークバーを表示しない', () => {
  render(<Timer onExit={vi.fn()} />)

  expect(screen.queryByRole('progressbar')).toBeNull()
})

test('目標時間が0分の場合もシークバーを表示せず、00:00:00から計測する', async () => {
  const user = userEvent.setup()
  render(<Timer onExit={vi.fn()} targetMinutes={0} />)

  expect(screen.getByText('00:00:00')).toBeInTheDocument()
  expect(screen.queryByRole('progressbar')).toBeNull()

  await user.click(screen.getByRole('button', { name: 'タイマーを開始する' }))

  // 目標なしでも通常どおり計測し、途中でシークバーが現れない。
  expect(screen.getByRole('button', { name: 'タイマーを停止する' })).toBeInTheDocument()
  expect(screen.queryByRole('progressbar')).toBeNull()
})

test('復元した経過時間を目標時間の進捗へ反映する', () => {
  render(
    <Timer initialElapsedMs={750_000} onExit={vi.fn()} targetMinutes={25} />,
  )

  expect(screen.getByRole('progressbar', { name: '目標時間の進捗' }))
    .toHaveAttribute('aria-valuenow', '50')
})

test('作業時間が目標時間へ達した時だけ一度通知する', async () => {
  vi.useFakeTimers()
  const onTargetReached = vi.fn()
  render(
    <Timer
      initialElapsedMs={59_000}
      onExit={vi.fn()}
      onTargetReached={onTargetReached}
      targetMinutes={1}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'タイマーを開始する' }))
  await act(() => vi.advanceTimersByTimeAsync(1_000))

  expect(onTargetReached).toHaveBeenCalledTimes(1)

  await act(() => vi.advanceTimersByTimeAsync(5_000))
  expect(onTargetReached).toHaveBeenCalledTimes(1)
})

test('復元時に目標時間へ到達済みの場合は再通知しない', () => {
  const onTargetReached = vi.fn()

  render(
    <Timer
      initialElapsedMs={60_000}
      onExit={vi.fn()}
      onTargetReached={onTargetReached}
      targetMinutes={1}
    />,
  )

  expect(onTargetReached).not.toHaveBeenCalled()
})

test('休憩へ切り替えてもシークバーの見た目は変化しない', async () => {
  const user = userEvent.setup()
  render(
    <Timer initialElapsedMs={750_000} onExit={vi.fn()} targetMinutes={25} />,
  )

  const focusClassName = screen.getByRole('progressbar').className

  await user.click(screen.getByRole('button', { name: 'タイマーを開始する' }))
  await user.click(screen.getByRole('button', { name: '休憩に入る' }))
  await screen.findByRole('button', { name: '集中に戻る' })

  // モード別のクラスを持たないため、集中・休憩・離席で色が変化しない。
  expect(screen.getByRole('progressbar').className).toBe(focusClassName)
})
