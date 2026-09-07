import assert from 'node:assert/strict'
import test from 'node:test'
import type { PoseFrame, PoseLandmark } from '../pose/poseTypes.ts'
import { calculateScore, getEarnedScore } from './calculateScore.ts'

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
    earnedScore: 2,
    focusScore: 0,
    measuredDurationMs: 0,
    postureScore: 0,
    presenceScore: 0,
    stabilityScore: 0,
  })
})

test('水平で動きのない姿勢を100点として評価する', () => {
  assert.deepEqual(calculateScore([createFrame(1_000), createFrame(2_000)]), {
    earnedScore: 3,
    focusScore: 100,
    measuredDurationMs: 1_000,
    postureScore: 100,
    presenceScore: 100,
    stabilityScore: 100,
  })
})

test('重みがすべて0の場合は設定エラーにする', () => {
  assert.throws(
    () =>
      calculateScore([createFrame(0)], {
        goodScoreThreshold: 41,
        maxMovement: 0.08,
        maxTilt: 0.15,
        weights: { posture: 0, presence: 0, stability: 0 },
      }),
    /重み合計/,
  )
})

test('1分間のフレームをまとめて集中評価と獲得点を算出する', () => {
  const frames = [createFrame(0), createTiltedFrame(30_000, 0.2), createFrame(60_000)]
  const result = calculateScore(frames)

  assert.equal(result.measuredDurationMs, 60_000)
  assert.equal(result.focusScore, 60)
  assert.equal(result.earnedScore, 3)
})

test('集中評価が良好の基準未満なら2点を獲得する', () => {
  const result = calculateScore([])

  assert.equal(result.focusScore, 0)
  assert.equal(result.earnedScore, 2)
})

test('集中評価41点を良好の境界として獲得点を決める', () => {
  assert.equal(getEarnedScore(40), 2)
  assert.equal(getEarnedScore(41), 3)
})
