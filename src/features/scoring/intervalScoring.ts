import type { PoseLandmark } from '../pose/poseTypes.ts'

export const ANALYSIS_INTERVAL_MS = 500
export const SCORE_INTERVAL_MS = 60_000
export const DETECTION_SEGMENT_MS = 15_000
export const SAMPLES_PER_INTERVAL = SCORE_INTERVAL_MS / ANALYSIS_INTERVAL_MS
export const SAMPLES_PER_DETECTION_SEGMENT =
  DETECTION_SEGMENT_MS / ANALYSIS_INTERVAL_MS
export const REQUIRED_DETECTIONS_PER_SEGMENT = 10
export const REQUIRED_BASELINE_DETECTIONS = Math.ceil(SAMPLES_PER_INTERVAL * 0.9)

const LEFT_SHOULDER_INDEX = 11
const RIGHT_SHOULDER_INDEX = 12
const MINIMUM_VISIBILITY = 0.5
const ANGLE_COMPARISON_EPSILON = 1e-9

export type FrameEvaluationStatus =
  | 'absent'
  | 'detected'
  | 'failed'
  | 'missed'

export type FrameEvaluation = {
  landmarks?: PoseLandmark[]
  scheduledAt: number
  status: FrameEvaluationStatus
}

export type PostureBaseline = {
  centerX: number
  centerY: number
  shoulderAngle: number
  shoulderWidth: number
}

export type EarnedScore = 0 | 1 | 2 | 3

export type ScoreIntervalResult = {
  absentCount: number
  calibrationSucceeded: boolean
  detectedCount: number
  detectionScore: number
  earnedScore: EarnedScore
  endedAt: number
  failedCount: number
  id: string
  isCalibration: boolean
  missedCount: number
  postureScore: number | null
  stabilityScore: number
  startedAt: number
  totalScore: number
}

export type IntervalCalculation = {
  baseline: PostureBaseline | null
  result: ScoreIntervalResult
}

type ShoulderPose = PostureBaseline

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

function averageShoulderAngles(angles: number[]) {
  if (angles.length === 0) return 0
  // 肩の線は180度周期なので、角度を2倍した円周平均で境界をまたぐ値を扱う。
  const sine = average(angles.map((angle) => Math.sin(angle * (Math.PI / 90))))
  const cosine = average(angles.map((angle) => Math.cos(angle * (Math.PI / 90))))
  return Math.atan2(sine, cosine) * (90 / Math.PI)
}

function getVisibleLandmark(
  landmarks: PoseLandmark[],
  index: number,
): PoseLandmark | null {
  const landmark = landmarks[index]
  if (
    !landmark ||
    !Number.isFinite(landmark.x) ||
    !Number.isFinite(landmark.y) ||
    (landmark.visibility ?? 1) < MINIMUM_VISIBILITY
  ) {
    return null
  }
  return landmark
}

// 肩を結ぶ線は向きを持たないため、角度を-90度から90度へ正規化する。
function normalizeShoulderAngle(angle: number) {
  let normalized = angle
  while (normalized > 90) normalized -= 180
  while (normalized < -90) normalized += 180
  return normalized
}

export function getShoulderPose(
  landmarks: PoseLandmark[],
): ShoulderPose | null {
  const left = getVisibleLandmark(landmarks, LEFT_SHOULDER_INDEX)
  const right = getVisibleLandmark(landmarks, RIGHT_SHOULDER_INDEX)
  if (!left || !right) return null

  const shoulderWidth = Math.hypot(right.x - left.x, right.y - left.y)
  if (!Number.isFinite(shoulderWidth) || shoulderWidth <= 0) return null

  return {
    centerX: (left.x + right.x) / 2,
    centerY: (left.y + right.y) / 2,
    shoulderAngle: normalizeShoulderAngle(
      Math.atan2(right.y - left.y, right.x - left.x) * (180 / Math.PI),
    ),
    shoulderWidth,
  }
}

export function getEarnedScore(totalScore: number): EarnedScore {
  if (!Number.isFinite(totalScore) || totalScore <= 0) return 0
  if (totalScore <= 40) return 1
  if (totalScore <= 80) return 2
  return 3
}

export function getDetectionSegmentScore(samples: FrameEvaluation[]) {
  const detectedCount = samples.filter(({ status }) => status === 'detected').length
  return detectedCount >= REQUIRED_DETECTIONS_PER_SEGMENT ? 25 : 0
}

// 解析自体に成功した件数。detectedとabsentだけを解析可能件数として数える。
export function getAnalyzableCount(samples: FrameEvaluation[]) {
  return samples.filter(
    ({ status }) => status === 'detected' || status === 'absent',
  ).length
}

// failedやmissedが多い区間は、人物の有無を判断する材料がないため判定に使わない。
export function isAnalyzableSegment(samples: FrameEvaluation[]) {
  return getAnalyzableCount(samples) >= REQUIRED_DETECTIONS_PER_SEGMENT
}

// 処理失敗は判定から外し、十分な正常解析がある区間だけ離席判定に利用する。
export function isConclusiveAbsentSegment(samples: FrameEvaluation[]) {
  return isAnalyzableSegment(samples) && getDetectionSegmentScore(samples) === 0
}

