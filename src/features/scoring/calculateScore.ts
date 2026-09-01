import { calculatePoseMetrics } from '../pose/poseMetrics.ts'
import type { PoseFrame } from '../pose/poseTypes.ts'
import { DEFAULT_SCORE_CONFIG } from './scoreConfig.ts'
import type { ScoreConfig, ScoreResult } from './scoreTypes.ts'

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value))
}

function getMeasuredDurationMs(frames: PoseFrame[]) {
  if (frames.length < 2) {
    return 0
  }

  return Math.max(0, frames.at(-1)!.timestampMs - frames[0].timestampMs)
}

export function calculateScore(
  frames: PoseFrame[],
  config: ScoreConfig = DEFAULT_SCORE_CONFIG,
): ScoreResult {
  const metrics = calculatePoseMetrics(frames, {
    absenceGraceSamples: config.absenceGraceSamples,
    fullScoreOrientationAngleDegrees:
      config.fullScoreOrientationAngleDegrees,
    maxOrientationAngleDegrees: config.maxOrientationAngleDegrees,
    maxConsecutiveAbsenceSamples: config.maxConsecutiveAbsenceSamples,
    maxMovement: config.maxMovement,
    minLandmarkVisibility: config.minLandmarkVisibility,
    movementGrace: config.movementGrace,
  })
  const weightTotal =
    config.weights.presence +
    config.weights.continuity +
    config.weights.movement +
    config.weights.orientation

  if (weightTotal <= 0) {
    throw new Error('スコアの重み合計は0より大きい必要があります。')
  }
  if (config.fullScoreThreshold <= 0 || config.fullScoreThreshold > 1) {
    throw new Error('満点とする評価割合は0より大きく1以下にしてください。')
  }
  if (
    config.fullScoreOrientationAngleDegrees < 0 ||
    config.maxOrientationAngleDegrees > 90 ||
    config.fullScoreOrientationAngleDegrees >= config.maxOrientationAngleDegrees
  ) {
    throw new Error(
      '体の向きの角度は0以上で、満点角度より最大角度を大きく90以下にしてください。',
    )
  }

  const presencePoints = Math.round(
    (metrics.presenceRatio * config.weights.presence * 100) / weightTotal,
  )
  const continuityPoints = Math.round(
    (metrics.continuityRatio * config.weights.continuity * 100) / weightTotal,
  )
  const movementPoints = Math.round(
    (metrics.movementRatio * config.weights.movement * 100) / weightTotal,
  )
  const orientationPoints = Math.round(
    (metrics.orientationRatio * config.weights.orientation * 100) /
      weightTotal,
  )
  const rawScore =
    presencePoints + continuityPoints + movementPoints + orientationPoints
  const totalScore = Math.round(
    clampUnit(rawScore / 100 / config.fullScoreThreshold) * 100,
  )

  return {
    continuityPoints,
    measuredDurationMs: getMeasuredDurationMs(frames),
    movementPoints,
    orientationPoints,
    presencePoints,
    rawScore,
    sampleCount: frames.length,
    totalScore,
  }
}
