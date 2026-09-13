import { formatJourneyTime, JOURNEY_STATE_LABELS, type JourneyStop } from '../../features/trip/journeyHistory.ts'
import type { Journey } from '../../features/trip/types.ts'

type JourneyListProps = { journey: Journey; stops: JourneyStop[] }

// 実在する目的地だけを並べ、最終目的地以降の探索レベルは行にしない。
export function JourneyList({ journey, stops }: JourneyListProps) {
  return <div className="journey-list">
    {[journey.japanRoute, journey.worldRoute, journey.spaceRoute].map((route) => (
      <section key={route.id} aria-label={route.name}>
        <h3>{route.name}</h3>
        <ol>
          {stops.filter(({ point }) => route.points.includes(point)).map((stop) => {
            const reached = stop.state === 'visited' || stop.state === 'current'
            const time = reached ? stop.arrivalMs : stop.estimateMs
            return <li key={stop.point.requiredScore} className={`journey-list__stop journey-list__stop--${reached ? 'reached' : 'future'}`} aria-current={stop.state === 'current' ? 'location' : undefined}>
              <div>
                <strong>{stop.state === 'hidden' ? '???' : stop.point.name}</strong>
                <small>{JOURNEY_STATE_LABELS[stop.state]} · 累積 {stop.point.requiredScore} 点</small>
              </div>
              <div className="journey-list__time">
                <span>{time === null ? '—' : formatJourneyTime(time)}</span>
                <small>{reached ? '到着時刻' : '到着参考時刻'}</small>
              </div>
            </li>
          })}
        </ol>
      </section>
    ))}
  </div>
}
