import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import { MeasurementPage } from './MeasurementPage.tsx'

// 姿勢解析はMediaPipeの読み込みを伴うため、表示の確認では動作させない。
vi.mock('../../features/pose/usePoseScoring.ts', () => ({
  usePoseScoring: () => undefined,
}))

beforeAll(() => {
  // jsdomは再生処理を持たないため、プレビュー表示の副作用だけを無効化する。
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
})

function renderMeasurementPage() {
  return render(
    <MeasurementPage
      baseline={null}
      cameraStream={{} as MediaStream}
      elapsedMs={0}
      nextIntervalNumber={1}
      onBaselineChange={vi.fn()}
      onFinish={vi.fn()}
      onScoreUpdate={vi.fn()}
      originalScore={0}
      scoreIncrement={0}
      sessionId="test-session"
      status="measuring"
    />,
  )
}

// ランプ（ヘッダー）とタイマーの表示が、同じ状態を指していることを確認する。
function expectStatus(label: string, tone: string, timerMode: string) {
  const status = screen.getByRole('status')
  expect(status).toHaveTextContent(label)
  expect(status).toHaveClass(`app-header__status--${tone}`)
  expect(screen.getByText(/^\d\d:\d\d:\d\d$/).closest('.session-timer')).toHaveClass(
    `session-timer--${timerMode}`,
  )
}

describe('MeasurementPage', () => {
  test('タイマー開始前は離席中として表示する', () => {
    renderMeasurementPage()

    expectStatus('離席中', 'away', 'away')
  })

  test('タイマーの開始・休憩・停止に合わせて状態表示が切り替わる', async () => {
    const user = userEvent.setup()
    renderMeasurementPage()

    await user.click(screen.getByRole('button', { name: 'タイマーを開始する' }))
    expectStatus('計測中', 'measuring', 'focus')

    await user.click(screen.getByRole('button', { name: '休憩に入る' }))
    expectStatus('休憩中', 'break', 'break')

    await user.click(screen.getByRole('button', { name: '集中に戻る' }))
    expectStatus('計測中', 'measuring', 'focus')

    await user.click(screen.getByRole('button', { name: 'タイマーを停止する' }))
    expectStatus('離席中', 'away', 'away')
  })

  test('計測開始前の状態では計測準備中として表示する', () => {
    render(
      <MeasurementPage
        baseline={null}
        cameraStream={{} as MediaStream}
        elapsedMs={0}
        nextIntervalNumber={1}
        onBaselineChange={vi.fn()}
        onFinish={vi.fn()}
        onScoreUpdate={vi.fn()}
        originalScore={0}
        scoreIncrement={0}
        sessionId="test-session"
        status="preparing"
      />,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('計測準備中')
    expect(status).toHaveClass('app-header__status--setup')
  })
})
