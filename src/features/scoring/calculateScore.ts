import { calculatePoseMetrics } from '../pose/poseMetrics.ts'
import type { PoseFrame } from '../pose/poseTypes.ts'
import { DEFAULT_SCORE_CONFIG } from './scoreConfig.ts'
import type { ScoreConfig, ScoreResult } from './scoreTypes.ts'

function toPercentage(value: number) {
  return Math.round(Math.min(1, Math.max(0, value)) * 100)
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
    maxMovement: config.maxMovement,
    maxTilt: config.maxTilt,
  })
  const weightTotal =
    config.weights.posture +
    config.weights.detection +
    config.weights.stability

  if (weightTotal <= 0) {
    throw new Error('スコアの重み合計は0より大きい必要があります。')
  }

  const total =
    (metrics.posture * config.weights.posture +
      metrics.presence * config.weights.detection +
      metrics.stability * config.weights.stability) /
    weightTotal

  return {
    detectionScore: toPercentage(metrics.presence),
    measuredDurationMs: getMeasuredDurationMs(frames),
    postureScore: toPercentage(metrics.posture),
    stabilityScore: toPercentage(metrics.stability),
    totalScore: toPercentage(total),
  }
}
