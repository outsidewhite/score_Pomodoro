import assert from 'node:assert/strict'
import test from 'node:test'
import type { PoseFrame, PoseLandmark } from '../pose/poseTypes.ts'
import { calculateAverageFocusScore, calculateScore } from './calculateScore.ts'

function createLandmarks(overrides: Partial<PoseLandmark> = {}): PoseLandmark[] {
  return Array.from({ length: 33 }, () => ({
    visibility: 1,
    x: 0.5,
    y: 0.5,
    z: 0,
    ...overrides,
  }))
}

function createFrame(
  timestampMs: number,
  overrides: Partial<PoseLandmark> = {},
): PoseFrame {
  return { landmarks: createLandmarks(overrides), timestampMs }
}

function createTiltedFrame(timestampMs: number, tilt: number): PoseFrame {
  return {
    landmarks: Array.from({ length: 33 }, (_, index) => {
      const isLeftShoulder = index === 11
      const isRightShoulder = index === 12
      const isLeftHip = index === 23
      const isRightHip = index === 24

      return {
        visibility: 1,
        x: 0.5,
        y: 0.5 + (isLeftShoulder || isRightShoulder || isLeftHip || isRightHip ? tilt : 0),
        z: 0,
      }
    }),
    timestampMs,
  }
}

test('解析フレームがない場合は各スコアを0にする', () => {
  assert.deepEqual(calculateScore([]), {
    measuredDurationMs: 0,
    postureScore: 0,
    presenceScore: 0,
    stabilityScore: 0,
    totalScore: 0,
  })
})

test('水平で動きのない姿勢を100点として評価する', () => {
  assert.deepEqual(calculateScore([createFrame(1_000), createFrame(2_000)]), {
    measuredDurationMs: 1_000,
    postureScore: 100,
    presenceScore: 100,
    stabilityScore: 100,
    totalScore: 100,
  })
})

test('重みがすべて0の場合は設定エラーにする', () => {
  assert.throws(
    () =>
      calculateScore([createFrame(0)], {
        maxMovement: 0.08,
        maxTilt: 0.15,
        weights: { posture: 0, presence: 0, stability: 0 },
      }),
    /重み合計/,
  )
})

test('3分ごとの平均スコアはサンプルの平均で算出される', () => {
  const goodFrame = createFrame(0)
  const badFrame = createTiltedFrame(1_000, 0.2)
  const result = calculateAverageFocusScore(
    [goodFrame, badFrame],
    undefined,
    { sampleIntervalMs: 1_000, evaluationWindowMs: 2_000 },
  )

  assert.equal(result.sampleCount, 2)
  assert.equal(result.averageTotalScore, 80)
  assert.equal(result.results.length, 2)
})
