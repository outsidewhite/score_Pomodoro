import type {
  PoseFrame,
  PoseLandmark,
  PoseMetricOptions,
  PoseMetrics,
} from './poseTypes.ts'

const PRESENCE_LANDMARK_INDICES = [0, 11, 12, 23, 24] as const
const MOVEMENT_LANDMARK_INDICES = [11, 12] as const
const SHOULDER_INDICES = [11, 12] as const

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

function isPersonPresent(frame: PoseFrame, minLandmarkVisibility: number) {
  const visibleLandmarks = PRESENCE_LANDMARK_INDICES.filter((index) => {
    const landmark = getLandmark(frame.landmarks, index)
    return landmark && (landmark.visibility ?? 1) >= minLandmarkVisibility
  })

  // 筆記中に顔や腰が隠れても、上半身の一部が見えていれば在席として扱う。
  return visibleLandmarks.length >= 2
}

function calculatePresence(presentFrames: boolean[]) {
  return average(presentFrames.map((isPresent) => (isPresent ? 1 : 0)))
}

function calculateContinuity(
  presentFrames: boolean[],
  absenceGraceSamples: number,
  maxConsecutiveAbsenceSamples: number,
) {
  let currentAbsenceSamples = 0
  let longestAbsenceSamples = 0

  for (const isPresent of presentFrames) {
    if (isPresent) {
      currentAbsenceSamples = 0
      continue
    }

    currentAbsenceSamples += 1
    longestAbsenceSamples = Math.max(
      longestAbsenceSamples,
      currentAbsenceSamples,
    )
  }

  if (longestAbsenceSamples <= absenceGraceSamples) {
    return 1
  }

  const penaltyRange = Math.max(
    1,
    maxConsecutiveAbsenceSamples - absenceGraceSamples,
  )
  return clampUnit(
    1 - (longestAbsenceSamples - absenceGraceSamples) / penaltyRange,
  )
}

function calculateMovement(
  frames: PoseFrame[],
  presentFrames: boolean[],
  movementGrace: number,
  maxMovement: number,
) {
  const movementScores: number[] = []

  for (let frameIndex = 1; frameIndex < frames.length; frameIndex += 1) {
    if (!presentFrames[frameIndex - 1] || !presentFrames[frameIndex]) {
      continue
    }

    const previousFrame = frames[frameIndex - 1]
    const currentFrame = frames[frameIndex]
    const landmarkMovements = MOVEMENT_LANDMARK_INDICES.flatMap(
      (landmarkIndex) => {
        const previous = getLandmark(previousFrame.landmarks, landmarkIndex)
        const current = getLandmark(currentFrame.landmarks, landmarkIndex)

        if (!previous || !current) {
          return []
        }

        return [
          Math.hypot(
            current.x - previous.x,
            current.y - previous.y,
            current.z - previous.z,
          ),
        ]
      },
    )

    if (landmarkMovements.length === 0) {
      continue
    }

    const movement = average(landmarkMovements)
    // 筆記や姿勢変更は満点範囲に含め、明らかな大移動だけを段階的に減点する。
    const penaltyRange = Math.max(0.001, maxMovement - movementGrace)
    movementScores.push(
      clampUnit(1 - Math.max(0, movement - movementGrace) / penaltyRange),
    )
  }

  if (movementScores.length === 0) {
    return frames.some((_, index) => presentFrames[index]) ? 1 : 0
  }

  return average(movementScores)
}

function calculateOrientation(
  frames: PoseFrame[],
  presentFrames: boolean[],
  minLandmarkVisibility: number,
  fullScoreAngleDegrees: number,
  maxAngleDegrees: number,
) {
  const frameScores = frames.flatMap((frame, frameIndex) => {
    if (!presentFrames[frameIndex]) {
      return []
    }

    const leftShoulder = getLandmark(frame.landmarks, SHOULDER_INDICES[0])
    const rightShoulder = getLandmark(frame.landmarks, SHOULDER_INDICES[1])

    if (
      !leftShoulder ||
      !rightShoulder ||
      (leftShoulder.visibility ?? 1) < minLandmarkVisibility ||
      (rightShoulder.visibility ?? 1) < minLandmarkVisibility
    ) {
      return []
    }

    const horizontalDifference = Math.abs(leftShoulder.x - rightShoulder.x)
    const depthDifference = Math.abs(leftShoulder.z - rightShoulder.z)

    if (horizontalDifference === 0 && depthDifference === 0) {
      return []
    }

    // 肩を結ぶ線の奥行き成分から、カメラ正面に対する胴体の回転角を推定する。
    const angleDegrees =
      (Math.atan2(depthDifference, horizontalDifference) * 180) / Math.PI
    const penaltyRange = maxAngleDegrees - fullScoreAngleDegrees

    return [
      clampUnit(
        1 -
          Math.max(0, angleDegrees - fullScoreAngleDegrees) / penaltyRange,
      ),
    ]
  })

  // 在席とは判定できても両肩を確認できない場合、向きは評価不能として加点しない。
  return average(frameScores)
}

export function calculatePoseMetrics(
  frames: PoseFrame[],
  options: PoseMetricOptions,
): PoseMetrics {
  if (frames.length === 0) {
    return {
      presenceRatio: 0,
      continuityRatio: 0,
      movementRatio: 0,
      orientationRatio: 0,
    }
  }

  const presentFrames = frames.map((frame) =>
    isPersonPresent(frame, options.minLandmarkVisibility),
  )

  return {
    presenceRatio: calculatePresence(presentFrames),
    continuityRatio: calculateContinuity(
      presentFrames,
      options.absenceGraceSamples,
      options.maxConsecutiveAbsenceSamples,
    ),
    movementRatio: calculateMovement(
      frames,
      presentFrames,
      options.movementGrace,
      options.maxMovement,
    ),
    orientationRatio: calculateOrientation(
      frames,
      presentFrames,
      options.minLandmarkVisibility,
      options.fullScoreOrientationAngleDegrees,
      options.maxOrientationAngleDegrees,
    ),
  }
}
