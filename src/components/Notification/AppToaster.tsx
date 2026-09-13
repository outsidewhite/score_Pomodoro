/* oxlint-disable react/only-export-components */
// 通知の定義・操作関数・表示領域をAppToasterへ集約する要件のため、同じファイルから公開する。
import { useState } from 'react'
import { Toaster, toast, type ExternalToast } from 'sonner'
import alarmSoundUrl from './alarm.mp3'
import infoSoundUrl from './info.mp3'
import successSoundUrl from './success.mp3'
import warningSoundUrl from './warning.mp3'
import './AppToaster.css'

export const NOTIFICATION_DURATION_MS = 6000
export const CAMERA_DISCONNECTED_MESSAGE =
  'カメラが切断されました。接続を確認して、カメラを再取得してください。'

const NOTIFICATION_SOUND_STORAGE_KEY =
  'score-pomodoro:notification-sound-enabled'
const SAME_NOTIFICATION_SOUND_INTERVAL_MS = 1000

type NotificationSound = 'alarm' | 'info' | 'success' | 'warning'
type NotificationType = 'error' | 'info' | 'loading' | 'success' | 'warning'

type NotificationDefinition = {
  readonly description?: string
  readonly duration?: number
  readonly id: string
  readonly sound?: NotificationSound
  readonly title: string
  readonly type: NotificationType
}

// 通知の固定文面と表示方法を一箇所で管理し、呼び出し元へSonnerの詳細を漏らさない。
const NOTIFICATIONS = {
  analysisError: {
    id: 'pose-analysis-error',
    sound: 'warning',
    title: '姿勢解析でエラーが発生しました',
    type: 'error',
  },
  awayDetected: {
    id: 'auto-away',
    sound: 'warning',
    title: '離席を検出したためタイマーを停止しました',
    type: 'warning',
  },
  breakEndingSoon: {
    id: 'break-ending-soon',
    sound: 'alarm',
    title: '休憩終了まであと1分です',
    type: 'info',
  },
  calibrationRetry: {
    id: 'posture-calibration',
    title: '基準姿勢を取得できなかったため、次の1分で再試行します',
    type: 'warning',
  },
  calibrationSuccess: {
    id: 'posture-calibration',
    title: '基準姿勢を保存しました',
    type: 'success',
  },
  cameraDisconnected: {
    description: CAMERA_DISCONNECTED_MESSAGE,
    id: 'camera-disconnected',
    sound: 'warning',
    title: 'カメラが切断されました',
    type: 'error',
  },
  focusDrop: {
    duration: Infinity,
    id: 'focus-drop',
    sound: 'alarm',
    title: '集中力が落ちてきているようです。休憩を検討しましょう',
    type: 'info',
  },
  modelLoadError: {
    duration: Infinity,
    id: 'pose-model-load',
    sound: 'warning',
    title: 'モデルの読み込みに失敗しました',
    type: 'error',
  },
  modelLoading: {
    duration: Infinity,
    id: 'pose-model-load',
    title: 'モデル読み込み中です',
    type: 'loading',
  },
  modelReady: {
    id: 'pose-model-load',
    sound: 'success',
    title: '読み込みに成功しました！',
    type: 'success',
  },
  targetReached: {
    id: 'target-time-reached',
    sound: 'success',
    title: '目標時間を達成しました！',
    type: 'success',
  },
} as const satisfies Record<string, NotificationDefinition>

const NOTIFICATION_SOUND_URLS: Record<NotificationSound, string> = {
  alarm: alarmSoundUrl,
  info: infoSoundUrl,
  success: successSoundUrl,
  warning: warningSoundUrl,
}

const lastSoundAtByNotificationId = new Map<string, number>()
let notificationSoundEnabledFallback = true

function isNotificationSoundEnabled() {
  try {
    const storedValue = window.localStorage.getItem(
      NOTIFICATION_SOUND_STORAGE_KEY,
    )
    return storedValue === null
      ? notificationSoundEnabledFallback
      : storedValue !== 'false'
  } catch {
    // 保存領域を利用できない場合はメモリ上の設定で動作する。
    return notificationSoundEnabledFallback
  }
}

function saveNotificationSoundEnabled(enabled: boolean) {
  notificationSoundEnabledFallback = enabled
  try {
    window.localStorage.setItem(
      NOTIFICATION_SOUND_STORAGE_KEY,
      String(enabled),
    )
  } catch {
    // 保存に失敗した場合はメモリ上の設定を使って操作を継続する。
  }
}

