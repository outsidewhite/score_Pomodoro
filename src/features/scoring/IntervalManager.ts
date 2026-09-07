import { calculateScore } from './calculateScore.ts'
import type { ScoreConfig } from './scoreTypes.ts'
import type { Interval, IntervalManagerConfig, IntervalManagerEvents } from './intervalTypes.ts'
import type { PoseFrame } from '../pose/poseTypes.ts'

export class IntervalManager {
  private config: IntervalManagerConfig
  private events: IntervalManagerEvents
  private currentInterval: Interval | null = null
  private completedIntervals: Interval[] = []
  private scoreConfig: ScoreConfig
  private nextIntervalId = 0

  constructor(
    config: IntervalManagerConfig,
    events: IntervalManagerEvents,
    scoreConfig: ScoreConfig,
  ) {
    this.config = config
    this.events = events
    this.scoreConfig = scoreConfig
  }

  startInterval(startTimeMs: number): void {
    // Discard previous incomplete interval if any
    if (this.currentInterval && this.currentInterval.state === 'recording') {
      this.discardCurrentInterval()
    }

    this.currentInterval = {
      id: `interval-${this.nextIntervalId++}`,
      startTimeMs,
      endTimeMs: null,
      frames: [],
      score: null,
      state: 'recording',
    }
  }

  addFrame(frame: PoseFrame): void {
    if (!this.currentInterval || this.currentInterval.state !== 'recording') {
      return
    }

    this.currentInterval.frames.push(frame)
    this.checkIntervalCompletion(frame.timestampMs)
  }

  private checkIntervalCompletion(currentTimeMs: number): void {
    if (!this.currentInterval || this.currentInterval.state !== 'recording') {
      return
    }

    const elapsedMs = currentTimeMs - this.currentInterval.startTimeMs
    if (elapsedMs >= this.config.intervalDurationMs) {
      this.completeCurrentInterval(currentTimeMs)
    }
  }

  private completeCurrentInterval(endTimeMs: number): void {
    if (!this.currentInterval || this.currentInterval.state !== 'recording') {
      return
    }

    this.currentInterval.endTimeMs = endTimeMs
    this.currentInterval.state = 'completed'

    // Calculate score for completed interval
    this.currentInterval.score = calculateScore(
      this.currentInterval.frames,
      this.scoreConfig,
    )

    this.completedIntervals.push(this.currentInterval)
    this.events.onIntervalCompleted(this.currentInterval)

    // Reset for next interval
    this.currentInterval = null
  }

  discardCurrentInterval(): void {
    if (!this.currentInterval) {
      return
    }

    this.currentInterval.state = 'discarded'
    this.events.onIntervalDiscarded(this.currentInterval)
    this.currentInterval = null
  }

  getCurrentInterval(): Interval | null {
    return this.currentInterval
  }

  getCompletedIntervals(): Interval[] {
    return [...this.completedIntervals]
  }

  getTotalScore(): number {
    return this.completedIntervals.reduce((sum, interval) => {
      return sum + (interval.score?.totalScore ?? 0)
    }, 0)
  }

  getAggregatedScore() {
    if (this.completedIntervals.length === 0) {
      return {
        totalScore: 0,
        postureScore: 0,
        stabilityScore: 0,
        presenceScore: 0,
        measuredDurationMs: 0,
        intervalCount: 0,
      }
    }

    const totalDurationMs = this.completedIntervals.reduce(
      (sum, interval) => sum + (interval.score?.measuredDurationMs ?? 0),
      0,
    )

    // Average scores across all intervals
    const avgPostureScore =
      this.completedIntervals.reduce((sum, interval) => {
        return sum + (interval.score?.postureScore ?? 0)
      }, 0) / this.completedIntervals.length

    const avgStabilityScore =
      this.completedIntervals.reduce((sum, interval) => {
        return sum + (interval.score?.stabilityScore ?? 0)
      }, 0) / this.completedIntervals.length

    const avgPresenceScore =
      this.completedIntervals.reduce((sum, interval) => {
        return sum + (interval.score?.presenceScore ?? 0)
      }, 0) / this.completedIntervals.length

    const avgTotalScore =
      this.completedIntervals.reduce((sum, interval) => {
        return sum + (interval.score?.totalScore ?? 0)
      }, 0) / this.completedIntervals.length

    return {
      totalScore: Math.round(avgTotalScore),
      postureScore: Math.round(avgPostureScore),
      stabilityScore: Math.round(avgStabilityScore),
      presenceScore: Math.round(avgPresenceScore),
      measuredDurationMs: totalDurationMs,
      intervalCount: this.completedIntervals.length,
    }
  }

  reset(): void {
    this.currentInterval = null
    this.completedIntervals = []
    this.nextIntervalId = 0
  }
}
