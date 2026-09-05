import {
  FilesetResolver,
  PoseLandmarker,
} from '@mediapipe/tasks-vision'
import { useEffect, type RefObject } from 'react'
import { calculateScore } from '../scoring/calculateScore.ts'
import type { ScoreResult } from '../scoring/scoreTypes.ts'
import type { PoseFrame } from './poseTypes.ts'

const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const ANALYSIS_INTERVAL_MS = 200
const SCORE_WINDOW_MS = 3 * 60 * 1_000

type PoseScoringOptions = {
  enabled: boolean
  onError: (message: string) => void
  onResult: (result: ScoreResult) => void
  onReady: () => void
  videoRef: RefObject<HTMLVideoElement | null>
}

export function usePoseScoring({
  enabled,
  onError,
  onReady,
  onResult,
  videoRef,
}: PoseScoringOptions) {
  useEffect(() => {
    if (!enabled) return

    let animationFrameId = 0
    let disposed = false
    let lastAnalysisAt = 0
    let lastVideoTime = -1
    let scoreWindowStartedAt: number | null = null
    let poseLandmarker: PoseLandmarker | null = null
    const frames: PoseFrame[] = []

    const analyzeFrame = (timestampMs: number) => {
      if (disposed) return

      const video = videoRef.current
      const canAnalyze =
        video &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.currentTime !== lastVideoTime &&
        timestampMs - lastAnalysisAt >= ANALYSIS_INTERVAL_MS

      if (canAnalyze && poseLandmarker) {
        lastAnalysisAt = timestampMs
        lastVideoTime = video.currentTime

        try {
          const detection = poseLandmarker.detectForVideo(video, timestampMs)
          const landmarks = detection.landmarks[0] ?? []

          // MediaPipeの正規化ランドマークを、既存の採点処理が扱うフレーム型へ変換する。
          frames.push({
            landmarks: landmarks.map(({ visibility, x, y, z }) => ({
              visibility,
              x,
              y,
              z,
            })),
            timestampMs,
          })

          scoreWindowStartedAt ??= timestampMs

          // 3分区間が完了するまでは評価を公開せず、完了時に平均スコアを一度だけ通知する。
          if (timestampMs - scoreWindowStartedAt >= SCORE_WINDOW_MS) {
            onResult(calculateScore(frames))
            frames.length = 0
            scoreWindowStartedAt = null
          }
        } catch {
          onError('カメラ映像の解析中にエラーが発生しました。')
          return
        }
      }

      animationFrameId = requestAnimationFrame(analyzeFrame)
    }

    const prepareLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_PATH },
          numPoses: 1,
          outputSegmentationMasks: false,
          runningMode: 'VIDEO',
        })

        if (disposed) {
          landmarker.close()
          return
        }

        poseLandmarker = landmarker
        onReady()
        animationFrameId = requestAnimationFrame(analyzeFrame)
      } catch {
        if (!disposed) {
          onError('姿勢解析モデルを読み込めませんでした。通信状況を確認してください。')
        }
      }
    }

    void prepareLandmarker()

    return () => {
      disposed = true
      cancelAnimationFrame(animationFrameId)
      poseLandmarker?.close()
    }
  }, [enabled, onError, onReady, onResult, videoRef])
}
