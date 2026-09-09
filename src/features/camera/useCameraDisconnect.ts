import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { watchCameraStream } from './cameraStreamMonitor.ts'

// 切断が連続しても表示が積み重ならないよう、カメラ切断の通知idは固定にする。
export const CAMERA_DISCONNECTED_TOAST_ID = 'camera-disconnected'

export const CAMERA_DISCONNECTED_MESSAGE =
  'カメラが切断されました。接続を確認して、カメラを再取得してください。'

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
    toast.dismiss(CAMERA_DISCONNECTED_TOAST_ID)

    // 監視対象はストリームだけに依存させ、コールバックの再生成で二重登録しない。
    return watchCameraStream({
      onDisconnect: () => {
        toast.error('カメラが切断されました', {
          description: CAMERA_DISCONNECTED_MESSAGE,
          id: CAMERA_DISCONNECTED_TOAST_ID,
        })
        onDisconnectRef.current()
      },
      stream,
    })
  }, [stream])
}
