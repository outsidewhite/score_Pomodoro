// 通知の種類に応じて見た目(色・アイコン・ARIAの緊急度)を切り替えるための区分。
export type NotificationVariant = 'error' | 'info' | 'success' | 'warning'

export type NotificationEvent = {
  // 同じ事象からの再通知を重複表示しないための識別子。
  id: string
  message: string
  title: string
  variant: NotificationVariant
}
