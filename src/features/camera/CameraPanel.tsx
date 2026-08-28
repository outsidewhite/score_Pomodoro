import type { RefObject } from 'react'
import { Button } from '../../components/ui/Button'
import type { CameraStatus } from './types'
import './CameraPanel.css'

type CameraPanelProps = {
  errorMessage: string
  onStart: () => void
  onStop: () => void
  status: CameraStatus
  videoRef: RefObject<HTMLVideoElement | null>
}

export function CameraPanel({
  errorMessage,
  onStart,
  onStop,
  status,
  videoRef,
}: CameraPanelProps) {
  const isActive = status === 'active'
  const isRequesting = status === 'requesting'

  return (
    <div className="camera-column">
      <div className={`preview ${isActive ? 'preview--active' : ''}`}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="解析対象のカメラ映像"
        />
        {!isActive && (
          <div className="preview-placeholder">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 8.5V6.8A1.8 1.8 0 0 0 13.2 5H4.8A1.8 1.8 0 0 0 3 6.8v10.4A1.8 1.8 0 0 0 4.8 19h8.4a1.8 1.8 0 0 0 1.8-1.8v-1.7l4.2 2.6a1.2 1.2 0 0 0 1.8-1V6.9a1.2 1.2 0 0 0-1.8-1L15 8.5Z" />
            </svg>
            <strong>
              {isRequesting ? 'カメラに接続しています' : 'カメラは停止しています'}
            </strong>
            <span>
              {isRequesting
                ? 'ブラウザの確認画面で利用を許可してください'
                : '下のボタンからカメラを起動してください'}
            </span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="error-message" role="alert">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 8v5m0 3h.01M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="controls">
        <Button onClick={onStart} disabled={isActive || isRequesting}>
          {isRequesting ? '接続中…' : 'カメラを起動'}
        </Button>
        <Button variant="secondary" onClick={onStop} disabled={!isActive}>
          カメラを停止
        </Button>
      </div>

      <p className="privacy-note">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 5 6v5c0 4.6 2.9 8.7 7 10 4.1-1.3 7-5.4 7-10V6l-7-3Z" />
          <path d="m9.5 12 1.6 1.6 3.7-4" />
        </svg>
        カメラ映像と解析値はお使いのブラウザ内でのみ処理されます
      </p>
    </div>
  )
}
