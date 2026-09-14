import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { saveTimerSession } from '../../features/session/timerSession.ts'
import { createJourney } from '../../features/trip/createJourney.ts'
import { ResultPage } from './ResultPage.tsx'
import { getScoreRank } from './resultScore.ts'

const journey = createJourney(() => 0)
const result = {
  detectionScore: 49,
  measuredDurationMs: 3_661_000,
  postureScore: 90,
  stabilityScore: 70,
  totalScore: 70,
}

function renderResultPage(onRestart = vi.fn()) {
  return render(
    <ResultPage
      earnedScore={45}
      journey={journey}
      onRestart={onRestart}
      originalScore={0}
      result={result}
      sessionId="result-test"
    />,
  )
}

describe('計測結果画面', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  test('累計スコア・作業時間・到着地・平均ランクを表示する', () => {
    renderResultPage()

    expect(screen.getByText('計測完了')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '総合スコア' })).toBeInTheDocument()
    expect(screen.getByText('今回のスコア：')).toBeInTheDocument()
    expect(screen.getByText('総合ランク：')).toBeInTheDocument()
    expect(screen.getByLabelText('総合ランク A')).toBeInTheDocument()
    expect(screen.getByText('01:01:01')).toBeInTheDocument()
    expect(screen.getAllByText(journey.japanRoute.points[1]!.name).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('姿勢ランク S')).toBeInTheDocument()
    expect(screen.getByLabelText('安定性ランク A')).toBeInTheDocument()
    expect(screen.getByLabelText('検出状態ランク C')).toBeInTheDocument()
  })

  test('地図とリストを切り替え、リトライできる', async () => {
    const user = userEvent.setup()
    const onRestart = vi.fn()
    renderResultPage(onRestart)

    const mapButton = screen.getByRole('button', { name: '地図' })
    const listButton = screen.getByRole('button', { name: 'リスト' })
    expect(mapButton).toHaveAttribute('aria-pressed', 'true')

    await user.click(listButton)
    expect(listButton).toHaveAttribute('aria-pressed', 'true')
    expect(mapButton).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'リトライ' }))
    expect(onRestart).toHaveBeenCalledOnce()
  })

  test('共有に成功すると共有ボタンが反転状態になる', async () => {
    const user = userEvent.setup()
    const share = vi.fn().mockResolvedValue(undefined)
    const originalShare = navigator.share
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    })

    try {
      renderResultPage()
      await user.click(screen.getByRole('button', { name: '結果を共有' }))

      const sharedButton = await screen.findByRole('button', { name: '共有済み' })
      expect(sharedButton).toHaveAttribute('aria-pressed', 'true')
      expect(sharedButton).toHaveClass('result-actions__share--complete')
      expect(share).toHaveBeenCalledOnce()
    } finally {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: originalShare,
      })
    }
  })

  test('作業時間は途中終了分を含むタイマーログの実測値を表示する', () => {
    saveTimerSession({
      lastObservedAt: 90_500,
      logs: [{ endedAt: 90_500, id: 1, mode: 'focus', startedAt: 0 }],
      sessionId: 'result-test',
      version: 1,
    })

    renderResultPage()

    expect(screen.getByText('00:01:30')).toBeInTheDocument()
  })
})

test.each([
  [100, 'S'],
  [90, 'S'],
  [89, 'A'],
  [70, 'A'],
  [69, 'B'],
  [50, 'B'],
  [49, 'C'],
  [0, 'C'],
] as const)('スコア%dはランク%sになる', (score, rank) => {
  expect(getScoreRank(score)).toBe(rank)
})
