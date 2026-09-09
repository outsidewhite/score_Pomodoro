import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  RunningTimerMode,
  TimerDurations,
  TimerLogEntry,
  TimerMode,
} from './timerTypes.ts'
import './Timer.css'

type TimerProps = {
  autoPauseRequest?: number
  disabled?: boolean
  initialElapsedMs?: number
  onClockUpdate?: (currentTimeMs: number) => void
  onExit: () => void
  onLogEntry?: (entry: TimerLogEntry) => void
  onModeChange?: (mode: TimerMode) => void
  startDisabled?: boolean
  targetMinutes?: number
}

const BREAK_LIMIT_MS = 10 * 60 * 1_000

function truncateToWholeSeconds(durationMs: number) {
  return Math.floor(Math.max(0, durationMs) / 1_000) * 1_000
}

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
  autoPauseRequest = 0,
  disabled = false,
  initialElapsedMs = 0,
  onClockUpdate,
  onExit,
  onLogEntry,
  onModeChange,
  startDisabled = false,
  targetMinutes,
}: TimerProps) {
  // 集中と休憩を個別に保持し、表示時に作業時間として合計する。
  const initialDurations: TimerDurations = {
    break: 0,
    focus: truncateToWholeSeconds(initialElapsedMs),
  }
  const durationsRef = useRef<TimerDurations>(initialDurations)
  const breakStartedAtDurationRef = useRef(0)
  const logIdRef = useRef(0)
  const wasRunningBeforeExitRef = useRef<boolean | null>(null)
  const cancelExitButtonRef = useRef<HTMLButtonElement>(null)
  const handledAutoPauseRequestRef = useRef(autoPauseRequest)
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null)
  const [durations, setDurations] = useState<TimerDurations>(initialDurations)
  const [displayNow, setDisplayNow] = useState(0)
  const [hasSessionStarted, setHasSessionStarted] = useState(false)
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState<RunningTimerMode>('focus')

  // メインタイマーとログへ、同じ現在時刻を同時に反映する。
  const syncClock = useCallback(
    (now: number) => {
      setDisplayNow(now)
      onClockUpdate?.(now)
    },
    [onClockUpdate],
  )

  // 状態変更時の開始時刻とモードを、一意なログとして親へ通知する。
  const emitLog = useCallback(
    (logMode: TimerMode, startedAt: number) => {
      logIdRef.current += 1
      onLogEntry?.({
        endedAt: null,
        id: logIdRef.current,
        mode: logMode,
        startedAt,
      })
    },
    [onLogEntry],
  )

  useEffect(() => {
    if (!hasSessionStarted) {
      return
    }

    // 1本のクロックを共有し、停止中の離席ログも同じ周期で更新する。
    const timerId = window.setInterval(() => syncClock(Date.now()), 250)
    return () => window.clearInterval(timerId)
  }, [hasSessionStarted, syncClock])

  const commitActiveTime = useCallback((now: number) => {
    if (activeStartedAt === null) {
      return
    }

    const nextDurations: TimerDurations = {
      ...durationsRef.current,
      // モード切替時に端数を捨て、次のログとメインタイマーの秒境界を揃える。
      [mode]: truncateToWholeSeconds(
        durationsRef.current[mode] + Math.max(0, now - activeStartedAt),
      ),
    }
    durationsRef.current = nextDurations
    setDurations(nextDurations)
  }, [activeStartedAt, mode])

  const pauseTimer = useCallback((now: number) => {
    if (!isRunning) return
    commitActiveTime(now)
    setActiveStartedAt(null)
    setIsRunning(false)
    syncClock(now)
    emitLog('away', now)
  }, [commitActiveTime, emitLog, isRunning, syncClock])

  const handlePlayToggle = () => {
    // 休憩中は右側の集中ボタンでのみ集中状態へ戻せるようにする。
    if (isRunning && mode === 'break') {
      return
    }

    const now = Date.now()
    if (isRunning) {
      pauseTimer(now)
      return
    }

    setHasSessionStarted(true)
    setActiveStartedAt(now)
    setIsRunning(true)
    syncClock(now)
    emitLog(mode, now)
  }

  useEffect(() => {
    if (autoPauseRequest === handledAutoPauseRequestRef.current) return
    handledAutoPauseRequestRef.current = autoPauseRequest

    // 姿勢解析からの離席要求も手動停止と同じ経路で時間とログを確定する。
    if (isRunning && mode === 'focus') {
      // oxlint-disable-next-line react/set-state-in-effect -- 外部イベントをタイマー内部の停止処理へ同期する。
      pauseTimer(Date.now())
    }
  }, [autoPauseRequest, isRunning, mode, pauseTimer])

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
    syncClock(now)
    setMode(nextMode)
    emitLog(nextMode, now)
  }

  const handleExitRequest = () => {
    const now = Date.now()
    commitActiveTime(now)
    if (isRunning) {
      // 終了確認中もタイマーが止まるため、離席区間として記録する。
      emitLog('away', now)
    }
    wasRunningBeforeExitRef.current = isRunning
    setActiveStartedAt(null)
    setIsRunning(false)
    setIsExitDialogOpen(true)
    syncClock(now)
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
    syncClock(now)
    if (wasRunning) {
      emitLog(mode, now)
    }
  }

  const handleExitConfirm = () => {
    setIsExitDialogOpen(false)
    wasRunningBeforeExitRef.current = null
    onExit()
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
      syncClock(now)
      // タイマー処理が遅延しても、ログ上の休憩は10分で確定する。
      emitLog('away', activeStartedAt + remainingBreakMs)
    }, remainingBreakMs)

    return () => window.clearTimeout(breakLimitTimerId)
  }, [activeStartedAt, durations.break, emitLog, isRunning, mode, syncClock])

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

  useEffect(() => {
    // 姿勢解析などの外部処理へ、実際に動作しているタイマーモードを通知する。
    onModeChange?.(effectiveMode)
  }, [effectiveMode, onModeChange])

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
          disabled={
            disabled ||
            (!isRunning && startDisabled) ||
            (isRunning && mode === 'break')
          }
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
