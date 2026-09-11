export type TargetTimeUnit = 'hours' | 'minutes'

export type TargetTimeParts = Record<TargetTimeUnit, number>

export const MAX_TARGET_HOURS = 23
export const MAX_TARGET_MINUTE = 59

export const TARGET_TIME_UNIT_MAX: Record<TargetTimeUnit, number> = {
  hours: MAX_TARGET_HOURS,
  minutes: MAX_TARGET_MINUTE,
}

const TARGET_TIME_UNIT_LABEL: Record<TargetTimeUnit, string> = {
  hours: '時間',
  minutes: '分',
}

export function formatTimeUnit(value: number) {
  return String(value).padStart(2, '0')
}

// 保存値が範囲外や不正値でも、ホイールの選択肢に存在する時・分へ丸める。
export function splitTargetMinutes(targetMinutes: number): TargetTimeParts {
  const maxMinutes = MAX_TARGET_HOURS * 60 + MAX_TARGET_MINUTE
  const totalMinutes = Number.isFinite(targetMinutes)
    ? Math.min(maxMinutes, Math.max(0, Math.floor(targetMinutes)))
    : 0

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  }
}

export function toTargetMinutes({ hours, minutes }: TargetTimeParts) {
  return hours * 60 + minutes
}

// 全角数字も受け付け、符号・小数・3桁以上・範囲外は無効として扱う。
export function parseTimeUnit(text: string, unit: TargetTimeUnit) {
  const normalized = text.normalize('NFKC').trim()
  if (!/^\d{1,2}$/.test(normalized)) return null

  const value = Number(normalized)
  return value <= TARGET_TIME_UNIT_MAX[unit] ? value : null
}

export function getTimeUnitError(text: string, unit: TargetTimeUnit) {
  const label = TARGET_TIME_UNIT_LABEL[unit]
  if (text.trim() === '') return `${label}を入力してください`
  if (parseTimeUnit(text, unit) !== null) return null

  return `${label}は00〜${formatTimeUnit(TARGET_TIME_UNIT_MAX[unit])}の数字で入力してください`
}
