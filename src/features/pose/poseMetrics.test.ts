import assert from 'node:assert/strict'
import test from 'node:test'
import { calculatePoseMetrics } from './poseMetrics.ts'
import type { PoseFrame, PoseLandmark } from './poseTypes.ts'

function createLandmarks(): PoseLandmark[] {
  return Array.from({ length: 33 }, () => ({
    visibility: 1,
    x: 0.5,
    y: 0.5,
    z: 0,
  }))
}

function createFrame(
  timestampMs: number,
  visibilityByIndex: Record<number, number>,
): PoseFrame {
  const landmarks = createLandmarks()

  for (const [index, visibility] of Object.entries(visibilityByIndex)) {
    landmarks[Number(index)].visibility = visibility
  }

  return { landmarks, timestampMs }
}

const options = { maxMovement: 0.08, maxTilt: 0.15 }

test('検出状態は左右の肩のvisibility平均で算出する', () => {
  const metrics = calculatePoseMetrics(
    [
      createFrame(0, { 11: 0.8, 12: 0.6 }),
      createFrame(1_000, { 11: 0.8, 12: 0.6 }),
    ],
    options,
  )

  assert.ok(Math.abs(metrics.presence - 0.7) < 1e-10)
})

test('検出状態は腰のvisibilityに影響されない', () => {
  const visibleHips = calculatePoseMetrics(
    [createFrame(0, { 11: 0.8, 12: 0.6, 23: 1, 24: 1 })],
    options,
  )
  const hiddenHips = calculatePoseMetrics(
    [createFrame(0, { 11: 0.8, 12: 0.6, 23: 0, 24: 0 })],
    options,
  )

  assert.ok(Math.abs(visibleHips.presence - hiddenHips.presence) < 1e-10)
  assert.ok(Math.abs(hiddenHips.presence - 0.7) < 1e-10)
})