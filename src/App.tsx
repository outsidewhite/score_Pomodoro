import { useEffect, useRef, useState } from 'react'
import {
  FilesetResolver,
  PoseLandmarker,
} from '@mediapipe/tasks-vision'
import type { CameraStatus, ModelStatus } from './features/camera/cameraTypes.ts'
import type { PoseFrame } from './features/pose/poseTypes.ts'
import { calculateScore } from './features/scoring/calculateScore.ts'
import { DEFAULT_SCORE_CONFIG } from './features/scoring/scoreConfig.ts'
import type { ScoreResult } from './features/scoring/scoreTypes.ts'
import './App.css'

type AnalysisResult = {
  detectedAt: number
  peopleCount: number
  score: ScoreResult
}

const MEDIAPIPE_WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const POSE_LANDMARKER_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'
const SAMPLE_INTERVAL_MS = 3_000
const MIN_EVALUATION_INTERVAL_MS = 3 * 60_000
const MAX_EVALUATION_INTERVAL_MS = 5 * 60_000

const cameraStatusLabel: Record<CameraStatus, string> = {
  idle: '停止中',
  requesting: '接続中',
  active: '起動中',
  error: 'エラー',
}

const modelStatusLabel: Record<ModelStatus, string> = {
  loading: 'モデル読込中',
  ready: 'モデル準備完了',
  error: 'モデルエラー',
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

function getModelErrorMessage(error: unknown) {
  const detail = error instanceof Error ? `（${error.message}）` : ''
  return `姿勢解析モデルを読み込めませんでした。ネットワーク接続を確認してページを再読み込みしてください。${detail}`
}

function getAnalysisErrorMessage(error: unknown) {
  const detail = error instanceof Error ? `（${error.message}）` : ''
  return `映像フレームの解析中にエラーが発生しました。カメラを停止して再度お試しください。${detail}`
}

function createEvaluationIntervalMs() {
  // 判定タイミングを固定せず、3分から5分の範囲で区間ごとに決める。
  return Math.round(
    MIN_EVALUATION_INTERVAL_MS +
      Math.random() *
        (MAX_EVALUATION_INTERVAL_MS - MIN_EVALUATION_INTERVAL_MS),
  )
}

function formatRemainingTime(remainingMs: number) {
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1_000))
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const analysisTimerRef = useRef<number | null>(null)
  const clockTimerRef = useRef<number | null>(null)
  const windowFramesRef = useRef<PoseFrame[]>([])
  const nextEvaluationAtRef = useRef(0)
  const isMountedRef = useRef(true)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [modelErrorMessage, setModelErrorMessage] = useState('')
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [lastCompletedScore, setLastCompletedScore] =
    useState<ScoreResult | null>(null)
  const [completedWindowCount, setCompletedWindowCount] = useState(0)
  const [nextEvaluationAt, setNextEvaluationAt] = useState(0)
  const [clockMs, setClockMs] = useState(0)

  const stopAnalysis = () => {
    // 低頻度解析と残り時間表示の予約をまとめて解除する。
    if (analysisTimerRef.current !== null) {
      window.clearTimeout(analysisTimerRef.current)
      analysisTimerRef.current = null
    }
    if (clockTimerRef.current !== null) {
      window.clearInterval(clockTimerRef.current)
      clockTimerRef.current = null
    }
  }

  const stopCamera = () => {
    stopAnalysis()

    // 取得済みの全トラックを停止して、カメラを確実に解放する。
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    if (isMountedRef.current) {
      setStatus('idle')
      setErrorMessage('')
      setAnalysisErrorMessage('')
      setAnalysisResult(null)
      setLastCompletedScore(null)
      setCompletedWindowCount(0)
      setNextEvaluationAt(0)
    }
    windowFramesRef.current = []
    nextEvaluationAtRef.current = 0
  }

  const startCamera = async () => {
    setStatus('requesting')
    setErrorMessage('')
    setAnalysisErrorMessage('')
    setAnalysisResult(null)
    setLastCompletedScore(null)
    setCompletedWindowCount(0)
    windowFramesRef.current = []
    nextEvaluationAtRef.current = 0

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
    let initializationCancelled = false

    const initializePoseLandmarker = async () => {
      setModelStatus('loading')
      setModelErrorMessage('')

      try {
        // MediaPipeのWasm実行環境とPose Landmarkerモデルを動画解析モードで初期化する。
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH)
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: POSE_LANDMARKER_MODEL_PATH,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 4,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        if (initializationCancelled) {
          poseLandmarker.close()
          return
        }

        poseLandmarkerRef.current = poseLandmarker
        setModelStatus('ready')
      } catch (error) {
        if (!initializationCancelled) {
          setModelStatus('error')
          setModelErrorMessage(getModelErrorMessage(error))
        }
      }
    }

    void initializePoseLandmarker()

    // ページ破棄時にも解析予約とカメラトラックを停止する。
    const releaseCamera = () => {
      stopAnalysis()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    window.addEventListener('pagehide', releaseCamera)

    return () => {
      initializationCancelled = true
      isMountedRef.current = false
      window.removeEventListener('pagehide', releaseCamera)
      releaseCamera()
      poseLandmarkerRef.current?.close()
      poseLandmarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (status !== 'active' || modelStatus !== 'ready') {
      return
    }

    let analysisCancelled = false

    const now = Date.now()
    const initialEvaluationAt = now + createEvaluationIntervalMs()
    nextEvaluationAtRef.current = initialEvaluationAt

    clockTimerRef.current = window.setInterval(() => {
      setClockMs(Date.now())
    }, 1_000)

    const analyzeFrame = () => {
      const video = videoRef.current
      const poseLandmarker = poseLandmarkerRef.current

      if (analysisCancelled || !video || !poseLandmarker || !streamRef.current) {
        return
      }

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          const detectedAt = Date.now()

          // 新しい判定区間へ入る前に、それまでのサンプルを確定結果として保存する。
          if (
            detectedAt >= nextEvaluationAtRef.current &&
            windowFramesRef.current.length > 0
          ) {
            setLastCompletedScore(calculateScore(windowFramesRef.current))
            setCompletedWindowCount((count) => count + 1)
            windowFramesRef.current = []

            const followingEvaluationAt =
              detectedAt + createEvaluationIntervalMs()
            nextEvaluationAtRef.current = followingEvaluationAt
            setNextEvaluationAt(followingEvaluationAt)
          }

          const result = poseLandmarker.detectForVideo(video, performance.now())
          // 最初に検出した人物を採点対象とし、未検出も1サンプルとして残す。
          const frame: PoseFrame = {
            landmarks: (result.landmarks[0] ?? []).map((landmark) => ({
              ...landmark,
            })),
            timestampMs: detectedAt,
          }
          windowFramesRef.current = [...windowFramesRef.current, frame]
          setAnalysisResult({
            detectedAt,
            peopleCount: result.landmarks.length,
            score: calculateScore(windowFramesRef.current),
          })
        } catch (error) {
          setAnalysisErrorMessage(getAnalysisErrorMessage(error))
          stopAnalysis()
          return
        }
      }

      analysisTimerRef.current = window.setTimeout(
        analyzeFrame,
        SAMPLE_INTERVAL_MS,
      )
    }

    analysisTimerRef.current = window.setTimeout(() => {
      setNextEvaluationAt(initialEvaluationAt)
      setClockMs(now)
      analyzeFrame()
    }, 0)

    return () => {
      analysisCancelled = true
      stopAnalysis()
    }
  }, [modelStatus, status])

  const isActive = status === 'active'
  const isRequesting = status === 'requesting'
  const score = analysisResult?.score ?? null
  const remainingEvaluationMs = nextEvaluationAt - clockMs
  const scoreComponents = score
    ? [
        {
          description: '人物が検出できたサンプルの割合',
          label: '在席',
          maxPoints: DEFAULT_SCORE_CONFIG.weights.presence,
          points: score.presencePoints,
        },
        {
          description: '長時間の連続離席がない状態',
          label: '作業継続',
          maxPoints: DEFAULT_SCORE_CONFIG.weights.continuity,
          points: score.continuityPoints,
        },
        {
          description: '上半身の大きな位置変化が少ない状態',
          label: '動作',
          maxPoints: DEFAULT_SCORE_CONFIG.weights.movement,
          points: score.movementPoints,
        },
        {
          description: '胴体がカメラの正面を向いている状態',
          label: '体の向き',
          maxPoints: DEFAULT_SCORE_CONFIG.weights.orientation,
          points: score.orientationPoints,
        },
      ]
    : []

  return (
    <main className="camera-page">
      <header className="page-header">
        <a className="brand" href="/" aria-label="Score Pomodoro ホーム">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>Score Pomodoro</span>
        </a>
        <div className="header-statuses">
          <span className={`status model-status model-status--${modelStatus}`} role="status">
            <span className="status-dot" aria-hidden="true" />
            {modelStatusLabel[modelStatus]}
          </span>
          <span className={`status status--${status}`} role="status">
            <span className="status-dot" aria-hidden="true" />
            カメラ：{cameraStatusLabel[status]}
          </span>
        </div>
      </header>

      <section className="camera-demo" aria-labelledby="camera-title">
        <div className="intro">
          <p className="eyebrow">FOCUS ANALYSIS</p>
          <h1 id="camera-title">集中状態を低頻度で計測</h1>
          <p>
            3秒ごとに姿勢を取得し、3〜5分の判定区間ごとに集中状態を集計します。
          </p>
        </div>

        <div className="workspace-grid">
          <div className="camera-column">
            <div className={`preview ${isActive ? 'preview--active' : ''}`}>
          <video ref={videoRef} autoPlay muted playsInline aria-label="解析対象のカメラ映像" />
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
          カメラ映像と解析値はお使いのブラウザ内でのみ処理されます
            </p>
          </div>

          <section className="analysis-panel" aria-labelledby="analysis-title">
          <div className="analysis-header">
            <div>
              <p className="analysis-kicker">SCORING DEBUG</p>
              <h2 id="analysis-title">配点内訳</h2>
            </div>
            <span className={`model-badge model-badge--${modelStatus}`}>
              <span aria-hidden="true" />
              {modelStatusLabel[modelStatus]}
            </span>
          </div>

          <div className="scoring-policy">
            <strong>70点相当で集中スコア100点</strong>
            <span>体の向きは採点し、下向きや身体の傾きは採点しません。</span>
          </div>

          {modelStatus === 'error' ? (
            <div className="analysis-empty analysis-empty--error" role="alert">
              <strong>モデルの読み込みに失敗しました</strong>
              <span>{modelErrorMessage}</span>
            </div>
          ) : analysisErrorMessage ? (
            <div className="analysis-empty analysis-empty--error" role="alert">
              <strong>解析を停止しました</strong>
              <span>{analysisErrorMessage}</span>
            </div>
          ) : !isActive ? (
            <div className="analysis-empty">
              <strong>解析待機中</strong>
              <span>カメラを起動すると、ここに各要素の配点が表示されます。</span>
            </div>
          ) : modelStatus === 'loading' ? (
            <div className="analysis-empty">
              <span className="loading-spinner" aria-hidden="true" />
              <strong>モデルを読み込んでいます</strong>
              <span>読み込みが完了すると自動的に解析を開始します。</span>
            </div>
          ) : analysisResult === null ? (
            <div className="analysis-empty">
              <span className="loading-spinner" aria-hidden="true" />
              <strong>最初の映像フレームを解析しています</strong>
            </div>
          ) : (
            <div className="analysis-output">
              <div className="score-summary" aria-live="polite">
                <div>
                  <span>現在の暫定スコア</span>
                  <strong>{score?.totalScore ?? 0}</strong>
                  <small>/ 100</small>
                </div>
                <dl>
                  <div>
                    <dt>生の評価</dt>
                    <dd>{score?.rawScore ?? 0} / 100</dd>
                  </div>
                  <div>
                    <dt>サンプル</dt>
                    <dd>{score?.sampleCount ?? 0}件</dd>
                  </div>
                  <div>
                    <dt>次の確定</dt>
                    <dd>{formatRemainingTime(remainingEvaluationMs)}</dd>
                  </div>
                </dl>
              </div>

              <div className="score-components">
                {scoreComponents.map((component) => (
                  <article className="score-component" key={component.label}>
                    <div className="score-component__heading">
                      <div>
                        <strong>{component.label}</strong>
                        <span>{component.description}</span>
                      </div>
                      <p>
                        <strong>{component.points}</strong>
                        <span> / {component.maxPoints}点</span>
                      </p>
                    </div>
                    <progress
                      aria-label={`${component.label}の獲得点`}
                      max={component.maxPoints}
                      value={component.points}
                    />
                  </article>
                ))}
              </div>

              <div className="sampling-status">
                <div>
                  <span className={analysisResult.peopleCount > 0 ? 'is-detected' : ''} />
                  現在の人物検出: {analysisResult.peopleCount > 0 ? 'あり' : 'なし'}
                </div>
                <small>
                  最終取得: {new Date(analysisResult.detectedAt).toLocaleTimeString('ja-JP')}
                </small>
              </div>

              {lastCompletedScore && (
                <div className="completed-score">
                  <span>確定済み区間 {completedWindowCount}</span>
                  <strong>{lastCompletedScore.totalScore}点</strong>
                </div>
              )}
            </div>
          )}
          </section>
        </div>
      </section>
    </main>
  )
}

export default App
