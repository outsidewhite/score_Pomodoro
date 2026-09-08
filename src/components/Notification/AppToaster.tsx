import { Toaster } from 'sonner'

// 通知の表示時間。エラー内容を読み切れるよう、既定より長めにする。
const NOTIFICATION_DURATION_MS = 6000

/**
 * アプリ共通の通知(トースト)表示領域。
 *
 * アプリのルート付近に一度だけ配置し、各画面や機能からは `sonner` の
 * `toast.success()` / `toast.error()` などを呼び出して通知する。
 * 表示位置やアクセシビリティ設定をここへ集約し、画面ごとの重複実装を避ける。
 */
export function AppToaster() {
  return (
    <Toaster
      closeButton
      richColors
      containerAriaLabel="通知"
      duration={NOTIFICATION_DURATION_MS}
      position="top-right"
      toastOptions={{ closeButtonAriaLabel: '通知を閉じる' }}
    />
  )
}
