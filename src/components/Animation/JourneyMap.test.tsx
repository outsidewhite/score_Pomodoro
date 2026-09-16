import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createJourney } from '../../features/trip/createJourney.ts'
import { getJourneyStops } from '../../features/trip/journeyHistory.ts'
import { japanRoutes, worldRoutes } from '../../features/trip/routes.ts'
import { destinationCoordinates, mapHeights, projectCoordinate } from '../../features/trip/mapGeography.ts'
import { JourneyMap } from './JourneyMap.tsx'

const journey = createJourney(() => 0)

describe('到達したステージの地理地図', () => {
  // 次の行先が次ステージに移っても、到達直前までその地形を公開しない。
  it.each([0, 29, 30, 210, 239, 240, 570, 599, 600])('%i点で到達したステージだけを表示する', score => {
    render(<JourneyMap journey={journey} stops={getJourneyStops(journey, score, {})} />)
    expect(Boolean(screen.queryByRole('img', { name: '西から東への地図' }))).toBe(score >= 30)
    expect(Boolean(screen.queryByRole('img', { name: '王道世界一周の地図' }))).toBe(score >= 240)
    expect(Boolean(screen.queryByRole('img', { name: '月への旅の地図' }))).toBe(score >= 600)
  })

  it('全ルートの目的地が地図の範囲内にあり、東京が福岡の北東に位置する', () => {
    for (const route of [...japanRoutes, ...worldRoutes]) {
      for (const point of route.points.filter(point => point.requiredScore > 0)) {
        const coordinate = destinationCoordinates[point.name]
        expect(coordinate, point.name).toBeDefined()
        const [x, y] = projectCoordinate(point.area as 'japan' | 'world', coordinate!)
        expect(x).toBeGreaterThan(0)
        expect(x).toBeLessThan(720)
        expect(y).toBeGreaterThan(0)
        expect(y).toBeLessThan(mapHeights[point.area])
      }
    }
    const fukuoka = projectCoordinate('japan', destinationCoordinates['福岡']!)
    const tokyo = projectCoordinate('japan', destinationCoordinates['東京']!)
    expect(tokyo[0]).toBeGreaterThan(fukuoka[0])
    expect(tokyo[1]).toBeLessThan(fukuoka[1])
  })

  it.each(worldRoutes)('$nameの地理座標を保ち、表示地点に合わせて余白を詰める', worldRoute => {
    const selected = { ...journey, worldRoute }
    const element = (score: number) => <JourneyMap journey={selected} stops={getJourneyStops(selected, score, {})} />
    const { rerender } = render(element(240))
    const map = () => screen.getByRole('img', { name: `${worldRoute.name}の地図` })
    const first = () => map().querySelector('circle[stroke-width="2"]')!
    const coordinates = [first().getAttribute('cx'), first().getAttribute('cy')]
    const initialViewBox = map().getAttribute('viewBox')
    expect(map().querySelector('.journey-map__terrain')!.getAttribute('d')!.length).toBeGreaterThan(10000)
    expect(map().querySelectorAll('circle[stroke-width="2"]')).toHaveLength(2)
    rerender(element(570))
    expect([first().getAttribute('cx'), first().getAttribute('cy')]).toEqual(coordinates)
    expect(map().getAttribute('viewBox')).not.toBe(initialViewBox)
    const [left, top, width, height] = map().getAttribute('viewBox')!.split(' ').map(Number) as [number, number, number, number]
    expect(width).toBeLessThan(720)
    expect(height).toBeLessThan(400)
    // 範囲を詰めても地点の丸と引き出した番号が欠けないことを確認する。
    for (const node of map().querySelectorAll('circle[stroke-width="2"], .journey-map__number')) {
      const x = Number(node.getAttribute('cx') ?? node.getAttribute('x'))
      const y = Number(node.getAttribute('cy') ?? node.getAttribute('y'))
      expect(x).toBeGreaterThanOrEqual(left + 20)
      expect(x).toBeLessThanOrEqual(left + width - 20)
      expect(y).toBeGreaterThanOrEqual(top + 20)
      expect(y).toBeLessThanOrEqual(top + height - 20)
    }
    expect(map().querySelectorAll('circle[fill="black"]')).toHaveLength(12)
    expect(map().querySelectorAll('.journey-map__route:not([stroke-dasharray])')).toHaveLength(11)
  })
})
