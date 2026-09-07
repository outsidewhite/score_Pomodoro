import type { KeyboardEvent } from 'react'
import type { NotificationEvent } from './notificationTypes.ts'
import './Notification.css'

type NotificationProps = {
  notification: NotificationEvent
  onClose: (id: string) => void
}

const VARIANT_LABEL: Record<NotificationEvent['variant'], string> = {
  error: 'エラー',
  info: 'お知らせ',
  success: '完了',
  warning: '警告',
}

export function Notification({ notification, onClose }: NotificationProps) {
  const { id, message, title, variant } = notification
  const isUrgent = variant === 'error' || variant === 'warning'

  const handleClose = () => {
    onClose(id)
  }

  // フォーカスが通知内にある間は、Escapeキーでも閉じられるようにする。
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      handleClose()
    }
  }

  return (
    <div
      className={`notification notification--${variant}`}
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
      onKeyDown={handleKeyDown}
    >
      <span className="notification__label" aria-hidden="true">
        {VARIANT_LABEL[variant]}
      </span>
      <div className="notification__body">
        <strong className="notification__title">{title}</strong>
        <p className="notification__message">{message}</p>
      </div>
      <button
        type="button"
        className="notification__close"
        aria-label="通知を閉じる"
        onClick={handleClose}
      >
        ×
      </button>
    </div>
  )
}
