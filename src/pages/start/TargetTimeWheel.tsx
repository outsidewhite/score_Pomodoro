import {
  WheelPicker,
  WheelPickerWrapper,
  type WheelPickerOption,
} from '@ncdai/react-wheel-picker'
import '@ncdai/react-wheel-picker/style.css'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import {
  formatTimeUnit,
  TARGET_TIME_UNIT_MAX,
  type TargetTimeParts,
  type TargetTimeUnit,
} from './targetTime.ts'
import './TargetTimeWheel.css'

type TargetTimeWheelProps = {
  onChange: (unit: TargetTimeUnit, value: number) => void
  value: TargetTimeParts
}

// ライブラリの描画順と同じ並びで、各ホイールへ単位を対応付ける。
const UNITS: TargetTimeUnit[] = ['hours', 'minutes']
const PAGE_STEP = 10

const WHEEL_LABEL: Record<TargetTimeUnit, string> = {
  hours: '目標時間の時間',
  minutes: '目標時間の分',
}

const VALUE_SUFFIX: Record<TargetTimeUnit, string> = {
  hours: '時間',
  minutes: '分',
}

function createOptions(max: number): WheelPickerOption<number>[] {
  return Array.from({ length: max + 1 }, (_, value) => ({
    label: formatTimeUnit(value),
    value,
  }))
}

// optionsの参照が変わるとライブラリが位置を再計算するため、モジュール定数として固定する。
const OPTIONS: Record<TargetTimeUnit, WheelPickerOption<number>[]> = {
  hours: createOptions(TARGET_TIME_UNIT_MAX.hours),
  minutes: createOptions(TARGET_TIME_UNIT_MAX.minutes),
}

const WHEEL_CLASS_NAMES = {
  highlightItem: 'target-time-wheel__highlight-item',
  highlightWrapper: 'target-time-wheel__highlight',
  optionItem: 'target-time-wheel__option',
}

function isTargetTimeUnit(value: string | undefined): value is TargetTimeUnit {
  return value === 'hours' || value === 'minutes'
}

function getKeyboardValue(key: string, current: number, max: number) {
  switch (key) {
    case 'ArrowUp':
      return Math.min(max, current + 1)
    case 'ArrowDown':
      return Math.max(0, current - 1)
    case 'PageUp':
      return Math.min(max, current + PAGE_STEP)
    case 'PageDown':
      return Math.max(0, current - PAGE_STEP)
    case 'Home':
      return 0
    case 'End':
      return max
    default:
      return null
  }
}

export function TargetTimeWheel({ onChange, value }: TargetTimeWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const pickers =
      containerRef.current?.querySelectorAll<HTMLElement>('[data-rwp]') ?? []

    // ライブラリはフォーカス要素へARIA属性を渡せないため、描画後に数値入力として名前と値を補う。
    pickers.forEach((picker, index) => {
      const unit = UNITS[index]
      if (!unit) return

      picker.dataset.unit = unit
      picker.setAttribute('role', 'spinbutton')
      picker.setAttribute('aria-label', WHEEL_LABEL[unit])
      picker.setAttribute('aria-valuemin', '0')
      picker.setAttribute('aria-valuemax', String(TARGET_TIME_UNIT_MAX[unit]))
      picker.setAttribute('aria-valuenow', String(value[unit]))
      picker.setAttribute('aria-valuetext', `${value[unit]}${VALUE_SUFFIX[unit]}`)
    })
  }, [value])

  // 標準の↓で増える操作をspinbuttonの慣習(↑で増加)へ揃え、アニメーションを待たずに確定する。
  // 左右キーによる列移動と数字の先頭一致検索はライブラリの処理をそのまま使う。
  const handleKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return

    const unit = (event.target as HTMLElement).dataset.unit
    if (!isTargetTimeUnit(unit)) return

    const nextValue = getKeyboardValue(
      event.key,
      value[unit],
      TARGET_TIME_UNIT_MAX[unit],
    )
    if (nextValue === null) return

    event.preventDefault()
    event.stopPropagation()
    if (nextValue !== value[unit]) onChange(unit, nextValue)
  }

  return (
    <div
      ref={containerRef}
      className="target-time-wheel"
      onKeyDownCapture={handleKeyDownCapture}
    >
      <WheelPickerWrapper className="target-time-wheel__wrapper">
        {UNITS.map((unit) => (
          <WheelPicker
            key={unit}
            classNames={WHEEL_CLASS_NAMES}
            onValueChange={(nextValue) => onChange(unit, nextValue)}
            optionItemHeight={36}
            options={OPTIONS[unit]}
            value={value[unit]}
            visibleCount={16}
          />
        ))}
      </WheelPickerWrapper>
    </div>
  )
}
