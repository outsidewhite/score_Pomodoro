import {
  FilesetResolver,
  PoseLandmarker,
} from '@mediapipe/tasks-vision'
import { useEffect, useRef, type RefObject } from 'react'
import {
  evaluateAnalysisAvailability,
  initialAnalysisAvailabilityState,
} from '../scoring/analysisAvailability.ts'
import {
  ANALYSIS_INTERVAL_MS,
  calculateScoreInterval,
  getShoulderPose,
  SAMPLES_PER_DETECTION_SEGMENT,
  SAMPLES_PER_INTERVAL,
  SCORE_INTERVAL_MS,
  updateConsecutiveAbsentSegments,
  type FrameEvaluation,
  type PostureBaseline,
  type ScoreIntervalResult,
} from '../scoring/intervalScoring.ts'

const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

type PoseScoringOptions = {
  enabled: boolean
  initialBaseline: PostureBaseline | null
  initialIntervalNumber: number
  onAnalysisUnavailable: () => void
  onAwayDetected: () => void
  onBaselineChange: (baseline: PostureBaseline) => void
  onError: (message: string) => void
  onIntervalComplete: (result: ScoreIntervalResult) => void
  onModelLoadError: (message: string) => void
  onModelLoadStart: () => void
  onModelReady: () => void
  reloadRequest: number
  sessionId: string
  videoRef: RefObject<HTMLVideoElement | null>
}

