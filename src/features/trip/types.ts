export type RouteArea = 'japan' | 'world' | 'space'

export type RoutePoint = {
  readonly area: RouteArea
  readonly name: string
  readonly requiredScore: number
}

export type Route = {
  readonly id: string
  readonly name: string
  readonly points: readonly RoutePoint[]
}

export type Journey = {
  readonly japanRoute: Route
  readonly worldRoute: Route
  readonly spaceRoute: Route
}

export type JourneyPosition = {
  readonly currentPoint: RoutePoint
  readonly destination: RoutePoint | null
  readonly explorationLevel: number | null
  readonly progressScore: number
  readonly requiredScore: number
}
