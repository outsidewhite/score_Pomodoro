import './TimerProgress.css'

type TimerProgressProps = {
  elapsedMs: number
  targetMinutes: number
}

// 目標時間の目盛りは分:秒で表示し、メインタイマーの時:分:秒と見分けられるようにする。
function formatTargetLabel(targetMinutes: number) {
  const totalSeconds = Math.round(targetMinutes * 60)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return [minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

export function TimerProgress({ elapsedMs, targetMinutes }: TimerProgressProps) {
  const targetMs = targetMinutes * 60_000

  // 目標時間が未設定・0以下・不正値のときは除算せず、シークバー自体を表示しない。
  if (!Number.isFinite(targetMs) || targetMs <= 0) {
    return null
  }

  const measuredMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0
  // 目標時間を超過しても100%で止め、進捗率と塗り幅へ同じ整数を使う。
  const progressPercent = Math.round(Math.min(1, measuredMs / targetMs) * 100)

  return (
    <div className="timer-progress">
      <div
        className="timer-progress__track"
        role="progressbar"
        aria-label="目標時間の進捗"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
      >
        <div
          className="timer-progress__fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <span className="timer-progress__value">{progressPercent}%</span>

      <div className="timer-progress__scale" aria-hidden="true">
        <span>00:00</span>
        <span>{formatTargetLabel(targetMinutes)}</span>
      </div>
    </div>
  )
}