function playNotificationSound(sound: NotificationSound, id: string) {
  if (!isNotificationSoundEnabled()) return

  const now = Date.now()
  const lastPlayedAt = lastSoundAtByNotificationId.get(id)
  if (
    lastPlayedAt !== undefined &&
    now - lastPlayedAt < SAME_NOTIFICATION_SOUND_INTERVAL_MS
  ) {
    return
  }
  lastSoundAtByNotificationId.set(id, now)

  try {
    const audio = new Audio(NOTIFICATION_SOUND_URLS[sound])
    audio.volume = 0.35
    void audio.play().catch(() => {
      // 自動再生制限などで再生できなくても、通知表示と計測は継続する。
    })
  } catch {
    // Audio APIを利用できない環境でも、通知表示は継続する。
  }
}

function showNotification(
  definition: NotificationDefinition,
  options: ExternalToast = {},
) {
  const toastOptions: ExternalToast = {
    ...options,
    description: options.description ?? definition.description,
    duration: definition.duration ?? NOTIFICATION_DURATION_MS,
    id: definition.id,
  }

  switch (definition.type) {
    case 'error':
      toast.error(definition.title, toastOptions)
      break
    case 'info':
      toast.info(definition.title, toastOptions)
      break
    case 'loading':
      toast.loading(definition.title, toastOptions)
      break
    case 'success':
      toast.success(definition.title, toastOptions)
      break
    case 'warning':
      toast.warning(definition.title, toastOptions)
      break
  }

  if (definition.sound) {
    playNotificationSound(definition.sound, definition.id)
  }
}

function dismissNotification(id: string) {
  toast.dismiss(id)
}

export function showModelLoadingNotification() {
  showNotification(NOTIFICATIONS.modelLoading)
}

export function showModelReadyNotification() {
  showNotification(NOTIFICATIONS.modelReady)
}

export function showModelLoadErrorNotification(
  message: string,
  onReload: () => void,
) {
  showNotification(NOTIFICATIONS.modelLoadError, {
    action: {
      label: '再読み込み',
      onClick: onReload,
    },
    description: message,
  })
}

export function showAnalysisErrorNotification(message: string) {
  showNotification(NOTIFICATIONS.analysisError, { description: message })
}

export function dismissAnalysisErrorNotification() {
  dismissNotification(NOTIFICATIONS.analysisError.id)
}

export function showAwayDetectedNotification() {
  showNotification(NOTIFICATIONS.awayDetected)
}

export function showBreakEndingSoonNotification() {
  showNotification(NOTIFICATIONS.breakEndingSoon)
}

export function showCalibrationRetryNotification() {
  showNotification(NOTIFICATIONS.calibrationRetry)
}

export function showCalibrationSuccessNotification() {
  showNotification(NOTIFICATIONS.calibrationSuccess)
}

export function showTargetReachedNotification() {
  showNotification(NOTIFICATIONS.targetReached)
}

export function showFocusDropNotification(onBreakRequest: () => void) {
  showNotification(NOTIFICATIONS.focusDrop, {
    action: {
      label: '休憩する',
      onClick: onBreakRequest,
    },
  })
}

export function dismissFocusDropNotification() {
  dismissNotification(NOTIFICATIONS.focusDrop.id)
}

export function showCameraDisconnectedNotification() {
  showNotification(NOTIFICATIONS.cameraDisconnected)
}

export function dismissCameraDisconnectedNotification() {
  dismissNotification(NOTIFICATIONS.cameraDisconnected.id)
}

export function dismissMeasurementNotifications() {
  dismissNotification(NOTIFICATIONS.modelLoading.id)
  dismissNotification(NOTIFICATIONS.analysisError.id)
}

export function dismissAllNotifications() {
  toast.dismiss()
  lastSoundAtByNotificationId.clear()
}

/**
 * アプリ共通の通知表示領域と通知音設定。
 *
 * 通知を追加・変更する場合はこのファイルへ定義と用途別関数を追加し、
 * 各画面や機能からは公開関数だけを呼び出す。
 */
export function AppToaster() {
  const [soundEnabled, setSoundEnabled] = useState(isNotificationSoundEnabled)

  const handleSoundToggle = () => {
    const nextSoundEnabled = !soundEnabled
    saveNotificationSoundEnabled(nextSoundEnabled)
    setSoundEnabled(nextSoundEnabled)

    if (nextSoundEnabled) {
      playNotificationSound('info', 'notification-sound-preview')
    }
  }

  return (
    <>
      <Toaster
        closeButton
        richColors
        containerAriaLabel="通知"
        duration={NOTIFICATION_DURATION_MS}
        position="bottom-right"
        toastOptions={{ closeButtonAriaLabel: '通知を閉じる' }}
      />
      <button
        className="app-toaster__sound-toggle"
        type="button"
        aria-label={`通知音を${soundEnabled ? 'オフ' : 'オン'}にする`}
        aria-pressed={soundEnabled}
        onClick={handleSoundToggle}
      >
        通知音: {soundEnabled ? 'ON' : 'OFF'}
      </button>
    </>
  )
}
