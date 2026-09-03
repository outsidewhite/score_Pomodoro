import { useState, type FormEvent } from 'react'
import { AppHeader } from '../../components/ui/AppHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import './StartPage.css'

export type SessionSettings = {
  targetMinutes: number
  targetScore: number
}

type StartPageProps = {
  initialSettings?: SessionSettings
  isPreparing?: boolean
  onStart: (settings: SessionSettings) => void
}

const DEFAULT_SETTINGS: SessionSettings = {
  targetMinutes: 25,
  targetScore: 80,
}

function parseSettingValue(value: string) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

export function StartPage({
  initialSettings = DEFAULT_SETTINGS,
  isPreparing = false,
  onStart,
}: StartPageProps) {
  // 入力値へ独自の上限・下限を設けず、そのままセッション設定として扱う。
  const [targetMinutesInput, setTargetMinutesInput] = useState(String(initialSettings.targetMinutes))
  const [targetScoreInput, setTargetScoreInput] = useState(String(initialSettings.targetScore))
  const targetMinutes = parseSettingValue(targetMinutesInput)
  const targetScore = parseSettingValue(targetScoreInput)

  const updateTargetMinutes = (value: number) => {
    setTargetMinutesInput(String(value))
  }

  const updateTargetScore = (value: number) => {
    setTargetScoreInput(String(value))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextSettings = {
      targetMinutes,
      targetScore,
    }

    setTargetMinutesInput(String(nextSettings.targetMinutes))
    setTargetScoreInput(String(nextSettings.targetScore))
    onStart(nextSettings)
  }

  return (
    <main className="start-page">
      <AppHeader status="セッション設定" statusTone="setup" />

      <form className="start-page__form" onSubmit={handleSubmit}>
        <div className="start-page__intro">
          <p>READY TO FOCUS?</p>
          <h1>集中セッションを始めましょう</h1>
          <span>今日の目標を設定して、あなたの集中をスコアに残します。</span>
        </div>

        {/* 計測画面と同じ機能色を使い、2つの目標を横並びで比較できるようにする。 */}
        <div className="start-page__settings">
          <section
            className="setting-card setting-card--time"
            aria-labelledby="target-time-title"
          >
            <div className="setting-card__heading">
              <span className="setting-card__icon setting-card__icon--clock" aria-hidden="true" />
              <div>
                <p>SESSION LENGTH</p>
                <h2 id="target-time-title">目標時間</h2>
              </div>
            </div>

            <div className="setting-card__control">
              <button
                type="button"
                aria-label="目標時間を1分減らす"
                onClick={() => updateTargetMinutes(targetMinutes - 1)}
              >
                −
              </button>
              <label>
                <span className="sr-only">目標時間（分）</span>
                <input
                  type="number"
                  step="any"
                  value={targetMinutesInput}
                  onChange={(event) => setTargetMinutesInput(event.target.value)}
                />
                <small>分</small>
              </label>
              <button
                type="button"
                aria-label="目標時間を1分増やす"
                onClick={() => updateTargetMinutes(targetMinutes + 1)}
              >
                ＋
              </button>
            </div>
          </section>

          <section
            className="setting-card setting-card--score"
            aria-labelledby="target-score-title"
          >
            <div className="setting-card__heading">
              <span className="setting-card__icon setting-card__icon--score" aria-hidden="true">↗</span>
              <div>
                <p>FOCUS SCORE</p>
                <h2 id="target-score-title">目標スコア</h2>
              </div>
            </div>

            <div className="setting-card__control">
              <button
                type="button"
                aria-label="目標スコアを1下げる"
                onClick={() => updateTargetScore(targetScore - 1)}
              >
                −
              </button>
              <label>
                <span className="sr-only">目標スコア</span>
                <input
                  type="number"
                  step="any"
                  value={targetScoreInput}
                  onChange={(event) => setTargetScoreInput(event.target.value)}
                />
                <small>点</small>
              </label>
              <button
                type="button"
                aria-label="目標スコアを1上げる"
                onClick={() => updateTargetScore(targetScore + 1)}
              >
                ＋
              </button>
            </div>
          </section>
        </div>

        <div className="start-page__action">
          <Button type="submit" disabled={isPreparing}>
            {isPreparing ? '準備中…' : 'START'}
          </Button>
          <span>カメラの準備後、タイマーがスタートします</span>
        </div>
      </form>
    </main>
  )
}
