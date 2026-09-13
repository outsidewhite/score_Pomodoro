import { formatJourneyTime, JOURNEY_STATE_LABELS, type JourneyStop } from '../../features/trip/journeyHistory.ts'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { destinationCoordinates, landPaths, MAP_WIDTH, mapHeights, projectCoordinate, type MapCoordinate } from '../../features/trip/mapGeography.ts'
import type { Journey, RouteArea } from '../../features/trip/types.ts'

type JourneyMapProps = { journey: Journey; stops: JourneyStop[] }
const stageNames = { japan: '日本ステージ', world: '世界ステージ', space: '宇宙ステージ' }
const spacePositions: readonly MapCoordinate[] = [[120, 265], [230, 205], [410, 145], [595, 75]]
const hasReached = (stop: JourneyStop) => stop.state === 'visited' || stop.state === 'current'

// 密集する都市の番号だけを引き出し線で離し、地点そのものは実座標から動かさない。
const labelOffsets: Readonly<Record<string, MapCoordinate>> = {
  神戸: [-45, 35], 大阪: [0, 65], 京都: [25, -42], 名古屋: [35, 30],
  宮島: [-25, 30], ローマ: [25, 35], パリ: [-20, 30], ロンドン: [-25, -30],
  ウィーン: [30, -28], アテネ: [40, 30], イスタンブール: [55, 0],
}

// SVGの描画倍率を文字だけ打ち消し、地図の範囲や画面幅が変わっても同じpxサイズを保つ。
function MapCanvas({ left, top, width, height, label, children }: {
  left: number; top: number; width: number; height: number; label: string; children: ReactNode
}) {
  const ref = useRef<SVGSVGElement>(null)
  useLayoutEffect(() => {
    const svg = ref.current
    if (!svg) return
    const update = (displayWidth: number) => {
      if (displayWidth > 0) svg.style.setProperty('--map-text-scale', String(width / displayWidth))
    }
    update(svg.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) update(entry.contentRect.width)
    })
    observer.observe(svg)
    return () => observer.disconnect()
  }, [width])

  return <svg ref={ref} viewBox={`${left} ${top} ${width} ${height}`}
    style={{ width: `min(100%, ${300 * width / height}px)` }} role="img" aria-label={label}>
    {children}
  </svg>
}

function MapTerrain({ area }: { area: RouteArea }) {
  if (area !== 'space') return <path className="journey-map__terrain" d={landPaths[area]} fillRule="evenodd" />
  return <g className="journey-map__terrain">
    <circle cx="80" cy="280" r="58" /><circle cx="615" cy="65" r="32" />
    <ellipse cx="80" cy="280" rx="150" ry="75" fill="none" transform="rotate(-30 80 280)" />
    <text x="80" y="285" textAnchor="middle">地球</text><text x="615" y="65" textAnchor="middle">月</text>
  </g>
}

export function JourneyMap({ journey, stops }: JourneyMapProps) {
  return <div className="journey-map">
    {[journey.japanRoute, journey.worldRoute, journey.spaceRoute].map((route) => {
      const area = route.points[0]!.area
      const routeStops = stops.filter(({ point }) => route.points.includes(point))
      // 次の目的地になっただけでは解放せず、そのステージへの初回到達で地図を表示する。
      if (!routeStops.some(stop => stop.point.requiredScore > 0 && hasReached(stop))) return null
      const visibleStops = routeStops.filter(stop => stop.point.requiredScore > 0 &&
        (area === 'space' || stop.state !== 'hidden'))
      const markers = visibleStops.map((stop, index) => ({
        stop, number: index + 1,
        position: area === 'space' ? spacePositions[route.points.indexOf(stop.point)]! :
          projectCoordinate(area, destinationCoordinates[stop.point.name]!),
      }))
      // 表示中の地点と番号を囲む範囲だけを切り出し、遠い地域や海の余白を省く。
      // 最小範囲を設け、到達地点が少ないときの過度な拡大を防ぐ。
      const bounds = markers.flatMap(({ stop, position: [x, y] }) => {
        const [dx, dy] = labelOffsets[stop.point.name] ?? [16, -20]
        return [[x, y], [x + dx, y + dy]]
      })
      const minX = Math.min(...bounds.map(([x]) => x!))
      const maxX = Math.max(...bounds.map(([x]) => x!))
      const minY = Math.min(...bounds.map(([, y]) => y!))
      const maxY = Math.max(...bounds.map(([, y]) => y!))
      const width = area === 'space' ? MAP_WIDTH : Math.max(240, maxX - minX + 80)
      const height = area === 'space' ? mapHeights.space : Math.max(160, maxY - minY + 80)
      const left = area === 'space' ? 0 : (minX + maxX - width) / 2
      const top = area === 'space' ? 0 : (minY + maxY - height) / 2
      return <section key={route.id} aria-label={route.name}>
        <h3>{stageNames[area]} · {route.name}</h3>
        <MapCanvas left={left} top={top} width={width} height={height} label={`${route.name}の地図`}>
          <MapTerrain area={area} />
          <text x={left + width - 12} y={top + 20} textAnchor="end" className="journey-map__north">{area === 'space' ? '航路図' : 'N ↑'}</text>
          {markers.slice(1).map(({ stop, position: [x, y] }, index) => {
            const [previousX, previousY] = markers[index]!.position
            return <path key={stop.point.requiredScore} className="journey-map__route"
              d={`M${previousX} ${previousY} L${x} ${y}`} fill="none" stroke="black"
              strokeWidth="2" strokeDasharray={hasReached(stop) ? undefined : '5 6'} />
          })}
          {markers.map(({ stop, number, position: [x, y] }) => {
            const [dx, dy] = labelOffsets[stop.point.name] ?? [16, -20]
            const name = stop.state === 'hidden' ? '???' : stop.point.name
            return <g key={stop.point.requiredScore} aria-label={`${name}・${JOURNEY_STATE_LABELS[stop.state]}`}>
              <title>{name}</title>
              <path d={`M${x} ${y} L${x + dx} ${y + dy}`} stroke="#777" strokeWidth="1" />
              <circle cx={x} cy={y} r="5" fill={hasReached(stop) ? 'black' : 'white'} stroke="black" strokeWidth="2" />
              {stop.state === 'current' && <circle className="journey-map__current" cx={x} cy={y} r="10" fill="none" stroke="black" />}
              <text x={x + dx} y={y + dy} textAnchor="middle" className="journey-map__number">{number}</text>
            </g>
          })}
        </MapCanvas>
        <p className="journey-map__caption">{area === 'space' ? '宇宙の航路は模式図です（距離・縮尺は実際と異なります）。' :
          <>地形: <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth</a> · 線は訪問順を示します。</>}</p>
        <ol className="journey-map__legend">
          {markers.map(({ stop, number }) => <li key={stop.point.requiredScore} aria-current={stop.state === 'current' ? 'location' : undefined}>
            <span className={`journey-map__badge${hasReached(stop) ? ' journey-map__badge--reached' : ''}`}>{number}</span>
            <div><strong>{stop.state === 'hidden' ? '???' : stop.point.name}</strong>
              <small>{JOURNEY_STATE_LABELS[stop.state]} · {stop.point.requiredScore} 点</small></div>
            <time>{stop.arrivalMs === null ? '—' : formatJourneyTime(stop.arrivalMs)}</time>
          </li>)}
        </ol>
      </section>
    })}
  </div>
}
