import { useEffect, useRef } from 'react'
import {
  dismissCameraDisconnectedNotification,
  showCameraDisconnectedNotification,
} from '../../components/Notification/AppToaster.tsx'
import { watchCameraStream } from './cameraStreamMonitor.ts'

// 画面内のエラー表示でも同じ文面を使えるよう、通知の集約元から再公開する。
export { CAMERA_DISCONNECTED_MESSAGE } from '../../components/Notification/AppToaster.tsx'

type UseCameraDisconnectOptions = {
  onDisconnect: () => void
  stream: MediaStream | null
}

/**
 * 計測中のカメラストリーム切断を検知し、通知したうえで呼び出し元へ停止を依頼する。
 */
export function useCameraDisconnect({
  onDisconnect,
  stream,
}: UseCameraDisconnectOptions) {
  const onDisconnectRef = useRef(onDisconnect)

  useEffect(() => {
    onDisconnectRef.current = onDisconnect
  }, [onDisconnect])

  useEffect(() => {
    if (!stream) return

    // 新しいストリームを監視し始めた時点で、前回の切断通知を閉じる。
    dismissCameraDisconnectedNotification()

    // 監視対象はストリームだけに依存させ、コールバックの再生成で二重登録しない。
    return watchCameraStream({
      onDisconnect: () => {
        showCameraDisconnectedNotification()
        onDisconnectRef.current()
      },
      stream,
    })
  }, [stream])
}
