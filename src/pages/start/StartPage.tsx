import { useRef, useState, type FormEvent } from 'react'
import { AppHeader } from '../../components/ui/AppHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { CautionList, type CautionItem } from '../../components/ui/CautionList.tsx'
import {
  formatTimeUnit,
  getTimeUnitError,
  parseTimeUnit,
  splitTargetMinutes,
  toTargetMinutes,
  type TargetTimeParts,
  type TargetTimeUnit,
} from './targetTime.ts'
import { TargetTimeWheel } from './TargetTimeWheel.tsx'
import './StartPage.css'

export type SessionSettings = {
  targetMinutes: number
}

type StartPageProps = {
  cameraError?: string | null
  initialSettings?: SessionSettings
  isPreparing?: boolean
  onStart: (settings: SessionSettings) => void | Promise<void>
}

type TargetTimeInputs = Record<TargetTimeUnit, string>

const DEFAULT_SETTINGS: SessionSettings = {
  targetMinutes: 25,
}

const UNITS: TargetTimeUnit[] = ['hours', 'minutes']

const UNIT_LABEL: Record<TargetTimeUnit, string> = {
  hours: '時間',
  minutes: '分',
}

const CAUTION_ITEMS: CautionItem[] = [
  { id: 'tab-switch', text: 'タブを切り替えると正しく計測できません。' },
  { id: 'camera-framing', text: 'カメラには肩まで映るように調整してください。' },
  { id: 'tab-close', text: '計測中にタブを閉じると、計測結果が破棄されます。' },
]

function formatTargetTimeInputs({ hours, minutes }: TargetTimeParts) {
  return {
    hours: formatTimeUnit(hours),
    minutes: formatTimeUnit(minutes),
  }
}

export function StartPage({
  cameraError = null,
  initialSettings = DEFAULT_SETTINGS,
  isPreparing = false,
  onStart,
}: StartPageProps) {
  // 入力欄は入力途中の文字列を保持し、ホイールには最後に有効だった時・分を渡す。
  const [wheelValue, setWheelValue] = useState(() =>
    splitTargetMinutes(initialSettings.targetMinutes),
  )
  const [inputs, setInputs] = useState<TargetTimeInputs>(() =>
    formatTargetTimeInputs(splitTargetMinutes(initialSettings.targetMinutes)),
  )
  // 空欄は入力途中にもなるため、フォーカスを外すか送信した後だけエラーとして示す。
  const [touched, setTouched] = useState<Record<TargetTimeUnit, boolean>>({
    hours: false,
    minutes: false,
  })
  const hoursInputRef = useRef<HTMLInputElement>(null)
  const minutesInputRef = useRef<HTMLInputElement>(null)
  const inputRefs = { hours: hoursInputRef, minutes: minutesInputRef }

  const getVisibleError = (unit: TargetTimeUnit) => {
    const error = getTimeUnitError(inputs[unit], unit)
    return error && (inputs[unit].trim() !== '' || touched[unit]) ? error : null
  }
  const visibleErrors: Record<TargetTimeUnit, string | null> = {
    hours: getVisibleError('hours'),
    minutes: getVisibleError('minutes'),
  }

  const handleInputChange = (unit: TargetTimeUnit, text: string) => {
    setInputs((current) => ({ ...current, [unit]: text }))
    const value = parseTimeUnit(text, unit)
    if (value !== null) {
      setWheelValue((current) =>
        current[unit] === value ? current : { ...current, [unit]: value },
      )
    }
  }

  const handleInputBlur = (unit: TargetTimeUnit) => {
    const value = parseTimeUnit(inputs[unit], unit)
    if (value === null) {
      setTouched((current) => ({ ...current, [unit]: true }))
      return
    }
    // 入力を終えた時点でだけ2桁表示へ揃え、入力中の文字列は書き換えない。
    setInputs((current) => ({ ...current, [unit]: formatTimeUnit(value) }))
  }

  const handleWheelChange = (unit: TargetTimeUnit, value: number) => {
    setWheelValue((current) => ({ ...current, [unit]: value }))
    setInputs((current) => ({ ...current, [unit]: formatTimeUnit(value) }))
    setTouched((current) => ({ ...current, [unit]: false }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const hours = parseTimeUnit(inputs.hours, 'hours')
    const minutes = parseTimeUnit(inputs.minutes, 'minutes')

    if (hours === null || minutes === null) {
      setTouched({ hours: true, minutes: true })
      inputRefs[hours === null ? 'hours' : 'minutes'].current?.focus()
      return
    }

    const nextTime = { hours, minutes }
    setInputs(formatTargetTimeInputs(nextTime))
    onStart({ targetMinutes: toTargetMinutes(nextTime) })
  }

  return (
    <main className="start-page">
      <AppHeader status="セッション設定" statusTone="setup" />

      <form className="start-page__form" onSubmit={handleSubmit}>
        <div className="start-page__intro">
          <p>READY TO FOCUS?</p>
          <h1>集中セッションを始めましょう</h1>
          <span>作業時間を設定して、あなたの集中をスコアに残します。</span>
        </div>

        <div className="start-page__layout">
          <div className="start-page__cautions">
            <CautionList items={CAUTION_ITEMS} />
          </div>

          {/* 計測画面と同じ機能色を使い、時間設定をひと目で把握できるようにする。 */}
          <div className="start-page__settings">
            <section
              className="setting-card setting-card--time"
              aria-labelledby="target-time-title"
            >
              <div className="setting-card__heading">
                <span
                  className="setting-card__icon setting-card__icon--clock"
                  aria-hidden="true"
                />
                <div>
                  <p>SESSION LENGTH</p>
                  <h2 id="target-time-title">目標時間</h2>
                </div>
              </div>

              <div className="setting-card__control">
                <div className="target-time-fields">
                  {UNITS.map((unit, index) => (
                    <div className="target-time-fields__item" key={unit}>
                      {index > 0 && (
                        <span className="target-time-fields__separator" aria-hidden="true">
                          :
                        </span>
                      )}
                      <div className="target-time-field">
                        <input
                          ref={inputRefs[unit]}
                          id={`target-time-${unit}`}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={2}
                          value={inputs[unit]}
                          aria-invalid={visibleErrors[unit] ? true : undefined}
                          aria-describedby={
                            visibleErrors[unit] ? `target-time-${unit}-error` : undefined
                          }
                          onBlur={() => handleInputBlur(unit)}
                          onChange={(event) => handleInputChange(unit, event.target.value)}
                        />
                        <label htmlFor={`target-time-${unit}`}>
                          <span className="sr-only">目標時間の</span>
                          {UNIT_LABEL[unit]}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <TargetTimeWheel value={wheelValue} onChange={handleWheelChange} />

                {/* 領域を常に置いておき、エラー文の追加をスクリーンリーダーへ確実に伝える。 */}
                <div className="setting-card__errors" aria-live="polite">
                  {UNITS.map((unit) =>
                    visibleErrors[unit] ? (
                      <p key={unit} id={`target-time-${unit}-error`}>
                        {visibleErrors[unit]}
                      </p>
                    ) : null,
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="start-page__action">
          <Button type="submit" disabled={isPreparing}>
            {isPreparing ? '準備中…' : 'START'}
          </Button>
          <span>カメラの準備後、タイマーがスタートします</span>
          {cameraError && (
            <p className="start-page__camera-error" role="alert">
              {cameraError}
            </p>
          )}
        </div>
      </form>
    </main>
  )
}
