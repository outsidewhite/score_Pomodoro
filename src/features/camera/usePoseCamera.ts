import { useCallback, useEffect, useRef, useState } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { AnalysisResult } from '../../types/pose'
import type { CameraStatus, ModelStatus } from './types'

const MEDIAPIPE_WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const POSE_LANDMARKER_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'

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

export function usePoseCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const isMountedRef = useRef(true)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [modelErrorMessage, setModelErrorMessage] = useState('')
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  const stopAnalysis = useCallback(() => {
    // 次の解析フレームを取り消し、再開時は同じ映像時刻を再利用しないようにする。
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    lastVideoTimeRef.current = -1
  }, [])

  const stopCamera = useCallback(() => {
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
    }
  }, [stopAnalysis])

  const startCamera = useCallback(async () => {
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
  }, [])

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
  }, [stopAnalysis])

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

      // 映像時刻が進んだ場合だけ推論し、同じフレームの重複解析を避ける。
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
          setAnalysisResult({ detectedAt: performance.now(), people })
        } catch (error) {
          setAnalysisErrorMessage(getAnalysisErrorMessage(error))
          return
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(analyzeFrame)
    }

    animationFrameRef.current = window.requestAnimationFrame(analyzeFrame)

    return () => {
      analysisCancelled = true
      stopAnalysis()
    }
  }, [modelStatus, status, stopAnalysis])

  return {
    analysisErrorMessage,
    analysisResult,
    errorMessage,
    modelErrorMessage,
    modelStatus,
    startCamera,
    status,
    stopCamera,
    videoRef,
  }
}
