import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { StartPage } from './StartPage.tsx'

test('セッション設定の状態表示は灰色の状態として描画される', () => {
  render(<StartPage onStart={vi.fn()} />)

  const status = screen.getByRole('status')
  expect(status).toHaveTextContent('セッション設定')
  expect(status).toHaveClass('app-header__status--setup')
})
