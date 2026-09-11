import {
  act,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  AppToaster,
  dismissAllNotifications,
  dismissAnalysisErrorNotification,
  showAnalysisErrorNotification,
  showAwayDetectedNotification,
  showBreakEndingSoonNotification,
  showCalibrationRetryNotification,
  showCalibrationSuccessNotification,
  showFocusDropNotification,
  showTargetReachedNotification,
} from './AppToaster.tsx'

// 前のテストで残った通知が次のテストへ持ち越されないよう、毎回すべて閉じる。
afterEach(() => {
  vi.useRealTimers()
  dismissAllNotifications()
  window.localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('AppToaster', () => {
  test('用途別関数で発生した通知にタイトル・メッセージ・閉じる操作が表示される', async () => {
    render(<AppToaster />)

    showAnalysisErrorNotification('カメラ映像を取得できませんでした。')

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

    showCalibrationSuccessNotification()

    const title = await screen.findByText('基準姿勢を保存しました')
    // ラベルにはSonnerが通知領域へフォーカスするショートカット(alt+T)が付く。
    const region = screen.getByRole('region', { name: /^通知/ })
    const toaster = region.querySelector('[data-sonner-toaster]')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(toaster).toHaveAttribute('data-x-position', 'right')
    expect(toaster).toHaveAttribute('data-y-position', 'bottom')
    expect(region).toContainElement(title)
  })

  test('閉じる操作を行うと通知が非表示になる', async () => {
    const user = userEvent.setup()
    render(<AppToaster />)

    showAnalysisErrorNotification('カメラ映像を取得できませんでした。')
    const title = await screen.findByText('姿勢解析でエラーが発生しました')

    await user.click(screen.getByRole('button', { name: '通知を閉じる' }))

    await waitForElementToBeRemoved(title)
  })

  test('キーボード操作で通知を閉じられる', async () => {
    const user = userEvent.setup()
    render(<AppToaster />)

    showAnalysisErrorNotification('カメラ映像を取得できませんでした。')
    const title = await screen.findByText('姿勢解析でエラーが発生しました')

    const closeButton = screen.getByRole('button', { name: '通知を閉じる' })
    closeButton.focus()
    expect(closeButton).toHaveFocus()
    await user.keyboard('{Enter}')

    await waitForElementToBeRemoved(title)
  })

  test('同じidの通知イベントは重複表示されず、内容が更新される', async () => {
    render(<AppToaster />)

    showAnalysisErrorNotification('1回目のエラーです。')
    showAnalysisErrorNotification('2回目のエラーです。')

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

    showAwayDetectedNotification()
    showCalibrationSuccessNotification()

    expect(
      await screen.findByText('離席を検出したためタイマーを停止しました'),
    ).toBeInTheDocument()
    expect(await screen.findByText('基準姿勢を保存しました')).toBeInTheDocument()
  })

  test('用途別の終了関数で指定した通知だけを閉じられる', async () => {
    render(<AppToaster />)

    showAnalysisErrorNotification('閉じる対象の通知です。')
    showCalibrationSuccessNotification()
    const target = await screen.findByText('姿勢解析でエラーが発生しました')
    await screen.findByText('基準姿勢を保存しました')

    dismissAnalysisErrorNotification()

    await waitForElementToBeRemoved(target)
    expect(screen.getByText('基準姿勢を保存しました')).toBeInTheDocument()
  })

  test('同じ通知IDの更新では効果音を多重再生しない', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    render(<AppToaster />)

    showAnalysisErrorNotification('1回目のエラーです。')
    showAnalysisErrorNotification('2回目のエラーです。')

    expect(play).toHaveBeenCalledTimes(1)
  })

  test('基準姿勢の保存成功と取得失敗では効果音を再生しない', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    render(<AppToaster />)

    showCalibrationRetryNotification()
    showCalibrationSuccessNotification()

    expect(play).not.toHaveBeenCalled()
  })

  test('目標時間を達成した時は成功通知と成功音を使用する', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    render(<AppToaster />)

    showTargetReachedNotification()

    const message = await screen.findByText('目標時間を達成しました！')
    expect(message.closest('[data-sonner-toast]')).toHaveAttribute(
      'data-type',
      'success',
    )
    expect(play).toHaveBeenCalledTimes(1)
  })

  test('休憩終了1分前は情報通知とalarm音を使用する', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    render(<AppToaster />)

    showBreakEndingSoonNotification()

    const message = await screen.findByText('休憩終了まであと1分です')
    expect(message.closest('[data-sonner-toast]')).toHaveAttribute(
      'data-type',
      'info',
    )
    expect(play).toHaveBeenCalledTimes(1)
  })

  test('集中力低下通知は時間経過では自動終了しない', async () => {
    vi.useFakeTimers()
    render(<AppToaster />)

    act(() => showFocusDropNotification(vi.fn()))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(
      screen.getByText(
        '集中力が落ちてきているようです。休憩を検討しましょう',
      ),
    ).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(60_000))
    expect(
      screen.getByText(
        '集中力が落ちてきているようです。休憩を検討しましょう',
      ),
    ).toBeInTheDocument()
  })

  test('休憩終了1分前と集中力低下はalarm音源を使用する', () => {
    const play = vi.fn().mockResolvedValue(undefined)
    // 実ブラウザと同じくnew Audioで生成できるモックを用意し、選択された音源を検証する。
    const audioConstructor = vi.fn(
      class MockAudio {
        play = play
        volume = 0
      },
    )
    vi.stubGlobal('Audio', audioConstructor)
    render(<AppToaster />)

    showBreakEndingSoonNotification()
    showFocusDropNotification(vi.fn())

    expect(audioConstructor).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('alarm.mp3'),
    )
    expect(audioConstructor).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('alarm.mp3'),
    )
    expect(play).toHaveBeenCalledTimes(2)
  })

  test('通知音をオフにすると設定を保存し、以降の効果音を再生しない', async () => {
    const user = userEvent.setup()
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    render(<AppToaster />)

    await user.click(screen.getByRole('button', { name: '通知音をオフにする' }))
    showAwayDetectedNotification()

    expect(
      window.localStorage.getItem('score-pomodoro:notification-sound-enabled'),
    ).toBe('false')
    expect(play).not.toHaveBeenCalled()
    expect(screen.getByText('通知音: OFF')).toBeInTheDocument()
  })
})
