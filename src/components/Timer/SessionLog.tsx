import type { TimerLogEntry, TimerMode } from './timerTypes.ts'
import './SessionLog.css'

type SessionLogProps = {
  currentTimeMs: number
  entries: TimerLogEntry[]
}

const MODE_LABELS: Record<TimerMode, string> = {
  away: '離席',
  break: '休憩',
  focus: '集中',
}

function formatLogDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return [minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

export function SessionLog({ currentTimeMs, entries }: SessionLogProps) {
  return (
    <section className="session-log" aria-label="セッションログ">
      <h3>セッションログ</h3>

      {entries.length === 0 ? (
        <p className="session-log__empty">
          タイマーを開始するとログが表示されます
        </p>
      ) : (
        <ol aria-live="polite">
          {entries.map((entry) => (
            <li
              className={`session-log__entry session-log__entry--${entry.mode}`}
              key={entry.id}
            >
              <time>
                {formatLogDuration(
                  (entry.endedAt ?? currentTimeMs) - entry.startedAt,
                )}
              </time>
              <span>{MODE_LABELS[entry.mode]}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
