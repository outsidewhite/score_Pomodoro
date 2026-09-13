import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createJourney } from '../../features/trip/createJourney.ts'
import { ScoreJourney } from './ScoreJourney.tsx'

describe('ScoreJourney', () => {
  const journey = createJourney(() => 0)

  it('獲得スコアは反映時だけ通知し、空欄・負数・小数を拒否する', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ScoreJourney journey={journey} motionState="score2" score={3}
      earnedScore={3} onDebugEarnedScoreChange={onChange} />)
    const input = screen.getByRole('spinbutton', { name: '獲得スコア' })
    const apply = screen.getByRole('button', { name: '反映' })

    // 未確定の入力や無効値で旅の位置が変わらないことを確認する。
    await user.clear(input)
    expect(apply).toBeDisabled()
    for (const value of ['-1', '1.5', '9007199254740992']) {
      await user.type(input, value)
      expect(apply).toBeDisabled()
      await user.click(apply)
      await user.clear(input)
    }
    await user.type(input, '900')
    expect(onChange).not.toHaveBeenCalled()
    await user.click(apply)
    expect(onChange).toHaveBeenLastCalledWith(900)

    await user.clear(input)
    await user.type(input, '0{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(0)
    await user.click(screen.getByRole('button', { name: '実測に戻す' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it.each([
    [0, '日本ステージ', /^日本を走る車/],
    [360, '世界ステージ', /^世界を巡る飛行機/],
    [900, '宇宙ステージ', /^宇宙を進む宇宙船/],
  ] as const)('%i点では%sのアニメーションを表示する', (score, stageName, sceneName) => {
    render(<ScoreJourney journey={journey} motionState="score2" score={score} />)

    expect(screen.getByText(stageName)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: sceneName })).toBeInTheDocument()
  })

  it('デバッグボタンでスコアを変えずに各アニメーションへ切り替えられる', async () => {
    const user = userEvent.setup()
    render(<ScoreJourney journey={journey} motionState="score2" score={0} />)

    await user.click(screen.getByRole('button', { name: '飛行機' }))
    expect(screen.getByRole('img', { name: /^世界を巡る飛行機/ })).toBeInTheDocument()
    expect(screen.getByText('世界ステージ')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '宇宙船' }))
    expect(screen.getByRole('img', { name: /^宇宙を進む宇宙船/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '表示を自動' }))
    expect(screen.getByRole('img', { name: /^日本を走る車/ })).toBeInTheDocument()
  })

  it('デバッグボタンで動きの状態と案内文を切り替えられる', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ScoreJourney journey={journey} motionState="score2" score={0} />,
    )

    await user.click(screen.getByRole('button', { name: '3点' }))
    expect(screen.getByText('快調に移動中')).toBeInTheDocument()
    expect(container.querySelector('.score-journey__scene--motion-score3'))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '停止' }))
    expect(screen.getByText('停止中')).toBeInTheDocument()
    expect(container.querySelector('.score-journey__scene--motion-idle'))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '動きを自動' }))
    expect(screen.getByText('順調に移動中')).toBeInTheDocument()
  })

  it.each([
    [0, 'idle', /^日本のコンビニで停車中/],
    [360, 'idle', /^世界ステージの空港で停止中/],
    [900, 'idle', /^宇宙空間を漂って停止中/],
    [0, 'break', /^日本のホテルでひと休み/],
    [360, 'break', /^世界の空港ラウンジで休憩中/],
    [900, 'break', /^宇宙ポッド室内で休憩中/],
  ] as const)('%s点の%s状態では専用シーンを表示する', (score, motionState, sceneName) => {
    render(
      <ScoreJourney
        journey={journey}
        motionState={motionState}
        score={score}
      />,
    )

    expect(screen.getByRole('img', { name: sceneName })).toBeInTheDocument()
  })

  it.each([0, 360, 900])('%i点でも準備中は自宅の独立ステージを表示する', (score) => {
    const { container } = render(
      <ScoreJourney journey={journey} motionState="preparing" score={score} />,
    )

    expect(screen.getByText('準備ステージ')).toBeInTheDocument()
    expect(screen.getByText('自宅')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^自宅で作業の準備中/ }))
      .toBeInTheDocument()
    expect(container.querySelector('.score-journey__progress')).not
      .toBeInTheDocument()
  })

  it('45点の目的地境界を越えた場合だけ到着演出を開始する', async () => {
    const { container, rerender } = render(
      <ScoreJourney journey={journey} motionState="score2" score={44} />,
    )
    const scene = container.querySelector('.score-journey__scene')
    expect(scene).not.toHaveClass('score-journey__scene--arrival')

    rerender(
      <ScoreJourney journey={journey} motionState="score2" score={45} />,
    )
    await waitFor(() =>
      expect(scene).toHaveClass('score-journey__scene--arrival'),
    )

    // 同じスコアの再描画では要素を作り直さず、到着演出を再開しない。
    rerender(
      <ScoreJourney journey={journey} motionState="score2" score={45} />,
    )
    expect(container.querySelector('.score-journey__scene')).toBe(scene)
  })

  it('最後の目的地以降は探索レベルを表示し、レベル更新で到着演出を行わない', async () => {
    const { container, rerender } = render(
      <ScoreJourney journey={journey} motionState="score2" score={1_035} />,
    )
    expect(screen.getByText('探索レベル 1')).toBeInTheDocument()

    rerender(
      <ScoreJourney journey={journey} motionState="score2" score={1_080} />,
    )
    await screen.findByText('探索レベル 2')
    expect(container.querySelector('.score-journey__scene')).not.toHaveClass(
      'score-journey__scene--arrival',
    )
  })
})
