import { useEffect, useRef, useState } from 'react'
import './Timer.css'

export type TimerMode = 'away' | 'break' | 'focus'

type TimerDurations = Record<TimerMode, number>

export type TimerSnapshot = {
  durationsMs: TimerDurations
  mode: TimerMode
  totalWorkMs: number
}

type TimerProps = {
  disabled?: boolean
  initialElapsedMs?: number
  onExit: (snapshot: TimerSnapshot) => void
  onModeChange?: (mode: TimerMode) => void
  targetMinutes?: number
}

const MODE_LABELS: Record<TimerMode, string> = {
  away: '離席',
  break: '休憩',
  focus: '集中',
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
  onModeChange,
  targetMinutes,
}: TimerProps) {
  // モードごとの経過時間を分けて保持し、集中時間へ休憩を加算しない。
  const initialDurations: TimerDurations = {
    away: 0,
    break: 0,
    focus: Math.max(0, initialElapsedMs),
  }
  const durationsRef = useRef<TimerDurations>(initialDurations)
  const breakStartedAtDurationRef = useRef(0)
  const beforeExitRef = useRef<{ isRunning: boolean; mode: TimerMode } | null>(null)
  const cancelExitButtonRef = useRef<HTMLButtonElement>(null)
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null)
  const [durations, setDurations] = useState<TimerDurations>(initialDurations)
  const [displayNow, setDisplayNow] = useState(0)
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState<TimerMode>('focus')

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
      return durationsRef.current
    }

    const nextDurations = {
      ...durationsRef.current,
      [mode]: durationsRef.current[mode] + Math.max(0, now - activeStartedAt),
    }
    durationsRef.current = nextDurations
    setDurations(nextDurations)
    return nextDurations
  }

  const changeMode = (nextMode: TimerMode) => {
    if (nextMode === mode) {
      return
    }

    const now = Date.now()
    commitActiveTime(now)
    if (nextMode === 'break') {
      // 休憩へ入るたびに、10分制限の起点を更新する。
      breakStartedAtDurationRef.current = durationsRef.current.break
    }
    setActiveStartedAt(isRunning ? now : null)
    setDisplayNow(now)
    setMode(nextMode)
    onModeChange?.(isRunning ? nextMode : 'away')
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
      onModeChange?.('away')
      return
    }

    // 自動停止後に休憩を再開する場合は、新しい10分間として計測する。
    if (mode === 'break') {
      breakStartedAtDurationRef.current = durationsRef.current.break
    }
    setActiveStartedAt(now)
    setIsRunning(true)
    setDisplayNow(now)
    onModeChange?.(mode)
  }

  const handleBreakToggle = () => {
    // 離席中は休憩・集中の内部モードを変更しない。
    if (!isRunning || mode === 'away') {
      return
    }

    changeMode(mode === 'break' ? 'focus' : 'break')
  }

  const handleExitRequest = () => {
    const now = Date.now()
    commitActiveTime(now)
    beforeExitRef.current = { isRunning, mode }
    setActiveStartedAt(null)
    setIsRunning(false)
    setMode('away')
    onModeChange?.('away')
    setIsExitDialogOpen(true)
    setDisplayNow(now)
  }

  const handleExitCancel = () => {
    const previousState = beforeExitRef.current
    if (!previousState) {
      setIsExitDialogOpen(false)
      return
    }

    const now = Date.now()
    setMode(previousState.mode)
    setIsRunning(previousState.isRunning)
    setActiveStartedAt(previousState.isRunning ? now : null)
    beforeExitRef.current = null
    setIsExitDialogOpen(false)
    setDisplayNow(now)
    onModeChange?.(previousState.isRunning ? previousState.mode : 'away')
  }

  const handleExitConfirm = () => {
    setIsExitDialogOpen(false)
    beforeExitRef.current = null
    onExit({
      durationsMs: durationsRef.current,
      mode: 'away',
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
      onModeChange?.('away')
    }, remainingBreakMs)

    return () => window.clearTimeout(breakLimitTimerId)
  }, [activeStartedAt, durations.break, isRunning, mode, onModeChange])

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
    isRunning && activeStartedAt !== null && mode !== 'away'
      ? Math.max(0, displayNow - activeStartedAt)
      : 0
  const totalWorkMs = durations.focus + durations.break + activeWorkMs
  // 停止中は離席と同じ表示・外部判定にし、再開先のモードだけ内部に保持する。
  const effectiveMode: TimerMode = isRunning ? mode : 'away'

  return (
    <div className={`session-timer session-timer--${effectiveMode}`}>
      <div className="session-timer__heading">
        <span>{MODE_LABELS[effectiveMode]}</span>
        {!isRunning && <small>停止中</small>}
      </div>

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
          disabled={disabled || mode === 'away' || (isRunning && mode === 'break')}
        >
          {isRunning ? <StopIcon /> : <PlayIcon />}
        </button>

        <button
          className={`timer-control timer-control--small ${effectiveMode === 'break' ? 'timer-control--selected' : ''}`}
          type="button"
          aria-label={mode === 'break' ? '集中に戻る' : '休憩に入る'}
          aria-pressed={effectiveMode === 'break'}
          onClick={handleBreakToggle}
          disabled={disabled || !isRunning || mode === 'away'}
        >
          <MoonIcon />
        </button>
      </div>

      <div className="session-timer__control-labels" aria-hidden="true">
        <span>退出</span>
        <span>{isRunning ? '停止' : '再生'}</span>
        <span>{mode === 'break' ? '集中' : '休憩'}</span>
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
