import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getJourneyPosition } from '../../features/trip/getJourneyPosition.ts'
import type { Journey, RouteArea } from '../../features/trip/types.ts'
import type { JourneyMotionState } from '../../features/trip/getJourneyMotionState.ts'
import { JourneyScene } from './JourneyScenes.tsx'
import './ScoreJourney.css'

type ScoreJourneyProps = {
  earnedScore?: number
  onDebugEarnedScoreChange?: (score: number | null) => void
  journey: Journey
  motionState: JourneyMotionState
  score: number
}

type DebugAnimationMode = 'auto' | RouteArea
type DebugMotionMode = 'auto' | JourneyMotionState

const DEBUG_ANIMATION_MODES: readonly {
  label: string
  value: DebugAnimationMode
}[] = [
  { label: '自動', value: 'auto' },
  { label: '車', value: 'japan' },
  { label: '飛行機', value: 'world' },
  { label: '宇宙船', value: 'space' },
]

const DEBUG_MOTION_MODES: readonly {
  label: string
  value: DebugMotionMode
}[] = [
  { label: '自動', value: 'auto' },
  { label: '停止', value: 'idle' },
  { label: '準備', value: 'preparing' },
  { label: '0点', value: 'score0' },
  { label: '1点', value: 'score1' },
  { label: '2点', value: 'score2' },
  { label: '3点', value: 'score3' },
  { label: '休憩', value: 'break' },
]

const MOTION_STATE_LABELS: Record<JourneyMotionState, string> = {
  idle: '停止中',
  preparing: '準備中',
  score0: 'ひと休み',
  score1: 'ゆっくり前進中',
  score2: '順調に移動中',
  score3: '快調に移動中',
  break: '休憩中',
}

// 本番画面へデバッグ操作を露出させず、開発サーバーでは削除せず使い続けられるようにする。
const SHOW_DEBUG_CONTROLS = import.meta.env.DEV