export function updateConsecutiveAbsentSegments(
  currentCount: number,
  samples: FrameEvaluation[],
) {
  if (getDetectionSegmentScore(samples) > 0) return 0
  if (!isConclusiveAbsentSegment(samples)) return currentCount
  return currentCount + 1
}

function calculateBaseline(samples: FrameEvaluation[]) {
  const poses = samples.flatMap((sample) => {
    if (sample.status !== 'detected' || !sample.landmarks) return []
    const pose = getShoulderPose(sample.landmarks)
    return pose ? [pose] : []
  })

  if (poses.length < REQUIRED_BASELINE_DETECTIONS) return null

  return {
    centerX: average(poses.map(({ centerX }) => centerX)),
    centerY: average(poses.map(({ centerY }) => centerY)),
    shoulderAngle: averageShoulderAngles(
      poses.map(({ shoulderAngle }) => shoulderAngle),
    ),
    shoulderWidth: average(poses.map(({ shoulderWidth }) => shoulderWidth)),
  }
}

function calculatePostureScore(
  samples: FrameEvaluation[],
  baseline: PostureBaseline,
) {
  const scores = samples.flatMap((sample) => {
    // 処理失敗だけは平均の分母から除外する。
    if (sample.status === 'failed') return []
    if (sample.status !== 'detected' || !sample.landmarks) return [0]

    const pose = getShoulderPose(sample.landmarks)
    if (!pose) return [0]

    const deviationRatio =
      Math.hypot(pose.centerX - baseline.centerX, pose.centerY - baseline.centerY) /
      baseline.shoulderWidth
    if (deviationRatio <= 0.1) return [100]
    if (deviationRatio >= 0.5) return [0]
    return [100 * (1 - (deviationRatio - 0.1) / 0.4)]
  })

  return average(scores)
}

export function getStabilitySegmentScore(samples: FrameEvaluation[]) {
  const eligibleSamples = samples.filter(({ status }) => status !== 'failed')
  const angles = eligibleSamples.flatMap((sample) => {
    if (sample.status !== 'detected' || !sample.landmarks) return []
    const pose = getShoulderPose(sample.landmarks)
    return pose ? [pose.shoulderAngle] : []
  })

  if (eligibleSamples.length === 0 || angles.length < 2) return 0

  const referenceAngle = angles[0] ?? 0
  const unwrappedAngles = angles.map((angle) => {
    let difference = angle - referenceAngle
    while (difference > 90) difference -= 180
    while (difference < -90) difference += 180
    return referenceAngle + difference
  })
  const angleRange = Math.max(...unwrappedAngles) - Math.min(...unwrappedAngles)
  let movementScore = 0
  if (angleRange <= 10 + ANGLE_COMPARISON_EPSILON) {
    movementScore = 25
  } else if (angleRange < 35 - ANGLE_COMPARISON_EPSILON) {
    movementScore = 25 - ((angleRange - 10) / 25) * 24
  }

  // 未検出・評価欠落を0点として反映し、処理失敗だけを分母から除外する。
  return movementScore * (angles.length / eligibleSamples.length)
}

function splitIntoSegments(samples: FrameEvaluation[], startedAt: number) {
  const segments = Array.from({ length: 4 }, () => [] as FrameEvaluation[])
  for (const sample of samples) {
    const index = clamp(
      Math.ceil((sample.scheduledAt - startedAt) / DETECTION_SEGMENT_MS) - 1,
      0,
      3,
    )
    segments[index]?.push(sample)
  }
  return segments
}

export function calculateScoreInterval(
  id: string,
  startedAt: number,
  samples: FrameEvaluation[],
  currentBaseline: PostureBaseline | null,
): IntervalCalculation {
  if (samples.length !== SAMPLES_PER_INTERVAL) {
    throw new RangeError('1分区間には120回分の評価結果が必要です')
  }

  const segments = splitIntoSegments(samples, startedAt)
  const detectionScore = segments.reduce(
    (total, segment) => total + getDetectionSegmentScore(segment),
    0,
  )
  const stabilityScore = segments.reduce(
    (total, segment) => total + getStabilitySegmentScore(segment),
    0,
  )
  const isCalibration = currentBaseline === null
  const nextBaseline = isCalibration ? calculateBaseline(samples) : currentBaseline
  const postureScore = isCalibration
    ? null
    : calculatePostureScore(samples, currentBaseline)
  const totalScore = isCalibration
    ? stabilityScore * 0.6 + detectionScore * 0.4
    : (postureScore ?? 0) * 0.4 + stabilityScore * 0.4 + detectionScore * 0.2

  return {
    baseline: nextBaseline,
    result: {
      absentCount: samples.filter(({ status }) => status === 'absent').length,
      calibrationSucceeded: isCalibration && nextBaseline !== null,
      detectedCount: samples.filter(({ status }) => status === 'detected').length,
      detectionScore,
      earnedScore: getEarnedScore(totalScore),
      endedAt: startedAt + SCORE_INTERVAL_MS,
      failedCount: samples.filter(({ status }) => status === 'failed').length,
      id,
      isCalibration,
      missedCount: samples.filter(({ status }) => status === 'missed').length,
      postureScore,
      stabilityScore,
      startedAt,
      totalScore,
    },
  }
}
