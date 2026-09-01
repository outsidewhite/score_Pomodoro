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

export type AverageFocusScoreOptions = {
  sampleIntervalMs?: number
  evaluationWindowMs?: number
}

export type AverageFocusScoreResult = {
  averageTotalScore: number
  sampleCount: number
  results: ScoreResult[]
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
    config.weights.presence +
    config.weights.stability

  if (weightTotal <= 0) {
    throw new Error('スコアの重み合計は0より大きい必要があります。')
  }

  const total =
    (metrics.posture * config.weights.posture +
      metrics.presence * config.weights.presence +
      metrics.stability * config.weights.stability) /
    weightTotal

  return {
    measuredDurationMs: getMeasuredDurationMs(frames),
    postureScore: toPercentage(metrics.posture),
    presenceScore: toPercentage(metrics.presence),
    stabilityScore: toPercentage(metrics.stability),
    totalScore: toPercentage(total),
  }
}

export function calculateAverageFocusScore(
  frames: PoseFrame[],
  config: ScoreConfig = DEFAULT_SCORE_CONFIG,
  options: AverageFocusScoreOptions = {},
): AverageFocusScoreResult {
  const sampleIntervalMs = Math.max(1, options.sampleIntervalMs ?? 180_000)
  const evaluationWindowMs = Math.max(
    sampleIntervalMs,
    options.evaluationWindowMs ?? 300_000,
  )

  if (frames.length === 0) {
    return {
      averageTotalScore: 0,
      sampleCount: 0,
      results: [],
    }
  }

  const results: ScoreResult[] = []
  let cursor = 0

  while (cursor < frames.length) {
    const windowStartMs = frames[cursor].timestampMs
    const windowEndMs = windowStartMs + evaluationWindowMs

    const windowFrames = frames.filter(
      (frame) => frame.timestampMs >= windowStartMs && frame.timestampMs < windowEndMs,
    )

    if (windowFrames.length === 0) {
      cursor += 1
      continue
    }

    results.push(calculateScore(windowFrames, config))

    const nextCursor = frames.findIndex(
      (frame) => frame.timestampMs >= windowStartMs + sampleIntervalMs,
    )

    if (nextCursor === -1) {
      break
    }

    cursor = nextCursor
  }

  if (results.length === 0) {
    return {
      averageTotalScore: 0,
      sampleCount: 0,
      results: [],
    }
  }

  const averageTotalScore = Math.round(
    results.reduce((sum, result) => sum + result.totalScore, 0) / results.length,
  )

  return {
    averageTotalScore,
    sampleCount: results.length,
    results,
  }
}
