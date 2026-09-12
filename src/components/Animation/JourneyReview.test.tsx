import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createJourney } from '../../features/trip/createJourney.ts'
import { JourneyReview } from './JourneyReview.tsx'

const journey = createJourney(() => 0)
// 地図とリストの双方へ同一の到着記録を渡す。
const element = (score = 45, isFocused = false) => (
  <JourneyReview arrivals={{ 45: 1_201_000 }} journey={journey} score={score} isFocused={isFocused}>
    <div>旅のアニメーション</div>
  </JourneyReview>
)

describe('旅の地図と目的地リスト', () => {
  it('最初の到着前は地図だけをロックし、リストは次の地名まで表示する', async () => {
    const user = userEvent.setup()
    render(element(0))
    expect(screen.getByRole('button', { name: '地図を開く' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '目的地リストを開く' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('福岡')).toBeInTheDocument()
    expect(dialog.queryByText('広島')).not.toBeInTheDocument()
    expect(dialog.getAllByText('???')).toHaveLength(22)
  })

  it('地図は通過済みを黒丸・実線、次を白丸・点線にし、それより先の通常地点を描かない', async () => {
    const user = userEvent.setup()
    render(element())
    await user.click(screen.getByRole('button', { name: '地図を開く' }))
    const map = screen.getByRole('img', { name: '西から東への地図' })
    expect(within(map).getByText('福岡')).toBeInTheDocument()
    expect(within(map).getByText('広島')).toBeInTheDocument()
    expect(within(map).queryByText('神戸')).not.toBeInTheDocument()
    expect(map.querySelectorAll('circle[fill="black"]')).toHaveLength(1)
    expect(map.querySelectorAll('circle[fill="white"]')).toHaveLength(1)
    expect(map.querySelectorAll('.journey-map__route:not([stroke-dasharray])')).toHaveLength(0)
    expect(map.querySelectorAll('.journey-map__route[stroke-dasharray]')).toHaveLength(1)
    expect(within(screen.getByRole('dialog')).getByText('00:20:01')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '目的地リストを開く' }))
    const list = within(screen.getByRole('dialog'))
    expect(list.getByText('00:20:01').closest('li')).toHaveClass('journey-list__stop--reached')
    expect(list.getByText('00:35:01').closest('li')).toHaveClass('journey-list__stop--future')
    expect(list.queryByText('神戸')).not.toBeInTheDocument()
  })

  it('宇宙の丸は固定したまま、次の目的地になるまで名前を伏せる', async () => {
    const user = userEvent.setup()
    const { rerender } = render(element(900))
    await user.click(screen.getByRole('button', { name: '地図を開く' }))
    const coordinates = () => [...screen.getByRole('img', { name: '月への旅の地図' }).querySelectorAll('circle[stroke-width="2"]')]
      .map((circle) => [circle.getAttribute('cx'), circle.getAttribute('cy')])
    const initial = coordinates()
    expect(initial).toHaveLength(4)
    expect(within(screen.getByRole('dialog')).queryByText('月への航路')).not.toBeInTheDocument()
    rerender(element(945))
    expect(coordinates()).toEqual(initial)
    expect(within(screen.getByRole('dialog')).getByText('月への航路', { selector: 'strong' })).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).queryByText('月周回軌道')).not.toBeInTheDocument()
  })

  it('キーボードで開閉し、Escapeで入口へフォーカスを戻す', async () => {
    const user = userEvent.setup()
    render(element())
    const opener = screen.getByRole('button', { name: '地図を開く' })
    opener.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: '旅の履歴を閉じる' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('集中中は開けず、集中に戻ったら閉じて次の休憩でも閉じたままにする', async () => {
    const user = userEvent.setup()
    const { rerender } = render(element())
    await user.click(screen.getByRole('button', { name: '目的地リストを開く' }))
    rerender(element(45, true))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '地図を開く' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '目的地リストを開く' })).toBeDisabled()
    rerender(element())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('最終目的地以降に???の行を追加しない', async () => {
    const user = userEvent.setup()
    render(element(1080))
    await user.click(screen.getByRole('button', { name: '目的地リストを開く' }))
    expect(within(screen.getByRole('dialog')).queryByText('???')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(24)
  })
})
