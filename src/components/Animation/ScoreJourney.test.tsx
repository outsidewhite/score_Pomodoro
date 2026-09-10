import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createJourney } from '../../features/trip/createJourney.ts'
import { ScoreJourney } from './ScoreJourney.tsx'

describe('ScoreJourney', () => {
  const journey = createJourney(() => 0)

  it.each([
    [0, '日本ステージ', /^日本を走る電車/],
    [360, '世界ステージ', /^世界を巡る飛行機/],
    [900, '宇宙ステージ', /^宇宙を進む宇宙船/],
  ] as const)('%i点では%sのアニメーションを表示する', (score, stageName, sceneName) => {
    render(<ScoreJourney journey={journey} score={score} />)

    expect(screen.getByText(stageName)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: sceneName })).toBeInTheDocument()
  })
})
