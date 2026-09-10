import { describe, expect, test } from 'vitest'
import type { PoseLandmark } from '../pose/poseTypes.ts'
import {
  calculateScoreInterval,
  getDetectionSegmentScore,
  getEarnedScore,
  getStabilitySegmentScore,
  isAnalyzableSegment,
  isConclusiveAbsentSegment,
  REQUIRED_BASELINE_DETECTIONS,
  updateConsecutiveAbsentSegments,
  type FrameEvaluation,
  type PostureBaseline,
} from './intervalScoring.ts'

function createLandmarks(angleDegrees = 0, centerX = 0.5): PoseLandmark[] {
  const landmarks = Array.from({ length: 33 }, () => ({
    visibility: 1,
    x: 0.5,
    y: 0.5,
    z: 0,
  }))
  const radians = angleDegrees * (Math.PI / 180)
  const halfWidth = 0.1
  landmarks[11] = {
    visibility: 1,
    x: centerX - Math.cos(radians) * halfWidth,
    y: 0.5 - Math.sin(radians) * halfWidth,
    z: 0,
  }
  landmarks[12] = {
    visibility: 1,
    x: centerX + Math.cos(radians) * halfWidth,
    y: 0.5 + Math.sin(radians) * halfWidth,
    z: 0,
  }
  return landmarks
}

function createSamples(
  count: number,
  status: FrameEvaluation['status'],
  startIndex = 0,
): FrameEvaluation[] {
  return Array.from({ length: count }, (_, offset) => ({
    landmarks: status === 'detected' ? createLandmarks() : undefined,
    scheduledAt: (startIndex + offset + 1) * 500,
    status,
  }))
}

describe('getEarnedScore', () => {
  test.each([
    [0, 0],
    [1, 1],
    [40, 1],
    [41, 2],
    [80, 2],
    [81, 3],
    [100, 3],
  ] as const)('%d点を獲得スコア%d点へ変換する', (score, expected) => {
    expect(getEarnedScore(score)).toBe(expected)
  })
})

describe('15秒区間の採点', () => {
  test('人物検出が9回なら0点、10回なら25点にする', () => {
    expect(getDetectionSegmentScore(createSamples(9, 'detected'))).toBe(0)
    expect(getDetectionSegmentScore(createSamples(10, 'detected'))).toBe(25)
  })

  test('解析可能件数が9件なら判定不能、10件なら判定可能にする', () => {
    expect(
      isAnalyzableSegment([
        ...createSamples(9, 'absent'),
        ...createSamples(21, 'failed', 9),
      ]),
    ).toBe(false)
    expect(
      isAnalyzableSegment([
        ...createSamples(10, 'absent'),
        ...createSamples(20, 'failed', 10),
      ]),
    ).toBe(true)
  })

  test('failedばかりの区間は不在が確定した区間として扱わない', () => {
    expect(isConclusiveAbsentSegment(createSamples(30, 'failed'))).toBe(false)
    expect(isConclusiveAbsentSegment(createSamples(30, 'absent'))).toBe(true)
  })

  test('判定可能な不在が2区間続いた場合だけ連続回数を2にする', () => {
    const absentSegment = createSamples(30, 'absent')
    const failedSegment = createSamples(30, 'failed')
    const detectedSegment = createSamples(10, 'detected')

    const first = updateConsecutiveAbsentSegments(0, absentSegment)
    expect(updateConsecutiveAbsentSegments(first, absentSegment)).toBe(2)
    expect(updateConsecutiveAbsentSegments(first, failedSegment)).toBe(first)
    expect(updateConsecutiveAbsentSegments(first, detectedSegment)).toBe(0)
  })

  test.each([
    [10, 25],
    [35, 0],
  ])('肩角度の変動幅が%d度の場合は%d点にする', (angle, expected) => {
    const samples = createSamples(30, 'detected')
    samples[29] = {
      landmarks: createLandmarks(angle),
      scheduledAt: 15_000,
      status: 'detected',
    }
    expect(getStabilitySegmentScore(samples)).toBeCloseTo(expected)
  })
})

describe('calculateScoreInterval', () => {
  test('120回に満たない未完了区間は確定しない', () => {
    expect(() =>
      calculateScoreInterval('1', 0, createSamples(119, 'detected'), null),
    ).toThrow(RangeError)
  })

  test('15秒ごとの境界を含む4区間で検出状態を採点する', () => {
    const samples = Array.from({ length: 120 }, (_, index) => ({
      landmarks: index % 30 >= 20 ? createLandmarks() : undefined,
      scheduledAt: (index + 1) * 500,
      status: index % 30 >= 20 ? 'detected' as const : 'absent' as const,
    }))

    const calculation = calculateScoreInterval('1', 0, samples, null)
    expect(calculation.result.detectionScore).toBe(100)
  })

  test('108回以上検出できた最初の1分で基準姿勢を確定する', () => {
    const detected = createSamples(REQUIRED_BASELINE_DETECTIONS, 'detected')
    const absent = createSamples(12, 'absent', detected.length)
    const calculation = calculateScoreInterval(
      'session:interval:1',
      0,
      [...detected, ...absent],
      null,
    )

    expect(calculation.baseline).not.toBeNull()
    expect(calculation.result.calibrationSucceeded).toBe(true)
    expect(calculation.result.postureScore).toBeNull()
  })

  test('107回以下の検出では基準姿勢を確定しないが区間結果は返す', () => {
    const detected = createSamples(REQUIRED_BASELINE_DETECTIONS - 1, 'detected')
    const absent = createSamples(13, 'absent', detected.length)
    const calculation = calculateScoreInterval(
      'session:interval:1',
      0,
      [...detected, ...absent],
      null,
    )

    expect(calculation.baseline).toBeNull()
    expect(calculation.result.calibrationSucceeded).toBe(false)
    expect(calculation.result.totalScore).toBeGreaterThan(0)
  })

  test('基準姿勢確定後は姿勢4・安定性4・検出2の重みで算出する', () => {
    const baseline: PostureBaseline = {
      centerX: 0.5,
      centerY: 0.5,
      shoulderAngle: 0,
      shoulderWidth: 0.2,
    }
    const calculation = calculateScoreInterval(
      'session:interval:2',
      0,
      createSamples(120, 'detected'),
      baseline,
    )

    expect(calculation.result.postureScore).toBe(100)
    expect(calculation.result.stabilityScore).toBe(100)
    expect(calculation.result.detectionScore).toBe(100)
    expect(calculation.result.totalScore).toBe(100)
    expect(calculation.result.earnedScore).toBe(3)
  })


  test.each([
    [0.52, 100],
    [0.6, 0],
  ])('肩中点が基準からずれた場合の姿勢境界を採点する', (centerX, expected) => {
    const baseline: PostureBaseline = {
      centerX: 0.5,
      centerY: 0.5,
      shoulderAngle: 0,
      shoulderWidth: 0.2,
    }
    const samples = createSamples(120, 'detected').map((sample) => ({
      ...sample,
      landmarks: createLandmarks(0, centerX),
    }))

    const calculation = calculateScoreInterval('2', 0, samples, baseline)
    expect(calculation.result.postureScore).toBeCloseTo(expected)
  })
})
