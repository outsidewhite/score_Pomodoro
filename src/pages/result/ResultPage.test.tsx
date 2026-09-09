import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { ResultPage } from './ResultPage.tsx'

test('計測完了の状態表示は計測中と同じ緑の状態として描画される', () => {
  render(
    <ResultPage
      earnedScore={10}
      onRestart={vi.fn()}
      originalScore={0}
      result={{
        detectionScore: 80,
        measuredDurationMs: 60_000,
        postureScore: 70,
        stabilityScore: 90,
        totalScore: 80,
      }}
    />,
  )

  const status = screen.getByRole('status')
  expect(status).toHaveTextContent('計測完了')
  expect(status).toHaveClass('app-header__status--complete')
})