export function ScoreJourney({ earnedScore = 0, onDebugEarnedScoreChange, journey, motionState, score }: ScoreJourneyProps) {
  // 入力中の値は確定スコアと分離し、「反映」またはEnterでまとめて変更する。
  const [debugScoreInput, setDebugScoreInput] = useState<string | null>(null)
  const debugScoreValue = debugScoreInput ?? String(earnedScore)
  const isDebugScoreValid = debugScoreValue.trim() !== '' &&
    Number.isSafeInteger(Number(debugScoreValue)) && Number(debugScoreValue) >= 0
  const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0
  const previousScoreRef = useRef(safeScore)
  const previousJourneyRef = useRef(journey)
  const [animationKey, setAnimationKey] = useState(0)
  const [isArrivalAnimating, setIsArrivalAnimating] = useState(false)
  const [debugAnimationMode, setDebugAnimationMode] =
    useState<DebugAnimationMode>('auto')
  const [debugMotionMode, setDebugMotionMode] =
    useState<DebugMotionMode>('auto')
  const position = getJourneyPosition(safeScore, journey)
  // デバッグ指定がある間だけ、スコアから求めたステージを表示上書きする。
  const displayedArea =
    debugAnimationMode === 'auto'
      ? position.currentPoint.area
      : debugAnimationMode
  // 動きのデバッグ指定は、通常のタイマー・スコア連動より優先する。
  const displayedMotionState =
    debugMotionMode === 'auto' ? motionState : debugMotionMode
  const isPreparationStage = displayedMotionState === 'preparing'
  const progress = Math.min(position.progressScore / position.requiredScore, 1)

  useEffect(() => {
    if (journey !== previousJourneyRef.current) {
      previousJourneyRef.current = journey
      previousScoreRef.current = safeScore
      setIsArrivalAnimating(false)
      return
    }

    const previousPosition = getJourneyPosition(
      previousScoreRef.current,
      journey,
    )
    // 通常の目的地を越えた場合だけ到着演出を行い、探索レベル更新では再生しない。
    const arrivedAtDestination =
      safeScore > previousScoreRef.current &&
      position.currentPoint.requiredScore >
        previousPosition.currentPoint.requiredScore
    setIsArrivalAnimating(arrivedAtDestination)
    previousScoreRef.current = safeScore
  }, [journey, position.currentPoint.requiredScore, safeScore])

  const journeyStyle = {
    '--journey-progress': progress,
  } as CSSProperties

  const stageName = {
    japan: '日本ステージ',
    world: '世界ステージ',
    space: '宇宙ステージ',
  }[displayedArea]
  const displayedStageName = isPreparationStage ? '準備ステージ' : stageName
  const displayedLocation = isPreparationStage
    ? '自宅'
    : position.explorationLevel === null
      ? position.currentPoint.name
      : `探索レベル ${position.explorationLevel}`

  const handleDebugAnimationChange = (mode: DebugAnimationMode) => {
    setDebugAnimationMode(mode)
    setIsArrivalAnimating(false)
    // 同じモードを再選択した場合も先頭から動きを確認できるようにする。
    setAnimationKey((currentKey) => currentKey + 1)
  }

  const handleDebugMotionChange = (mode: DebugMotionMode) => {
    setDebugMotionMode(mode)
    setIsArrivalAnimating(false)
    setAnimationKey((currentKey) => currentKey + 1)
  }

  return (
    <section
      className={`score-journey score-journey--motion-${displayedMotionState}`}
      aria-label="スコアの旅"
    >
      <div className="score-journey__header">
        <div>
          <span>FOCUS JOURNEY</span>
          <strong>{displayedLocation}</strong>
        </div>
        <div className="score-journey__status">
          <span>{displayedStageName}</span>
          <small>
            {isPreparationStage ? 'STANDBY' : `${Math.round(progress * 100)}%`}
          </small>
        </div>
      </div>

      <div
        key={`${displayedArea}-${animationKey}`}
        className={`score-journey__scene score-journey__scene--${displayedArea} score-journey__scene--motion-${displayedMotionState}${isArrivalAnimating ? ' score-journey__scene--arrival' : ''}`}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) {
            setIsArrivalAnimating(false)
          }
        }}
        style={journeyStyle}
      >
        <JourneyScene area={displayedArea} motionState={displayedMotionState} />
        {!isPreparationStage && (
          <div className="score-journey__progress" aria-hidden="true">
            <span className="score-journey__progress-fill" />
          </div>
        )}
      </div>

      <div className="score-journey__caption">
        <span aria-live="polite">
          {isPreparationStage
            ? '自宅で作業を始める準備をしています'
            : position.destination
              ? `次の目的地「${position.destination.name}」まであと ${position.requiredScore - position.progressScore} 点`
              : `宇宙探索中・次のレベルまであと ${position.requiredScore - position.progressScore} 点`}
        </span>
        <strong>{MOTION_STATE_LABELS[displayedMotionState]}</strong>
      </div>

      {SHOW_DEBUG_CONTROLS && (
        <div
          className="score-journey__debug-controls"
          aria-label="デバッグ用アニメーション切り替え"
        >
          <span className="score-journey__debug-title">DEBUG</span>
          <div className="score-journey__debug-groups">
            {onDebugEarnedScoreChange && (
              <form className="score-journey__debug-score" onSubmit={(event) => {
                event.preventDefault()
                if (!isDebugScoreValid) return
                onDebugEarnedScoreChange(Number(debugScoreValue))
                setDebugScoreInput(null)
              }}>
                <label>
                  <span>獲得スコア</span>
                  <input
                    type="number"
                    min="0"
                    max={Number.MAX_SAFE_INTEGER}
                    step="1"
                    required
                    value={debugScoreValue}
                    onChange={(event) => setDebugScoreInput(event.target.value)}
                  />
                </label>
                <button type="submit" disabled={!isDebugScoreValid}>反映</button>
                <button type="button" onClick={() => {
                  onDebugEarnedScoreChange(null)
                  setDebugScoreInput(null)
                }}>実測に戻す</button>
                <small>累積値を変更します。再読み込みで解除されます。</small>
              </form>
            )}
            <div className="score-journey__debug-group">
              <span>表示</span>
              <div>
                {DEBUG_ANIMATION_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    aria-label={mode.value === 'auto' ? '表示を自動' : undefined}
                    aria-pressed={debugAnimationMode === mode.value}
                    onClick={() => handleDebugAnimationChange(mode.value)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="score-journey__debug-group">
              <span>動き</span>
              <div>
                {DEBUG_MOTION_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    aria-label={mode.value === 'auto' ? '動きを自動' : undefined}
                    aria-pressed={debugMotionMode === mode.value}
                    onClick={() => handleDebugMotionChange(mode.value)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
