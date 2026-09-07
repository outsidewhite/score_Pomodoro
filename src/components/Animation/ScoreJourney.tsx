import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getJourneyPosition } from '../../features/trip/getJourneyPosition.ts'
import type { Journey } from '../../features/trip/types.ts'
import './ScoreJourney.css'

type ScoreJourneyProps = {
  journey: Journey
  score: number
}

export function ScoreJourney({ journey, score }: ScoreJourneyProps) {
  const previousScoreRef = useRef(score)
  const [animationKey, setAnimationKey] = useState(0)
  const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0
  const position = getJourneyPosition(safeScore, journey)
  const progress = position.destination
    ? Math.min(position.progressScore / position.requiredScore, 1)
    : 1

  useEffect(() => {
    if (score > previousScoreRef.current) {
      // スコアが増えたときだけ、キャラクターの到着アニメーションを再生する。
      setAnimationKey((currentKey) => currentKey + 1)
    }
    previousScoreRef.current = score
  }, [score])

  const journeyStyle = {
    '--journey-progress': progress,
  } as CSSProperties

  return (
    <section className="score-journey" aria-label="スコアの旅">
      <div className="score-journey__header">
        <div>
          <span>FOCUS JOURNEY</span>
          <strong>{position.currentPoint.name}</strong>
        </div>
        <small>{Math.round(progress * 100)}%</small>
      </div>

      <div className="score-journey__scene" style={journeyStyle}>
        <div className="score-journey__sky" aria-hidden="true">
          <span className="score-journey__cloud score-journey__cloud--first" />
          <span className="score-journey__cloud score-journey__cloud--second" />
        </div>
        <div className="score-journey__track" aria-hidden="true">
          <span className="score-journey__track-progress" />
          <span key={animationKey} className="score-journey__traveler">●</span>
          <span className="score-journey__destination">⚑</span>
        </div>
      </div>

      <p className="score-journey__caption" aria-live="polite">
        {position.destination
          ? `次の目的地「${position.destination.name}」まであと ${position.requiredScore - position.progressScore} 点`
          : `現在地「${position.currentPoint.name}」・累積 ${safeScore.toLocaleString('ja-JP')} 点`}
      </p>
    </section>
  )
}
