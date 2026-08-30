import assert from 'node:assert/strict'
import test from 'node:test'
import type { PoseFrame, PoseLandmark } from '../pose/poseTypes.ts'
import { calculateScore } from './calculateScore.ts'

function createLandmarks(): PoseLandmark[] {
  return Array.from({ length: 33 }, () => ({
    visibility: 1,
    x: 0.5,
    y: 0.5,
    z: 0,
  }))
}

function createFrame(timestampMs: number): PoseFrame {
  return { landmarks: createLandmarks(), timestampMs }
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
