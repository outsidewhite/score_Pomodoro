import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { TimerProgress } from './TimerProgress.tsx'

const TARGET_MINUTES = 25
const TARGET_MS = TARGET_MINUTES * 60_000

test('経過時間0分では0%と表示する', () => {
  render(<TimerProgress elapsedMs={0} targetMinutes={TARGET_MINUTES} />)

  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  expect(screen.getByText('0%')).toBeInTheDocument()
})

test('目標時間の半分では50%と表示する', () => {
  render(<TimerProgress elapsedMs={TARGET_MS / 2} targetMinutes={TARGET_MINUTES} />)

  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
  expect(screen.getByText('50%')).toBeInTheDocument()
})

test('目標時間到達で100%と表示する', () => {
  render(<TimerProgress elapsedMs={TARGET_MS} targetMinutes={TARGET_MINUTES} />)

  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  expect(screen.getByText('100%')).toBeInTheDocument()
})

test('目標時間を超過しても100%を超えない', () => {
  render(<TimerProgress elapsedMs={TARGET_MS * 2} targetMinutes={TARGET_MINUTES} />)

  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  expect(screen.getByText('100%')).toBeInTheDocument()
})

test('目標時間が0の場合はシークバーを表示しない', () => {
  render(<TimerProgress elapsedMs={TARGET_MS} targetMinutes={0} />)

  expect(screen.queryByRole('progressbar')).toBeNull()
})

test('目標時間が負の値でもシークバーを表示しない', () => {
  render(<TimerProgress elapsedMs={TARGET_MS} targetMinutes={-10} />)

  expect(screen.queryByRole('progressbar')).toBeNull()
})

test('目標時間が不正な値ではNaNやInfinityを表示しない', () => {
  const { container, rerender } = render(
    <TimerProgress elapsedMs={TARGET_MS} targetMinutes={Number.NaN} />,
  )

  expect(screen.queryByRole('progressbar')).toBeNull()
  expect(container.textContent).not.toMatch(/NaN|Infinity/)

  rerender(
    <TimerProgress elapsedMs={TARGET_MS} targetMinutes={Number.POSITIVE_INFINITY} />,
  )

  expect(screen.queryByRole('progressbar')).toBeNull()
  expect(container.textContent).not.toMatch(/NaN|Infinity/)
})

test('経過時間が不正な値でも進捗率が壊れない', () => {
  render(<TimerProgress elapsedMs={Number.NaN} targetMinutes={TARGET_MINUTES} />)

  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  expect(screen.getByText('0%')).toBeInTheDocument()
})

test('進捗を伝えるアクセシビリティ属性を設定する', () => {
  render(<TimerProgress elapsedMs={TARGET_MS / 2} targetMinutes={TARGET_MINUTES} />)

  const progressbar = screen.getByRole('progressbar', { name: '目標時間の進捗' })
  expect(progressbar).toHaveAttribute('aria-valuemin', '0')
  expect(progressbar).toHaveAttribute('aria-valuemax', '100')
  expect(progressbar).toHaveAttribute('aria-valuenow', '50')
})

test('値を変更できる操作部品を持たない', () => {
  const { container } = render(
    <TimerProgress elapsedMs={TARGET_MS / 2} targetMinutes={TARGET_MINUTES} />,
  )

  // 進捗表示専用のため、フォーカスも入力要素も持たせない。
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('tabindex')
  expect(container.querySelector('input')).toBeNull()
  expect(container.querySelector('[tabindex]')).toBeNull()
})

test('進捗済み部分の幅が表示中の進捗率と一致する', () => {
  const { container } = render(
    <TimerProgress elapsedMs={TARGET_MS / 4} targetMinutes={TARGET_MINUTES} />,
  )

  expect(screen.getByText('25%')).toBeInTheDocument()
  expect(container.querySelector('.timer-progress__fill')).toHaveStyle({
    width: '25%',
  })
})

test('開始と目標時間の目盛りを表示する', () => {
  render(<TimerProgress elapsedMs={0} targetMinutes={TARGET_MINUTES} />)

  expect(screen.getByText('00:00')).toBeInTheDocument()
  expect(screen.getByText('25:00')).toBeInTheDocument()
})
