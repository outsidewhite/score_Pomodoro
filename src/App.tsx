import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import type { CameraStatus, ModelStatus } from './features/camera/cameraTypes.ts'
import { calculateAverageFocusScore, calculateScore } from './features/scoring/calculateScore.ts'
import type { PoseFrame } from './features/pose/poseTypes.ts'
import './App.css'

type AppPage = 'measurement' | 'result' | 'start'

const DEFAULT_SETTINGS: SessionSettings = {
  targetMinutes: 25,
  targetScore: 80,
}

// バックエンド接続前に加算表示を確認するための元スコア。
const PREVIEW_ORIGINAL_SCORE = 1_200

// 結果画面のデザイン確認用データ。実計測との接続時に置き換える。
const PREVIEW_RESULT: ScoreResult = {
  measuredDurationMs: 25 * 60 * 1_000,
  postureScore: 82,
  presenceScore: 91,
  stabilityScore: 76,
  totalScore: 83,
}

function getPageFromPath(): AppPage {
  if (window.location.pathname === '/measurement') {
    return 'measurement'
  }

  if (window.location.pathname === '/result') {
    return 'result'
  }

  return 'start'
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const isMountedRef = useRef(true)
  const lastLogTimeRef = useRef<number | null>(null) // 追加
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [modelErrorMessage, setModelErrorMessage] = useState('')
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [frameHistory, setFrameHistory] = useState<PoseFrame[]>([])

  const focusScore = useMemo(() => {
    if (!analysisResult || analysisResult.people.length === 0) {
      return null
    }

    return calculateScore([
      {
        landmarks: analysisResult.people[0],
        timestampMs: analysisResult.detectedAt,
      },
    ])
  }, [analysisResult])

  const stopAnalysis = () => {
    // 次の解析フレームを取り消し、再開時は同じ映像時刻を再利用しないようにする。
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    lastVideoTimeRef.current = -1
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
      setFrameHistory([])
    }
  }

  const startCamera = async () => {
    setStatus('requesting')
    setErrorMessage('')
    setAnalysisErrorMessage('')
    setAnalysisResult(null)

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
    // ブラウザの戻る・進む操作でも表示ページをURLと同期する。
    const handlePopState = () => setPage(getPageFromPath())
    window.addEventListener('popstate', handlePopState)

    const availablePaths = ['/start', '/measurement', '/result']
    if (!availablePaths.includes(window.location.pathname)) {
      window.history.replaceState(null, '', '/start')
    }

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (frameHistory.length === 0) return

    const now = performance.now()
    const logIntervalMs = 30 * 1_000 // 30秒

    // 最後のログ出力から30秒経過していない場合はスキップ
    if (lastLogTimeRef.current !== null && (now - lastLogTimeRef.current) < logIntervalMs) {
      const remainingTime = logIntervalMs - (now - lastLogTimeRef.current)
      // 30秒経過を待ってから再度実行を試みる
      const timerId = setTimeout(() => {
        // frameHistory が更新されていれば再度useEffectが走るので、
        // ここで直接ログは出力せず、stateに依存して再評価を待つ
      }, remainingTime);
      return () => clearTimeout(timerId);
    }

    const averageResult = calculateAverageFocusScore(frameHistory, undefined, {
      sampleIntervalMs: 180_000,
      evaluationWindowMs: 300_000,
    })

    if (averageResult.results.length > 0) {
      console.log(
        `[3分平均スコア] 総合: ${averageResult.averageTotalScore} (サンプル数: ${averageResult.sampleCount})`,
        averageResult.results.map((r) => ({
          total: r.totalScore,
          posture: r.postureScore,
          stability: r.stabilityScore,
          presence: r.presenceScore,
        })),
      )
      lastLogTimeRef.current = now // ログ出力時刻を更新
    }
  }, [frameHistory])

  useEffect(() => {
    if (status !== 'active' || modelStatus !== 'ready') {
      return
    }

    let analysisCancelled = false
    const analyzeFrame = () => {
      const video = videoRef.current
      const poseLandmarker = poseLandmarkerRef.current

      if (analysisCancelled || !video || !poseLandmarker || !streamRef.current) {
        return
      }

      // video.currentTimeが進んだ場合だけ推論し、同じ映像フレームの重複解析を避ける。
      if (
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.currentTime !== lastVideoTimeRef.current
      ) {
        lastVideoTimeRef.current = video.currentTime

        try {
          const result = poseLandmarker.detectForVideo(video, performance.now())
          // 次回推論で内部結果が更新されても表示値が変わらないよう座標を複製する。
          const people = result.landmarks.map((landmarks) =>
            landmarks.map((landmark) => ({ ...landmark })),
          )
          const detectedAt = performance.now()
          setAnalysisResult({ detectedAt, people })

          if (people.length > 0) {
            const frame: PoseFrame = {
              landmarks: people[0],
              timestampMs: detectedAt,
            }
            setFrameHistory((prev) => {
              const updated = [...prev, frame]
              const maxHistoryMs = 5 * 60 * 1_000
              const cutoff = frame.timestampMs - maxHistoryMs
              return updated.filter((historyFrame) => historyFrame.timestampMs > cutoff)
            })
          }
        } catch (error) {
          setAnalysisErrorMessage(getAnalysisErrorMessage(error))
          return
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(analyzeFrame)
    }

    animationFrameRef.current = window.requestAnimationFrame(analyzeFrame)

  const handleFinish = () => {
    window.history.pushState(null, '', '/result')
    setPage('result')
  }

  const handleRestart = () => {
    window.history.pushState(null, '', '/start')
    setPage('start')
  }

  const focusSummary = useMemo(() => {
    if (!focusScore) {
      return null
    }

    return [
      { label: '総合', value: focusScore.totalScore },
      { label: '姿勢', value: focusScore.postureScore },
      { label: '安定性', value: focusScore.stabilityScore },
      { label: '検出状態', value: focusScore.presenceScore },
    ]
  }, [focusScore])

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
          <p className="eyebrow">POSE ANALYSIS</p>
          <h1 id="camera-title">姿勢ランドマークを解析</h1>
          <p>
            カメラ映像をMediaPipe Tasks Visionでリアルタイム解析し、
            検出した人物と各ランドマークの座標を表示します。
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
              <p className="analysis-kicker">DEBUG OUTPUT</p>
              <h2 id="analysis-title">解析結果</h2>
            </div>
            <span className={`model-badge model-badge--${modelStatus}`}>
              <span aria-hidden="true" />
              {modelStatusLabel[modelStatus]}
            </span>
          </div>

          <div className="landmark-explanation">
            <p>
              <strong>ランドマーク番号の見方</strong>
              表の「部位」列で各番号が表す身体の位置を確認できます。
            </p>
            <details>
              <summary>0〜32の番号一覧を表示</summary>
              <ol className="landmark-guide-list">
                {POSE_LANDMARK_NAMES.map((name, index) => (
                  <li key={name}>
                    <span>{index}</span>
                    {name}
                  </li>
                ))}
              </ol>
            </details>
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
              <span>カメラを起動すると、ここにランドマークの解析値が表示されます。</span>
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
              <div className="detection-summary" aria-live="polite">
                <span>検出した人数</span>
                <strong>{analysisResult.people.length}人</strong>
                <small>更新: {Math.round(analysisResult.detectedAt)} ms</small>
              </div>

              {focusSummary && (
                <div className="score-summary" aria-live="polite">
                  <div className="score-summary__header">
                    <span>最終集中スコア</span>
                    <strong>{focusScore!.totalScore}</strong>
                  </div>

                  <div className="score-summary__grid">
                    {focusSummary.map(({ label, value }) => (
                      <div key={label} className="score-summary__item">
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysisResult.people.length === 0 ? (
                <div className="no-detection">
                  <strong>検出なし</strong>
                  <span>カメラに全身が映る位置へ移動してください。</span>
                </div>
              ) : (
                <div className="people-list">
                  {analysisResult.people.map((landmarks, personIndex) => (
                    <details className="person-result" open key={personIndex}>
                      <summary>
                        <span>人物 {personIndex + 1}</span>
                        <small>{landmarks.length}ランドマーク</small>
                      </summary>
                      <div className="landmark-table-wrap">
                        <table className="landmark-table">
                          <thead>
                            <tr>
                              <th scope="col">番号</th>
                              <th scope="col">部位</th>
                              <th scope="col">X</th>
                              <th scope="col">Y</th>
                              <th scope="col">Z</th>
                              <th scope="col">visibility</th>
                            </tr>
                          </thead>
                          <tbody>
                            {landmarks.map((landmark, landmarkIndex) => (
                              <tr key={landmarkIndex}>
                                <th scope="row">{landmarkIndex}</th>
                                <td className="landmark-name">
                                  {POSE_LANDMARK_NAMES[landmarkIndex] ?? '不明'}
                                </td>
                                <td>{formatCoordinate(landmark.x)}</td>
                                <td>{formatCoordinate(landmark.y)}</td>
                                <td>{formatCoordinate(landmark.z)}</td>
                                <td>{formatCoordinate(landmark.visibility)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ))}
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
