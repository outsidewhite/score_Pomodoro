import { useEffect, useRef, useState } from 'react'
import './App.css'

type CameraStatus = 'idle' | 'requesting' | 'active' | 'error'

const cameraStatusLabel: Record<CameraStatus, string> = {
  idle: '停止中',
  requesting: '接続中',
  active: '起動中',
  error: 'エラー',
}

function getCameraErrorMessage(error: unknown) {
  if (!(error instanceof DOMException)) {
    return 'カメラを起動できませんでした。時間をおいて再度お試しください。'
  }

  switch (error.name) {
    case 'NotAllowedError':
      return 'カメラの利用が許可されませんでした。ブラウザの設定からカメラを許可してください。'
    case 'NotFoundError':
      return '利用できるカメラが見つかりませんでした。カメラの接続を確認してください。'
    case 'NotReadableError':
      return 'カメラを使用できませんでした。他のアプリがカメラを使用していないか確認してください。'
    default:
      return 'カメラを起動できませんでした。ブラウザの設定やカメラの接続を確認してください。'
  }
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isMountedRef = useRef(true)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const stopCamera = () => {
    // 取得済みの全トラックを停止して、カメラを確実に解放する。
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    if (isMountedRef.current) {
      setStatus('idle')
      setErrorMessage('')
    }
  }

  const startCamera = async () => {
    setStatus('requesting')
    setErrorMessage('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setErrorMessage(
        'このブラウザではカメラを利用できません。ChromeまたはEdgeのlocalhostでお試しください。',
      )
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })

      // 権限確認中にページを離れた場合は、受け取った映像をすぐに停止する。
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setStatus('active')
    } catch (error) {
      if (isMountedRef.current) {
        setStatus('error')
        setErrorMessage(getCameraErrorMessage(error))
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true

    // タブを閉じる・別ページへ移動する場合にもカメラを停止する。
    const releaseCamera = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    window.addEventListener('pagehide', releaseCamera)

    return () => {
      isMountedRef.current = false
      window.removeEventListener('pagehide', releaseCamera)
      releaseCamera()
    }
  }, [])

  const isActive = status === 'active'
  const isRequesting = status === 'requesting'

  return (
    <main className="camera-page">
      <header className="page-header">
        <a className="brand" href="/" aria-label="Score Pomodoro ホーム">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>Score Pomodoro</span>
        </a>
        <span className={`status status--${status}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          カメラ：{cameraStatusLabel[status]}
        </span>
      </header>

      <section className="camera-demo" aria-labelledby="camera-title">
        <div className="intro">
          <p className="eyebrow">CAMERA PREVIEW</p>
          <h1 id="camera-title">カメラ映像を確認</h1>
          <p>
            カメラを起動して、映像が正しく表示されるか確認できます。
            映像は保存・送信されません。
          </p>
        </div>

        <div className={`preview ${isActive ? 'preview--active' : ''}`}>
          <video ref={videoRef} autoPlay muted playsInline aria-label="カメラ映像" />
          {!isActive && (
            <div className="preview-placeholder">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 8.5V6.8A1.8 1.8 0 0 0 13.2 5H4.8A1.8 1.8 0 0 0 3 6.8v10.4A1.8 1.8 0 0 0 4.8 19h8.4a1.8 1.8 0 0 0 1.8-1.8v-1.7l4.2 2.6a1.2 1.2 0 0 0 1.8-1V6.9a1.2 1.2 0 0 0-1.8-1L15 8.5Z" />
              </svg>
              <strong>{isRequesting ? 'カメラに接続しています' : 'カメラは停止しています'}</strong>
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
          <button
            className="button button--primary"
            type="button"
            onClick={startCamera}
            disabled={isActive || isRequesting}
          >
            {isRequesting ? '接続中…' : 'カメラを起動'}
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={stopCamera}
            disabled={!isActive}
          >
            カメラを停止
          </button>
        </div>

        <p className="privacy-note">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 5 6v5c0 4.6 2.9 8.7 7 10 4.1-1.3 7-5.4 7-10V6l-7-3Z" />
            <path d="m9.5 12 1.6 1.6 3.7-4" />
          </svg>
          カメラ映像はお使いのブラウザ内でのみ処理されます
        </p>
      </section>
    </main>
  )
}

export default App