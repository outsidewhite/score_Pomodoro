import { Notification } from './Notification.tsx'
import type { NotificationEvent } from './notificationTypes.ts'
import './NotificationCenter.css'

type NotificationCenterProps = {
  notifications: NotificationEvent[]
  onDismiss: (id: string) => void
}

export function NotificationCenter({
  notifications,
  onDismiss,
}: NotificationCenterProps) {
  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="notification-center" aria-label="通知">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onClose={onDismiss}
        />
      ))}
    </div>
  )
}
