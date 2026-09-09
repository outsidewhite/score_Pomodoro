import type { TimerMode } from '../Timer/timerTypes.ts'

// ヘッダーのランプ色を決める状態。各ページの状態表示と1対1で対応させる。
export type StatusTone =
  | 'away'
  | 'break'
  | 'complete'
  | 'measuring'
  | 'setup'

export type TimerStatus = {
  label: string
  tone: StatusTone
}

// 動作中のタイマーモードを、ヘッダーへ表示する状態名とランプ色へ変換する。
const TIMER_MODE_STATUSES: Record<TimerMode, TimerStatus> = {
  away: { label: '離席中', tone: 'away' },
  break: { label: '休憩中', tone: 'break' },
  focus: { label: '計測中', tone: 'measuring' },
}

export function getTimerStatus(mode: TimerMode): TimerStatus {
  return TIMER_MODE_STATUSES[mode]
}
