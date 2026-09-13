import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { StartPage } from './StartPage.tsx'

beforeEach(() => {
  // Nodeとjsdomで異なる時刻基準を揃え、ホイールのアニメーション完了を実ブラウザ同様に再現する。
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 16),
  )
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => window.clearTimeout(handle))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function getTimeInputs() {
  return {
    hours: screen.getByRole('textbox', { name: '目標時間の時間' }),
    minutes: screen.getByRole('textbox', { name: '目標時間の分' }),
  }
}

function getTimeWheels() {
  return {
    hours: screen.getByRole('spinbutton', { name: '目標時間の時間' }),
    minutes: screen.getByRole('spinbutton', { name: '目標時間の分' }),
  }
}

test('セッション設定の状態表示は灰色の状態として描画される', () => {
  render(<StartPage onStart={vi.fn()} />)

  const status = screen.getByRole('status')
  expect(status).toHaveTextContent('セッション設定')
  expect(status).toHaveClass('app-header__status--setup')
})

describe('目標時間の設定', () => {
  test('初期値として00:25を入力欄とホイールに表示する', () => {
    render(<StartPage onStart={vi.fn()} />)

    const inputs = getTimeInputs()
    const wheels = getTimeWheels()
    expect(inputs.hours).toHaveValue('00')
    expect(inputs.minutes).toHaveValue('25')
    expect(wheels.hours).toHaveAttribute('aria-valuenow', '0')
    expect(wheels.minutes).toHaveAttribute('aria-valuenow', '25')
    expect(wheels.minutes).toHaveAttribute('aria-valuetext', '25分')
  })

  test('前回の設定値を時と分へ分けて表示する', () => {
    render(<StartPage initialSettings={{ targetMinutes: 90 }} onStart={vi.fn()} />)

    expect(getTimeInputs().hours).toHaveValue('01')
    expect(getTimeInputs().minutes).toHaveValue('30')
    expect(getTimeWheels().hours).toHaveAttribute('aria-valuenow', '1')
  })

  test('ホイールのキー操作を入力欄へ反映する', async () => {
    const user = userEvent.setup()
    render(<StartPage onStart={vi.fn()} />)
    const wheels = getTimeWheels()
    const inputs = getTimeInputs()

    wheels.minutes.focus()
    await user.keyboard('{ArrowUp}')
    expect(inputs.minutes).toHaveValue('26')
    expect(wheels.minutes).toHaveAttribute('aria-valuenow', '26')

    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(inputs.minutes).toHaveValue('24')

    await user.keyboard('{End}')
    expect(inputs.minutes).toHaveValue('59')

    // 上限では値を循環させず、そのまま留める。
    await user.keyboard('{ArrowUp}')
    expect(inputs.minutes).toHaveValue('59')

    await user.keyboard('{Home}')
    expect(inputs.minutes).toHaveValue('00')

    wheels.hours.focus()
    await user.keyboard('{PageUp}')
    expect(inputs.hours).toHaveValue('10')
  })

  test('ホイール標準の上下キー処理を重ねて実行しない', async () => {
    const user = userEvent.setup()
    render(<StartPage onStart={vi.fn()} />)

    getTimeWheels().minutes.focus()
    await user.keyboard('{ArrowUp}')

    // 標準処理が残っていると、約0.45秒のアニメーション後に逆方向の値で上書きされる。
    await new Promise((resolve) => window.setTimeout(resolve, 700))
    expect(getTimeInputs().minutes).toHaveValue('26')
  })

  test('マウスホイールでの選択を入力欄へ反映する', async () => {
    render(<StartPage onStart={vi.fn()} />)
    const wheels = getTimeWheels()

    fireEvent.wheel(wheels.hours, { deltaY: 100 })

    // ライブラリのスクロールアニメーションが終わった時点で値が確定する。
    await waitFor(() => expect(getTimeInputs().hours).toHaveValue('01'))
    expect(wheels.hours).toHaveAttribute('aria-valuenow', '1')
  })

  test('キーボード入力をホイールへ反映し、入力中の値は書き換えない', async () => {
    const user = userEvent.setup()
    render(<StartPage onStart={vi.fn()} />)
    const inputs = getTimeInputs()
    const wheels = getTimeWheels()

    await user.clear(inputs.hours)
    await user.type(inputs.hours, '1')
    expect(inputs.hours).toHaveValue('1')
    expect(wheels.hours).toHaveAttribute('aria-valuenow', '1')

    await user.clear(inputs.minutes)
    await user.type(inputs.minutes, '5')
    expect(inputs.minutes).toHaveValue('5')
    expect(wheels.minutes).toHaveAttribute('aria-valuenow', '5')

    // フォーカスを外した時点で2桁表示へ揃える。
    await user.tab()
    expect(inputs.minutes).toHaveValue('05')
  })

  test('全角数字の入力も時間として扱う', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<StartPage onStart={onStart} />)
    const inputs = getTimeInputs()

    await user.clear(inputs.minutes)
    await user.type(inputs.minutes, '４５')
    expect(getTimeWheels().minutes).toHaveAttribute('aria-valuenow', '45')

    await user.click(screen.getByRole('button', { name: 'START' }))
    expect(onStart).toHaveBeenCalledWith({ targetMinutes: 45 })
  })

  test('設定した時と分を分へ変換してonStartへ渡す', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<StartPage onStart={onStart} />)
    const inputs = getTimeInputs()

    await user.clear(inputs.hours)
    await user.type(inputs.hours, '1')
    await user.clear(inputs.minutes)
    await user.type(inputs.minutes, '30')
    await user.click(screen.getByRole('button', { name: 'START' }))

    expect(onStart).toHaveBeenCalledOnce()
    expect(onStart).toHaveBeenCalledWith({ targetMinutes: 90 })
    expect(inputs.hours).toHaveValue('01')
  })

  test('00:00でもセッションを開始できる', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<StartPage onStart={onStart} />)

    getTimeWheels().minutes.focus()
    await user.keyboard('{Home}')
    await user.click(screen.getByRole('button', { name: 'START' }))

    expect(getTimeInputs().minutes).toHaveValue('00')
    expect(onStart).toHaveBeenCalledWith({ targetMinutes: 0 })
  })

  test('Enterキーでフォームを送信して開始できる', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<StartPage onStart={onStart} />)
    const inputs = getTimeInputs()

    await user.clear(inputs.minutes)
    await user.type(inputs.minutes, '45{Enter}')

    expect(onStart).toHaveBeenCalledWith({ targetMinutes: 45 })
  })

  test('キーボード操作だけで値を変更して開始できる', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<StartPage onStart={onStart} />)
    const inputs = getTimeInputs()
    const wheels = getTimeWheels()

    await user.tab()
    expect(inputs.hours).toHaveFocus()
    await user.keyboard('{Control>}a{/Control}2')

    await user.tab()
    expect(inputs.minutes).toHaveFocus()

    await user.tab()
    expect(wheels.hours).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(wheels.minutes).toHaveFocus()
    await user.keyboard('{ArrowUp}')

    await user.tab()
    expect(screen.getByRole('button', { name: 'START' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onStart).toHaveBeenCalledWith({ targetMinutes: 2 * 60 + 26 })
  })

  // 入力途中の「2」「6」は有効値なので、ホイールはそこで止まり範囲外へは動かない。
  test.each([
    ['hours', '', '時間を入力してください', '0'],
    ['hours', '24', '時間は00〜23の数字で入力してください', '2'],
    ['minutes', '60', '分は00〜59の数字で入力してください', '6'],
    ['minutes', '-1', '分は00〜59の数字で入力してください', '25'],
    ['minutes', 'a', '分は00〜59の数字で入力してください', '25'],
  ] as const)('%sが「%s」のときは開始せずエラーを表示する', async (unit, text, message, wheelValue) => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<StartPage onStart={onStart} />)
    const input = getTimeInputs()[unit]
    const wheel = getTimeWheels()[unit]

    await user.clear(input)
    if (text) await user.type(input, text)
    await user.click(screen.getByRole('button', { name: 'START' }))

    expect(onStart).not.toHaveBeenCalled()
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(message)
    expect(input).toHaveFocus()
    // 無効な入力ではホイールを最後に有効だった位置から動かさない。
    expect(wheel).toHaveAttribute('aria-valuenow', wheelValue)
    expect(input).toHaveValue(text)
  })

  test('空欄は入力中には指摘せず、フォーカスを外した時点でエラーを表示する', async () => {
    const user = userEvent.setup()
    render(<StartPage onStart={vi.fn()} />)
    const inputs = getTimeInputs()

    await user.clear(inputs.hours)
    expect(screen.queryByText('時間を入力してください')).toBeNull()

    await user.tab()
    expect(screen.getByText('時間を入力してください')).toBeInTheDocument()
  })

  test('ホイールで選び直すと入力エラーを解消する', async () => {
    const user = userEvent.setup()
    render(<StartPage onStart={vi.fn()} />)
    const inputs = getTimeInputs()

    await user.clear(inputs.hours)
    await user.type(inputs.hours, '24')
    expect(screen.getByText('時間は00〜23の数字で入力してください')).toBeInTheDocument()

    // ホイールは入力途中の有効値「2」の位置にあり、そこから1つ進める。
    getTimeWheels().hours.focus()
    await user.keyboard('{ArrowUp}')

    expect(inputs.hours).toHaveValue('03')
    expect(inputs.hours).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText('時間は00〜23の数字で入力してください')).toBeNull()
  })
})
