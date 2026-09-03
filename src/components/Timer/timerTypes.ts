export type TimerMode = 'away' | 'break' | 'focus'

export type RunningTimerMode = Exclude<TimerMode, 'away'>

export type TimerDurations = Record<RunningTimerMode, number>

// タイマーからログ表示へ渡す、状態が切り替わった時点の情報。
export type TimerLogEntry = {
  endedAt: number | null
  id: number
  mode: TimerMode
  startedAt: number
}
