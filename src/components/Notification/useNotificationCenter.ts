import { useCallback, useState } from 'react'
import type { NotificationEvent } from './notificationTypes.ts'

export function useNotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([])

  const notify = useCallback((event: NotificationEvent) => {
    setNotifications((current) => {
      // 同じidの通知イベントが既に表示中の場合は追加しない。
      if (current.some((notification) => notification.id === event.id)) {
        return current
      }

      return [...current, event]
    })
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id),
    )
  }, [])

  return { dismiss, notifications, notify }
}
