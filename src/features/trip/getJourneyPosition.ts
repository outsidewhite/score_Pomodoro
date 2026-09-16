import type { Journey, JourneyPosition, RoutePoint } from './types.ts'

// 旅のテンポを保つため、すべての目的地と探索レベルを30点間隔にそろえる。
export const SCORE_PER_DESTINATION = 30

export function getJourneyPoints(journey: Journey): readonly RoutePoint[] {
  return [
    ...journey.japanRoute.points,
    ...journey.worldRoute.points,
    ...journey.spaceRoute.points,
  ]
}

export function getJourneyPosition(
  totalScore: number,
  journey: Journey,
): JourneyPosition {
  const safeScore = Number.isFinite(totalScore) ? Math.max(0, totalScore) : 0
  const points = getJourneyPoints(journey)

  if (points.length === 0) {
    throw new RangeError('旅の目的地が設定されていません')
  }

  let currentIndex = 0
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index]
    if (point && safeScore >= point.requiredScore) {
      currentIndex = index
      break
    }
  }

  const currentPoint = points[currentIndex] as RoutePoint
  const destination = points[currentIndex + 1] ?? null

  if (!destination) {
    const explorationScore = safeScore - currentPoint.requiredScore
    return {
      currentPoint,
      destination: null,
      explorationLevel:
        Math.floor(explorationScore / SCORE_PER_DESTINATION) + 1,
      progressScore: explorationScore % SCORE_PER_DESTINATION,
      requiredScore: SCORE_PER_DESTINATION,
    }
  }

  // 到着基準を引いた余りを保持し、次の目的地までの進捗として使う。
  return {
    currentPoint,
    destination,
    explorationLevel: null,
    progressScore: safeScore - currentPoint.requiredScore,
    requiredScore: destination.requiredScore - currentPoint.requiredScore,
  }
}
