import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test } from 'vitest'
import { toast } from 'sonner'
import { AppToaster } from './AppToaster.tsx'

// 前のテストで残った通知が次のテストへ持ち越されないよう、毎回すべて閉じる。
afterEach(() => {
  toast.dismiss()
})

describe('AppToaster', () => {
  test('toast.errorで発生した通知にタイトル・メッセージ・閉じる操作が表示される', async () => {
    render(<AppToaster />)

    toast.error('姿勢解析でエラーが発生しました', {
      description: 'カメラ映像を取得できませんでした。',
    })

    expect(
      await screen.findByText('姿勢解析でエラーが発生しました'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('カメラ映像を取得できませんでした。'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '通知を閉じる' }),
    ).toBeInTheDocument()
  })

  test('通知はaria-live付きの通知領域に読み上げ対象として描画される', async () => {
    render(<AppToaster />)

    toast.success('計測を開始しました')

    const title = await screen.findByText('計測を開始しました')
    // ラベルにはSonnerが通知領域へフォーカスするショートカット(alt+T)が付く。
    const region = screen.getByRole('region', { name: /^通知/ })
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toContainElement(title)
  })

  test('閉じる操作を行うと通知が非表示になる', async () => {
    const user = userEvent.setup()
    render(<AppToaster />)

    toast.error('姿勢解析でエラーが発生しました')
    const title = await screen.findByText('姿勢解析でエラーが発生しました')

    await user.click(screen.getByRole('button', { name: '通知を閉じる' }))

    await waitForElementToBeRemoved(title)
  })

  test('キーボード操作で通知を閉じられる', async () => {
    const user = userEvent.setup()
    render(<AppToaster />)

    toast.error('姿勢解析でエラーが発生しました')
    const title = await screen.findByText('姿勢解析でエラーが発生しました')

    const closeButton = screen.getByRole('button', { name: '通知を閉じる' })
    closeButton.focus()
    expect(closeButton).toHaveFocus()
    await user.keyboard('{Enter}')

    await waitForElementToBeRemoved(title)
  })

  test('同じidの通知イベントは重複表示されず、内容が更新される', async () => {
    render(<AppToaster />)

    toast.error('姿勢解析でエラーが発生しました', {
      description: '1回目のエラーです。',
      id: 'pose-analysis-error',
    })
    toast.error('姿勢解析でエラーが発生しました', {
      description: '2回目のエラーです。',
      id: 'pose-analysis-error',
    })

    await screen.findByText('2回目のエラーです。')
    await waitFor(() => {
      expect(
        screen.getAllByText('姿勢解析でエラーが発生しました'),
      ).toHaveLength(1)
    })
    expect(screen.queryByText('1回目のエラーです。')).not.toBeInTheDocument()
  })

  test('idが異なる通知は複数表示される', async () => {
    render(<AppToaster />)

    toast.error('1件目の通知')
    toast.success('2件目の通知')

    expect(await screen.findByText('1件目の通知')).toBeInTheDocument()
    expect(await screen.findByText('2件目の通知')).toBeInTheDocument()
  })

  test('toast.dismissで指定したidの通知だけを閉じられる', async () => {
    render(<AppToaster />)

    toast.error('閉じる対象の通知', { id: 'pose-analysis-error' })
    toast.success('残る通知', { id: 'other-notification' })
    const target = await screen.findByText('閉じる対象の通知')
    await screen.findByText('残る通知')

    toast.dismiss('pose-analysis-error')

    await waitForElementToBeRemoved(target)
    expect(screen.getByText('残る通知')).toBeInTheDocument()
  })
})
