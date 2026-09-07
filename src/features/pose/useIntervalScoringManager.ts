import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { useEffect, useRef, type RefObject } from 'react'
import { IntervalManager } from '../scoring/IntervalManager.ts'
import { DEFAULT_SCORE_CONFIG } from '../scoring/scoreConfig.ts'
import type { ScoreResult } from '../scoring/scoreTypes.ts'
import type { PoseFrame } from './poseTypes.ts'

const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const ANALYSIS_INTERVAL_MS = 200
const INTERVAL_DURATION_MS = 3 * 60 * 1_000 // 3 minutes

type IntervalScoringManagerOptions = {
  enabled: boolean
  timerMode: 'away' | 'break' | 'focus'
  onError: (message: string) => void
  onIntervalCompleted: (result: ScoreResult) => void
  onIntervalDiscarded?: (intervalId: string) => void
  onReady: () => void
  videoRef: RefObject<HTMLVideoElement | null>
}

export function useIntervalScoringManager({
  enabled,
  timerMode,
  onError,
  onIntervalCompleted,
  onIntervalDiscarded,
  onReady,
  videoRef,
}: IntervalScoringManagerOptions) {
  const managerRef = useRef<IntervalManager | null>(null)
  const analysisStateRef = useRef({
    animationFrameId: 0,
    disposed: false,
    lastAnalysisAt: 0,
    lastVideoTime: -1,
    intervalStartedAt: 0,
  })

  useEffect(() => {
    if (!enabled || timerMode !== 'focus') {
      // Discard incomplete interval when focus ends
      if (managerRef.current) {
        const currentInterval = managerRef.current.getCurrentInterval()
        if (currentInterval) {
          managerRef.current.discardCurrentInterval()
          onIntervalDiscarded?.(currentInterval.id)
        }
      }
      return
    }

    const state = analysisStateRef.current
    state.disposed = false
    let poseLandmarker: PoseLandmarker | null = null

    // Initialize IntervalManager if not already done
    if (!managerRef.current) {
      managerRef.current = new IntervalManager(
        { intervalDurationMs: INTERVAL_DURATION_MS },
        {
          onIntervalCompleted: (interval) => {
            if (interval.score) {
              onIntervalCompleted(interval.score)
            }
          },
          onIntervalDiscarded: (interval) => {
            onIntervalDiscarded?.(interval.id)
          },
        },
        DEFAULT_SCORE_CONFIG,
      )
    }

    // Start new interval when entering focus mode
    managerRef.current.startInterval(Date.now())

    const analyzeFrame = (timestampMs: number) => {
      if (state.disposed || !managerRef.current || !poseLandmarker) return

      const video = videoRef.current
      const canAnalyze =
        video &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.currentTime !== state.lastVideoTime &&
        timestampMs - state.lastAnalysisAt >= ANALYSIS_INTERVAL_MS

      if (canAnalyze) {
        state.lastAnalysisAt = timestampMs
        state.lastVideoTime = video.currentTime

        try {
          const detection = poseLandmarker.detectForVideo(video, timestampMs)

          // Extract landmarks from detection
          const landmarks = detection.landmarks && detection.landmarks.length > 0
            ? detection.landmarks[0].map(({ visibility = 0, x, y, z }) => ({
                visibility,
                x,
                y,
                z,
              }))
            : Array.from({ length: 33 }, () => ({
                visibility: 0,
                x: 0,
                y: 0,
                z: 0,
              }))

          const frame: PoseFrame = {
            landmarks,
            timestampMs,
          }

          managerRef.current.addFrame(frame)
        } catch {
          if (!state.disposed) {
            onError('カメラ映像の解析中にエラーが発生しました。')
          }
          return
        }
      }

      state.animationFrameId = requestAnimationFrame(analyzeFrame)
    }

    const initializeLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_PATH },
          numPoses: 1,
          outputSegmentationMasks: false,
          runningMode: 'VIDEO',
        })

        if (state.disposed) {
          landmarker.close()
          return
        }

        poseLandmarker = landmarker
        onReady()
        state.animationFrameId = requestAnimationFrame(analyzeFrame)
      } catch {
        if (!state.disposed) {
          onError('姿勢解析モデルを読み込めませんでした。通信状況を確認してください。')
        }
      }
    }

    void initializeLandmarker()

    return () => {
      state.disposed = true
      cancelAnimationFrame(state.animationFrameId)
      poseLandmarker?.close()

      // Discard incomplete interval when cleanup happens
      if (managerRef.current) {
        const currentInterval = managerRef.current.getCurrentInterval()
        if (currentInterval) {
          managerRef.current.discardCurrentInterval()
          onIntervalDiscarded?.(currentInterval.id)
        }
      }
    }
  }, [enabled, timerMode, onError, onIntervalCompleted, onIntervalDiscarded, onReady, videoRef])
}

export function getIntervalManager(): IntervalManager | null {
  // This is a utility to access the manager from outside for testing/debugging
  // In production, you'd want to manage this differently
  return null
}