export function usePoseScoring({
  enabled,
  initialBaseline,
  initialIntervalNumber,
  onAnalysisUnavailable,
  onAwayDetected,
  onBaselineChange,
  onError,
  onIntervalComplete,
  onModelLoadError,
  onModelLoadStart,
  onModelReady,
  reloadRequest,
  sessionId,
  videoRef,
}: PoseScoringOptions) {
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const initialBaselineRef = useRef(initialBaseline)
  const initialIntervalNumberRef = useRef(initialIntervalNumber)

  useEffect(() => {
    if (!enabled) {
      // 停止中に復元・保存された値を、次の集中開始時の起点として同期する。
      initialBaselineRef.current = initialBaseline
      initialIntervalNumberRef.current = initialIntervalNumber
    }
  }, [enabled, initialBaseline, initialIntervalNumber])

  // モデルは画面表示時に一度だけ準備し、停止・再開のたびに再読込しない。
  useEffect(() => {
    let disposed = false

    const prepareLandmarker = async () => {
      onModelLoadStart()
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

        landmarkerRef.current = landmarker
        onModelReady()
      } catch {
        if (!disposed) {
          onModelLoadError(
            '姿勢解析モデルを読み込めませんでした。通信状況を確認してください。',
          )
        }
      }
    }

    void prepareLandmarker()
    return () => {
      disposed = true
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    }
  }, [onModelLoadError, onModelLoadStart, onModelReady, reloadRequest])

  useEffect(() => {
    if (!enabled) return

    let disposed = false
    let timerId = 0
    let intervalStartedAtClock = performance.now()
    let intervalStartedAtEpoch = Date.now()
    let intervalNumber = initialIntervalNumberRef.current
    let nextSlotIndex = 0
    let lastVideoTime = -1
    let consecutiveAbsentSegments = 0
    // enabledが変わるとこのeffectごと作り直されるため、focus以外への切替で追跡状態は初期化される。
    let availability = initialAnalysisAvailabilityState
    let baseline = initialBaselineRef.current
    let samples: FrameEvaluation[] = []

    const createMissedSample = (slotIndex: number): FrameEvaluation => ({
      scheduledAt: intervalStartedAtEpoch + (slotIndex + 1) * ANALYSIS_INTERVAL_MS,
      status: 'missed',
    })

    const evaluateCurrentFrame = (scheduledAt: number): FrameEvaluation => {
      const video = videoRef.current
      const landmarker = landmarkerRef.current

      if (!landmarker) {
        return { scheduledAt, status: 'failed' }
      }
      if (
        !video ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.currentTime === lastVideoTime
      ) {
        return { scheduledAt, status: 'missed' }
      }

      lastVideoTime = video.currentTime
      try {
        const detection = landmarker.detectForVideo(video, performance.now())
        const landmarks = (detection.landmarks[0] ?? []).map(
          ({ visibility, x, y, z }) => ({ visibility, x, y, z }),
        )
        return getShoulderPose(landmarks)
          ? { landmarks, scheduledAt, status: 'detected' }
          : { scheduledAt, status: 'absent' }
      } catch {
        onError('カメラ映像の解析中にエラーが発生しました。')
        return { scheduledAt, status: 'failed' }
      }
    }

    const evaluateSegmentBoundary = () => {
      if (samples.length % SAMPLES_PER_DETECTION_SEGMENT !== 0) return false

      const segment = samples.slice(-SAMPLES_PER_DETECTION_SEGMENT)
      const evaluation = evaluateAnalysisAvailability(availability, segment)
      availability = evaluation.state

      if (evaluation.shouldStop) {
        // 約30秒解析できなかった時点で、未完了区間を破棄して計測を止める。
        samples = []
        onAnalysisUnavailable()
        return true
      }

      // 解析不能な区間は人物の有無を判断できないため、離席判定には使わない。
      if (!evaluation.isAnalyzable) return false

      consecutiveAbsentSegments = updateConsecutiveAbsentSegments(
        consecutiveAbsentSegments,
        segment,
      )
      if (consecutiveAbsentSegments < 2) return false

      // 約30秒の不在を確認した時点で、未完了区間を破棄して離席へ移す。
      samples = []
      onAwayDetected()
      return true
    }

    const completeInterval = () => {
      const calculation = calculateScoreInterval(
        `${sessionId}:interval:${intervalNumber}`,
        intervalStartedAtEpoch,
        samples,
        baseline,
      )
      baseline = calculation.baseline
      if (calculation.result.calibrationSucceeded && baseline) {
        onBaselineChange(baseline)
      }
      onIntervalComplete(calculation.result)

      intervalNumber += 1
      intervalStartedAtClock += SCORE_INTERVAL_MS
      intervalStartedAtEpoch += SCORE_INTERVAL_MS
      nextSlotIndex = 0
      samples = []
    }

    const processDueSlots = () => {
      if (disposed) return

      const now = performance.now()
      const dueCount = Math.min(
        SAMPLES_PER_INTERVAL,
        Math.floor((now - intervalStartedAtClock) / ANALYSIS_INTERVAL_MS),
      )

      // 遅延中に過ぎた評価タイミングは0点として明示的に記録する。
      while (nextSlotIndex < Math.max(0, dueCount - 1)) {
        samples.push(createMissedSample(nextSlotIndex))
        nextSlotIndex += 1
        if (evaluateSegmentBoundary()) return
      }

      if (nextSlotIndex < dueCount) {
        const scheduledAt =
          intervalStartedAtEpoch + (nextSlotIndex + 1) * ANALYSIS_INTERVAL_MS
        samples.push(evaluateCurrentFrame(scheduledAt))
        nextSlotIndex += 1
        if (evaluateSegmentBoundary()) return
      }

      if (nextSlotIndex === SAMPLES_PER_INTERVAL) {
        completeInterval()
      }

      const nextDueAt =
        intervalStartedAtClock + (nextSlotIndex + 1) * ANALYSIS_INTERVAL_MS
      timerId = window.setTimeout(processDueSlots, Math.max(0, nextDueAt - performance.now()))
    }

    // 集中開始と同時に区間を開始し、モデル準備中の処理不能はfailedとして除外する。
    timerId = window.setTimeout(processDueSlots, ANALYSIS_INTERVAL_MS)
    return () => {
      disposed = true
      window.clearTimeout(timerId)
      samples = []
    }
  }, [
    enabled,
    onAnalysisUnavailable,
    onAwayDetected,
    onBaselineChange,
    onError,
    onIntervalComplete,
    sessionId,
    videoRef,
  ])
}
