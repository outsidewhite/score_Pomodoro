import type {
  PoseFrame,
  PoseLandmark,
  PoseMetricOptions,
  PoseMetrics,
} from './poseTypes.ts'

const SHOULDER_INDICES = [11, 12] as const
const HIP_INDICES = [23, 24] as const
const PRESENCE_INDICES = [11, 12] as const
const STABILITY_INDICES = [11, 12, 23, 24] as const

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value))
}

function getLandmark(
  landmarks: PoseLandmark[],
  index: number,
): PoseLandmark | null {
  const landmark = landmarks[index]

  if (
    !landmark ||
    !Number.isFinite(landmark.x) ||
    !Number.isFinite(landmark.y) ||
    !Number.isFinite(landmark.z)
  ) {
    return null
  }

  return landmark
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function calculatePosture(frames: PoseFrame[], maxTilt: number) {
  const frameScores = frames.flatMap(({ landmarks }) => {
    const leftShoulder = getLandmark(landmarks, SHOULDER_INDICES[0])
    const rightShoulder = getLandmark(landmarks, SHOULDER_INDICES[1])
    const leftHip = getLandmark(landmarks, HIP_INDICES[0])
    const rightHip = getLandmark(landmarks, HIP_INDICES[1])

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return []
    }

    // 肩と腰の傾きが小さいほど、正面に近い安定した姿勢として評価する。
    const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y)
    const hipTilt = Math.abs(leftHip.y - rightHip.y)
    const averageTilt = (shoulderTilt + hipTilt) / 2

    return [clampUnit(1 - averageTilt / maxTilt)]
  })

  return average(frameScores)
}

function calculatePresence(frames: PoseFrame[]) {
  const visibilityValues = frames.flatMap(({ landmarks }) =>
    PRESENCE_INDICES.flatMap((index) => {
      const landmark = getLandmark(landmarks, index)

      if (!landmark) {
        return []
      }

      return [clampUnit(landmark.visibility ?? 1)]
    }),
  )

  return average(visibilityValues)
}

function calculateStability(frames: PoseFrame[], maxMovement: number) {
  if (frames.length === 0) {
    return 0
  }

  if (frames.length === 1) {
    return 1
  }

  const movementValues: number[] = []

  for (let frameIndex = 1; frameIndex < frames.length; frameIndex += 1) {
    const previousFrame = frames[frameIndex - 1]
    const currentFrame = frames[frameIndex]

    for (const landmarkIndex of STABILITY_INDICES) {
      const previous = getLandmark(previousFrame.landmarks, landmarkIndex)
      const current = getLandmark(currentFrame.landmarks, landmarkIndex)

      if (!previous || !current) {
        continue
      }

      const movement = Math.hypot(
        current.x - previous.x,
        current.y - previous.y,
        current.z - previous.z,
      )
      movementValues.push(movement)
    }
  }

  if (movementValues.length === 0) {
    return 0
  }

  return clampUnit(1 - average(movementValues) / maxMovement)
}

export function calculatePoseMetrics(
  frames: PoseFrame[],
  options: PoseMetricOptions,
): PoseMetrics {
  if (frames.length === 0) {
    return { posture: 0, presence: 0, stability: 0 }
  }

  return {
    posture: calculatePosture(frames, options.maxTilt),
    presence: calculatePresence(frames),
    stability: calculateStability(frames, options.maxMovement),
  }
}
