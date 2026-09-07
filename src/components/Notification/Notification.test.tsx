import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { Notification } from './Notification.tsx'
import { NotificationCenter } from './NotificationCenter.tsx'
import type { NotificationEvent } from './notificationTypes.ts'
import { useNotificationCenter } from './useNotificationCenter.ts'

function createNotification(
  overrides: Partial<NotificationEvent> = {},
): NotificationEvent {
  return {
    id: 'test-notification',
    message: '通知本文のメッセージです。',
    title: '通知タイトル',
    variant: 'info',
    ...overrides,
  }
}

describe('Notification', () => {
  test('タイトル・メッセージ・閉じる操作が表示される', () => {
    render(
      <Notification notification={createNotification()} onClose={() => {}} />,
    )

    expect(screen.getByText('通知タイトル')).toBeInTheDocument()
    expect(screen.getByText('通知本文のメッセージです。')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '通知を閉じる' }),
    ).toBeInTheDocument()
  })

  test('通知の種類に応じてARIA属性と見た目のクラスが切り替わる', () => {
    const { rerender } = render(
      <Notification
        notification={createNotification({ variant: 'info' })}
        onClose={() => {}}
      />,
    )
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('status')).toHaveClass('notification--info')

    rerender(
      <Notification
        notification={createNotification({ variant: 'error' })}
        onClose={() => {}}
      />,
    )
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
    expect(screen.getByRole('alert')).toHaveClass('notification--error')
  })

  test('閉じる操作を行うと、閉じるためのコールバックが呼ばれる', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Notification
        notification={createNotification({ id: 'close-target' })}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: '通知を閉じる' }))

    expect(onClose).toHaveBeenCalledWith('close-target')
  })

  test('キーボード操作(Escape)で通知を閉じられる', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Notification
        notification={createNotification({ id: 'keyboard-target' })}
        onClose={onClose}
      />,
    )

    await user.tab()
    expect(screen.getByRole('button', { name: '通知を閉じる' })).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledWith('keyboard-target')
  })
})

describe('NotificationCenter', () => {
  test('閉じる操作を行うと通知が非表示になる', async () => {
    const user = userEvent.setup()

    function Wrapper() {
      const { dismiss, notifications, notify } = useNotificationCenter()
      return (
        <>
          <button
            type="button"
            onClick={() =>
              notify(createNotification({ id: 'dismiss-target' }))
            }
          >
            通知を発生させる
          </button>
          <NotificationCenter notifications={notifications} onDismiss={dismiss} />
        </>
      )
    }

    render(<Wrapper />)

    await user.click(screen.getByText('通知を発生させる'))
    expect(screen.getByText('通知タイトル')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '通知を閉じる' }))
    expect(screen.queryByText('通知タイトル')).not.toBeInTheDocument()
  })

  test('通知が0件のときは何も描画しない', () => {
    const { container } = render(
      <NotificationCenter notifications={[]} onDismiss={() => {}} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})

describe('useNotificationCenter', () => {
  test('同じidの通知イベントは重複して追加されない', () => {
    const { result } = renderHook(() => useNotificationCenter())

    act(() => {
      result.current.notify(createNotification({ id: 'duplicate-id' }))
      result.current.notify(
        createNotification({ id: 'duplicate-id', message: '別のメッセージ' }),
      )
    })

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0]?.message).toBe(
      '通知本文のメッセージです。',
    )
  })

  test('idが異なる通知イベントは両方とも追加される', () => {
    const { result } = renderHook(() => useNotificationCenter())

    act(() => {
      result.current.notify(createNotification({ id: 'first' }))
      result.current.notify(createNotification({ id: 'second' }))
    })

    expect(result.current.notifications).toHaveLength(2)
  })

  test('dismissを呼ぶと該当する通知だけが取り除かれる', () => {
    const { result } = renderHook(() => useNotificationCenter())

    act(() => {
      result.current.notify(createNotification({ id: 'first' }))
      result.current.notify(createNotification({ id: 'second' }))
    })

    act(() => {
      result.current.dismiss('first')
    })

    expect(result.current.notifications.map((n) => n.id)).toEqual(['second'])
  })
})
