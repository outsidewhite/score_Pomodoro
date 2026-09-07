import assert from 'node:assert/strict'
import test from 'node:test'
import type { PoseFrame } from '../pose/poseTypes.ts'
import { IntervalManager } from './IntervalManager.ts'
import { DEFAULT_SCORE_CONFIG } from './scoreConfig.ts'

function createFrame(
  timestampMs: number,
  visibility: number = 1,
): PoseFrame {
  return {
    landmarks: Array.from({ length: 33 }, () => ({
      visibility,
      x: 0.5,
      y: 0.5,
      z: 0,
    })),
    timestampMs,
  }
}

test('IntervalManager - 3 minute interval', () => {
  const completedIntervals: import('./intervalTypes.ts').Interval[] = []
  const discardedIntervals: import('./intervalTypes.ts').Interval[] = []

  const events = {
    onIntervalCompleted: (interval: import('./intervalTypes.ts').Interval) => {
      completedIntervals.push(interval)
    },
    onIntervalDiscarded: (interval: import('./intervalTypes.ts').Interval) => {
      discardedIntervals.push(interval)
    },
  }

  const manager = new IntervalManager(
    { intervalDurationMs: 180_000 }, // 3 minutes
    events,
    DEFAULT_SCORE_CONFIG,
  )

  // Start interval at 0ms
  manager.startInterval(0)

  // Add frames for 3 minutes
  for (let i = 0; i < 6; i++) {
    manager.addFrame(createFrame(i * 30_000))
  }

  // Add the final frame to trigger completion
  manager.addFrame(createFrame(180_000))

  assert.equal(completedIntervals.length, 1)
  assert.equal(discardedIntervals.length, 0)
  assert.equal(completedIntervals[0].state, 'completed')
})

test('IntervalManager - interval less than 3 minutes does not complete', () => {
  const completedIntervals: import('./intervalTypes.ts').Interval[] = []

  const events = {
    onIntervalCompleted: (interval: import('./intervalTypes.ts').Interval) => {
      completedIntervals.push(interval)
    },
    onIntervalDiscarded: () => {},
  }

  const manager = new IntervalManager(
    { intervalDurationMs: 180_000 },
    events,
    DEFAULT_SCORE_CONFIG,
  )

  manager.startInterval(0)
  manager.addFrame(createFrame(60_000)) // 1 minute

  assert.equal(completedIntervals.length, 0)
})

test('IntervalManager - discard on mode change', () => {
  const completedIntervals: import('./intervalTypes.ts').Interval[] = []
  const discardedIntervals: import('./intervalTypes.ts').Interval[] = []

  const events = {
    onIntervalCompleted: (interval: import('./intervalTypes.ts').Interval) => {
      completedIntervals.push(interval)
    },
    onIntervalDiscarded: (interval: import('./intervalTypes.ts').Interval) => {
      discardedIntervals.push(interval)
    },
  }

  const manager = new IntervalManager(
    { intervalDurationMs: 180_000 },
    events,
    DEFAULT_SCORE_CONFIG,
  )

  manager.startInterval(0)
  manager.addFrame(createFrame(30_000))

  // Discard incomplete interval (simulating mode change)
  manager.discardCurrentInterval()

  assert.equal(completedIntervals.length, 0)
  assert.equal(discardedIntervals.length, 1)
  assert.equal(discardedIntervals[0].state, 'discarded')
})

test('IntervalManager - prevent undetected frames at 0 score', () => {
  const completedIntervals: import('./intervalTypes.ts').Interval[] = []

  const events = {
    onIntervalCompleted: (interval: import('./intervalTypes.ts').Interval) => {
      completedIntervals.push(interval)
    },
    onIntervalDiscarded: () => {},
  }

  const manager = new IntervalManager(
    { intervalDurationMs: 180_000 },
    events,
    DEFAULT_SCORE_CONFIG,
  )

  manager.startInterval(0)

  // Mix of detected and undetected frames
  manager.addFrame(createFrame(0, 1)) // detected
  manager.addFrame(createFrame(30_000, 0)) // undetected (visibility = 0)
  manager.addFrame(createFrame(60_000, 1)) // detected
  manager.addFrame(createFrame(90_000, 0)) // undetected
  manager.addFrame(createFrame(120_000, 1)) // detected
  manager.addFrame(createFrame(150_000, 1)) // detected
  manager.addFrame(createFrame(180_000, 0)) // undetected

  assert.equal(completedIntervals.length, 1)
  assert.equal(completedIntervals[0].frames.length, 7)
  // Score calculation should include all frames (detected and undetected)
})

test('IntervalManager - multiple intervals aggregation', () => {
  const completedIntervals: import('./intervalTypes.ts').Interval[] = []

  const events = {
    onIntervalCompleted: (interval: import('./intervalTypes.ts').Interval) => {
      completedIntervals.push(interval)
    },
    onIntervalDiscarded: () => {},
  }

  const manager = new IntervalManager(
    { intervalDurationMs: 180_000 },
    events,
    DEFAULT_SCORE_CONFIG,
  )

  // First interval
  manager.startInterval(0)
  for (let i = 0; i <= 6; i++) {
    manager.addFrame(createFrame(i * 30_000))
  }

  // Second interval
  manager.startInterval(180_000)
  for (let i = 0; i <= 6; i++) {
    manager.addFrame(createFrame(180_000 + i * 30_000))
  }

  assert.equal(completedIntervals.length, 2)

  const aggregated = manager.getAggregatedScore()
  assert.equal(aggregated.intervalCount, 2)
})

test('IntervalManager - no double counting', () => {
  const completedIntervals: import('./intervalTypes.ts').Interval[] = []

  const events = {
    onIntervalCompleted: (interval: import('./intervalTypes.ts').Interval) => {
      completedIntervals.push(interval)
    },
    onIntervalDiscarded: () => {},
  }

  const manager = new IntervalManager(
    { intervalDurationMs: 180_000 },
    events,
    DEFAULT_SCORE_CONFIG,
  )

  manager.startInterval(0)
  for (let i = 0; i <= 6; i++) {
    manager.addFrame(createFrame(i * 30_000))
  }

  const intervals1 = manager.getCompletedIntervals()

  // Adding more frames to non-existent interval (already completed)
  manager.addFrame(createFrame(210_000))

  const intervals2 = manager.getCompletedIntervals()

  assert.equal(intervals1.length, 1)
  assert.equal(intervals2.length, 1) // Still only 1 interval
})
