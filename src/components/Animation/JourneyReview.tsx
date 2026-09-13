import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { getJourneyStops, type JourneyArrivals } from '../../features/trip/journeyHistory.ts'
import type { Journey } from '../../features/trip/types.ts'
import { JourneyList } from './JourneyList.tsx'
import { JourneyMap } from './JourneyMap.tsx'
import './JourneyReview.css'

type JourneyReviewProps = {
  arrivals: JourneyArrivals
  children: ReactNode
  isFocused: boolean
  journey: Journey
  score: number
}

// アニメーション本体を変更せず、同じ表示枠の上に履歴を重ねる。
export function JourneyReview({ arrivals, children, isFocused, journey, score }: JourneyReviewProps) {
  const [view, setView] = useState<'map' | 'list' | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const titleId = useId()
  const panelId = useId()
  const stops = getJourneyStops(journey, score, arrivals)
  const hasArrived = stops.some(({ point, state }) => point.requiredScore > 0 &&
    (state === 'visited' || state === 'current'))
  const canOpen = !isFocused
  const visible = view !== null && canOpen && (view !== 'map' || hasArrived)

  useEffect(() => {
    // 集中へ戻った時は開閉状態も破棄し、次の休憩で勝手に再表示しない。
    // oxlint-disable-next-line react/set-state-in-effect -- 外部のタイマーモード変更に開閉状態を同期する。
    if (isFocused) setView(null)
  }, [isFocused])

  useEffect(() => {
    if (visible) closeRef.current?.focus()
  }, [visible, view])

  const close = () => {
    setView(null)
    openerRef.current?.focus()
  }

  return <div className="journey-review" onKeyDown={(event) => {
    if (visible && event.key === 'Escape') { event.stopPropagation(); close() }
  }}>
    {/* 履歴の背後にあるデバッグ操作へキーボードフォーカスが移らないようにする。 */}
    <div className="journey-review__animation" inert={visible}>{children}</div>
    <div className="journey-review__tools" aria-label="旅の履歴を表示">
      {(['map', 'list'] as const).map((mode) => {
        const disabled = !canOpen || (mode === 'map' && !hasArrived)
        const label = mode === 'map' ? '地図を開く' : '目的地リストを開く'
        return <button key={mode} type="button" className="journey-review__icon"
          aria-label={label} aria-expanded={visible && view === mode}
          aria-controls={visible && view === mode ? panelId : undefined}
          disabled={disabled}
          title={isFocused ? '集中中は開けません' : mode === 'map' && !hasArrived ? '最初の目的地に到着すると開けます' : label}
          onClick={(event) => {
            openerRef.current = event.currentTarget
            if (view === mode) close()
            else setView(mode)
          }}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {mode === 'map' ? <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16" /> : <path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1" />}
          </svg>
        </button>
      })}
    </div>
    {visible && <section id={panelId} role="dialog" aria-labelledby={titleId}
      className="journey-review__overlay">
      <header className="journey-review__header">
        <button ref={closeRef} type="button" className="journey-review__icon" aria-label="旅の履歴を閉じる" onClick={close}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
        </button>
        <h2 id={titleId}>{view === 'map' ? '旅の地図' : '目的地リスト'}</h2>
      </header>
      <div className="journey-review__content" tabIndex={0} aria-label="旅の履歴">
        <p className="journey-review__note">到着時刻はタイマーの累積作業時間です。</p>
        {view === 'map' ? <JourneyMap journey={journey} stops={stops} /> : <JourneyList journey={journey} stops={stops} />}
      </div>
    </section>}
  </div>
}
