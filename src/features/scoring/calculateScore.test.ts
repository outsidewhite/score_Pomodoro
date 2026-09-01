import assert from 'node:assert/strict'
import test from 'node:test'
import type { PoseFrame, PoseLandmark } from '../pose/poseTypes.ts'
import { calculateScore } from './calculateScore.ts'
import { DEFAULT_SCORE_CONFIG } from './scoreConfig.ts'

function createLandmarks(): PoseLandmark[] {
  const landmarks = Array.from({ length: 33 }, () => ({
    visibility: 1,
    x: 0.5,
    y: 0.5,
    z: 0,
  }))

  // 正面向きの基準として、左右の肩に水平な間隔を持たせる。
  landmarks[11].x = 0.4
  landmarks[12].x = 0.6
  return landmarks
}

function createLandmarksWithOrientation(angleDegrees: number) {
  const landmarks = createLandmarks()
  const shoulderWidth = landmarks[12].x - landmarks[11].x

  // 指定した回転角になるよう、右肩だけに奥行き差を設定する。
  landmarks[12].z =
    Math.tan((angleDegrees * Math.PI) / 180) * shoulderWidth
  return landmarks
}

function createFrame(
  timestampMs: number,
  landmarks = createLandmarks(),
): PoseFrame {
  return { landmarks, timestampMs }
}

test('解析フレームがない場合は各スコアを0にする', () => {
  assert.deepEqual(calculateScore([]), {
    continuityPoints: 0,
    measuredDurationMs: 0,
    movementPoints: 0,
    orientationPoints: 0,
    presencePoints: 0,
    rawScore: 0,
    sampleCount: 0,
    totalScore: 0,
  })
})

test('人物が正面向きで継続して検出される場合は各配点を満たす', () => {
  assert.deepEqual(calculateScore([createFrame(1_000), createFrame(2_000)]), {
    continuityPoints: 25,
    measuredDurationMs: 1_000,
    movementPoints: 10,
    orientationPoints: 15,
    presencePoints: 50,
    rawScore: 100,
    sampleCount: 2,
    totalScore: 100,
  })
})

test('肩や腰が水平でなくても身体の傾きを理由に減点しない', () => {
  const landmarks = createLandmarks()
  landmarks[11].y = 0.35
  landmarks[12].y = 0.65
  landmarks[23].y = 0.4
  landmarks[24].y = 0.7

  const result = calculateScore([createFrame(0, landmarks)])

  assert.equal(result.rawScore, 100)
  assert.equal(result.totalScore, 100)
})

test('腰が映らなくても鼻と両肩を検出できれば在席として扱う', () => {
  const landmarks = createLandmarks().map((landmark) => ({
    ...landmark,
    visibility: 0,
  }))
  landmarks[0].visibility = 1
  landmarks[11].visibility = 1
  landmarks[12].visibility = 1

  const result = calculateScore([createFrame(0, landmarks)])

  assert.equal(result.presencePoints, 50)
  assert.equal(result.orientationPoints, 15)
  assert.equal(result.totalScore, 100)
})

test('正面から20度以内は体の向きを満点にする', () => {
  const result = calculateScore([
    createFrame(0, createLandmarksWithOrientation(20)),
  ])

  assert.equal(result.orientationPoints, 15)
})

test('斜め45度では体の向きを段階的に減点する', () => {
  const result = calculateScore([
    createFrame(0, createLandmarksWithOrientation(45)),
  ])

  assert.equal(result.orientationPoints, 8)
})

test('横向きに近い70度では体の向きの加点を0にする', () => {
  const result = calculateScore([
    createFrame(0, createLandmarksWithOrientation(70)),
  ])

  assert.equal(result.orientationPoints, 0)
})

test('両肩を確認できない場合は体の向きを加点しない', () => {
  const landmarks = createLandmarks()
  landmarks[12].visibility = 0

  const result = calculateScore([createFrame(0, landmarks)])

  assert.equal(result.presencePoints, 50)
  assert.equal(result.orientationPoints, 0)
})

test('一部の未検出を許容し、生の評価が70点以上なら100点にする', () => {
  const frames = Array.from({ length: 10 }, (_, index) =>
    createFrame(index * 3_000, index < 7 ? createLandmarks() : []),
  )
  const result = calculateScore(frames)

  assert.equal(result.presencePoints, 35)
  assert.equal(result.continuityPoints, 22)
  assert.equal(result.movementPoints, 10)
  assert.equal(result.orientationPoints, 15)
  assert.equal(result.rawScore, 82)
  assert.equal(result.totalScore, 100)
})

test('長時間連続して検出できない場合は在席点と継続点を下げる', () => {
  const frames = Array.from({ length: 10 }, (_, index) =>
    createFrame(index * 3_000, index < 4 ? createLandmarks() : []),
  )
  const result = calculateScore(frames)

  assert.equal(result.presencePoints, 20)
  assert.equal(result.continuityPoints, 13)
  assert.equal(result.rawScore, 58)
  assert.equal(result.totalScore, 83)
})

test('重みがすべて0の場合は設定エラーにする', () => {
  assert.throws(
    () =>
      calculateScore([createFrame(0)], {
        ...DEFAULT_SCORE_CONFIG,
        weights: {
          presence: 0,
          continuity: 0,
          movement: 0,
          orientation: 0,
        },
      }),
    /重み合計/,
  )
})

test('満点とする評価割合が範囲外の場合は設定エラーにする', () => {
  assert.throws(
    () =>
      calculateScore([createFrame(0)], {
        ...DEFAULT_SCORE_CONFIG,
        fullScoreThreshold: 0,
      }),
    /評価割合/,
  )
})

test('体の向きの満点角度が最大角度以上の場合は設定エラーにする', () => {
  assert.throws(
    () =>
      calculateScore([createFrame(0)], {
        ...DEFAULT_SCORE_CONFIG,
        fullScoreOrientationAngleDegrees: 70,
        maxOrientationAngleDegrees: 70,
      }),
    /体の向きの角度/,
  )
})
