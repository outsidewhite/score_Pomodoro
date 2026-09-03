import { useEffect, useRef, useState } from 'react'
import './Timer.css'

type TimerMode = 'away' | 'break' | 'focus'

type RunningTimerMode = Exclude<TimerMode, 'away'>
type TimerDurations = Record<RunningTimerMode, number>

type TimerSnapshot = {
  durationsMs: TimerDurations
  totalWorkMs: number
}

type TimerProps = {
  disabled?: boolean
  initialElapsedMs?: number
  onExit: (snapshot: TimerSnapshot) => void
  targetMinutes?: number
}

const BREAK_LIMIT_MS = 10 * 60 * 1_000

function formatElapsedTime(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1_000))
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.2 5.4v13.2L19 12 8.2 5.4Z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
    </svg>
  )
}

function ExitIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 4H5.8A1.8 1.8 0 0 0 4 5.8v12.4A1.8 1.8 0 0 0 5.8 20H13" />
      <path d="M10 12h10m-3.5-3.5L20 12l-3.5 3.5" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.2 15.4A8 8 0 0 1 8.6 4.8 8 8 0 1 0 19.2 15.4Z" />
    </svg>
  )
}

export function Timer({
  disabled = false,
  initialElapsedMs = 0,
  onExit,
  targetMinutes,
}: TimerProps) {
  // 集中と休憩を個別に保持し、表示時に作業時間として合計する。
  const initialDurations: TimerDurations = {
    break: 0,
    focus: Math.max(0, initialElapsedMs),
  }
  const durationsRef = useRef<TimerDurations>(initialDurations)
  const breakStartedAtDurationRef = useRef(0)
  const wasRunningBeforeExitRef = useRef<boolean | null>(null)
  const cancelExitButtonRef = useRef<HTMLButtonElement>(null)
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null)
  const [durations, setDurations] = useState<TimerDurations>(initialDurations)
  const [displayNow, setDisplayNow] = useState(0)
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState<RunningTimerMode>('focus')

  useEffect(() => {
    if (!isRunning) {
      return
    }

    // 表示更新の回数ではなく開始時刻との差から経過時間を算出する。
    const timerId = window.setInterval(() => setDisplayNow(Date.now()), 250)
    return () => window.clearInterval(timerId)
  }, [isRunning])

  const commitActiveTime = (now: number) => {
    if (activeStartedAt === null) {
      return
    }

    const nextDurations = {
      ...durationsRef.current,
      [mode]: durationsRef.current[mode] + Math.max(0, now - activeStartedAt),
    }
    durationsRef.current = nextDurations
    setDurations(nextDurations)
  }

  const handlePlayToggle = () => {
    // 休憩中は右側の集中ボタンでのみ集中状態へ戻せるようにする。
    if (isRunning && mode === 'break') {
      return
    }

    const now = Date.now()
    if (isRunning) {
      commitActiveTime(now)
      setActiveStartedAt(null)
      setIsRunning(false)
      setDisplayNow(now)
      return
    }

    setActiveStartedAt(now)
    setIsRunning(true)
    setDisplayNow(now)
  }

  const handleBreakToggle = () => {
    // 離席中は休憩・集中の内部モードを変更しない。
    if (!isRunning) {
      return
    }

    const now = Date.now()
    const nextMode: RunningTimerMode = mode === 'break' ? 'focus' : 'break'
    commitActiveTime(now)
    if (nextMode === 'break') {
      // 休憩へ入るたびに、10分制限の起点を更新する。
      breakStartedAtDurationRef.current = durationsRef.current.break
    }
    setActiveStartedAt(now)
    setDisplayNow(now)
    setMode(nextMode)
  }

  const handleExitRequest = () => {
    const now = Date.now()
    commitActiveTime(now)
    wasRunningBeforeExitRef.current = isRunning
    setActiveStartedAt(null)
    setIsRunning(false)
    setIsExitDialogOpen(true)
    setDisplayNow(now)
  }

  const handleExitCancel = () => {
    const wasRunning = wasRunningBeforeExitRef.current
    if (wasRunning === null) {
      setIsExitDialogOpen(false)
      return
    }

    const now = Date.now()
    setIsRunning(wasRunning)
    setActiveStartedAt(wasRunning ? now : null)
    wasRunningBeforeExitRef.current = null
    setIsExitDialogOpen(false)
    setDisplayNow(now)
  }

  const handleExitConfirm = () => {
    setIsExitDialogOpen(false)
    wasRunningBeforeExitRef.current = null
    onExit({
      durationsMs: durationsRef.current,
      totalWorkMs:
        durationsRef.current.focus + durationsRef.current.break,
    })
  }

  useEffect(() => {
    if (mode !== 'break' || !isRunning || activeStartedAt === null) {
      return
    }

    const measuredBreakMs =
      durations.break - breakStartedAtDurationRef.current
    const remainingBreakMs = Math.max(0, BREAK_LIMIT_MS - measuredBreakMs)

    // 休憩として実際に計測した時間が10分に達したら、自動的に停止する。
    const breakLimitTimerId = window.setTimeout(() => {
      const now = Date.now()
      const nextDurations = {
        ...durationsRef.current,
        break:
          durationsRef.current.break +
          Math.min(
            Math.max(0, now - activeStartedAt),
            remainingBreakMs,
          ),
      }
      durationsRef.current = nextDurations
      setDurations(nextDurations)
      setActiveStartedAt(null)
      setIsRunning(false)
      // 10分経過後は休憩を解除し、次回の再生を集中モードから開始する。
      setMode('focus')
      setDisplayNow(now)
    }, remainingBreakMs)

    return () => window.clearTimeout(breakLimitTimerId)
  }, [activeStartedAt, durations.break, isRunning, mode])

  useEffect(() => {
    if (!isExitDialogOpen) {
      return
    }

    cancelExitButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cancelExitButtonRef.current?.click()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isExitDialogOpen])

  // 休憩時間も作業時間として扱い、離席時間だけを合計から除外する。
  const activeWorkMs =
    isRunning && activeStartedAt !== null
      ? Math.max(0, displayNow - activeStartedAt)
      : 0
  const totalWorkMs = durations.focus + durations.break + activeWorkMs
  // 停止中は離席と同じ表示・外部判定にし、再開先のモードだけ内部に保持する。
  const effectiveMode: TimerMode = isRunning ? mode : 'away'

  return (
    <div className={`session-timer session-timer--${effectiveMode}`}>
      <strong className="session-timer__time" aria-live="polite">
        {formatElapsedTime(totalWorkMs)}
      </strong>

      {targetMinutes !== undefined && (
        <p className="session-timer__target">目標時間 {targetMinutes}分</p>
      )}

      <div className="session-timer__controls" aria-label="タイマー操作">
        <button
          className="timer-control timer-control--small"
          type="button"
          aria-label="セッションを終了する"
          onClick={handleExitRequest}
          disabled={disabled}
        >
          <ExitIcon />
        </button>

        <button
          className="timer-control timer-control--main"
          type="button"
          aria-label={isRunning ? 'タイマーを停止する' : 'タイマーを開始する'}
          aria-pressed={isRunning}
          onClick={handlePlayToggle}
          disabled={disabled || (isRunning && mode === 'break')}
        >
          {isRunning ? <StopIcon /> : <PlayIcon />}
        </button>

        <button
          className={`timer-control timer-control--small ${effectiveMode === 'break' ? 'timer-control--selected' : ''}`}
          type="button"
          aria-label={mode === 'break' ? '集中に戻る' : '休憩に入る'}
          aria-pressed={effectiveMode === 'break'}
          onClick={handleBreakToggle}
          disabled={disabled || !isRunning}
        >
          <MoonIcon />
        </button>
      </div>

      {isExitDialogOpen && (
        <div className="timer-dialog-backdrop">
          <section
            className="timer-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="timer-exit-title"
            aria-describedby="timer-exit-description"
          >
            <div className="timer-dialog__icon">
              <ExitIcon />
            </div>
            <h2 id="timer-exit-title">セッションを終了しますか？</h2>
            <p id="timer-exit-description">
              現在までの計測結果を確定して、終了画面へ移動します。
            </p>
            <div className="timer-dialog__actions">
              <button
                ref={cancelExitButtonRef}
                type="button"
                onClick={handleExitCancel}
              >
                キャンセル
              </button>
              <button type="button" onClick={handleExitConfirm}>
                終了する
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
