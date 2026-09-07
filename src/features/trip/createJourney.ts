import {
  japanRoutes,
  spaceRoute,
  worldRoutes,
} from './routes.ts'
import type { Journey } from './types.ts'

type RandomSource = () => number

function getRandomItem<T>(items: readonly T[], random: RandomSource): T {
  if (items.length === 0) {
    throw new RangeError('ルートの候補がありません')
  }

  const randomValue = random()
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new RangeError('乱数は0以上1未満である必要があります')
  }

  // 配列が空でないことを上で保証しているため、選択結果は必ず存在する。
  return items[Math.floor(randomValue * items.length)] as T
}

export function createJourney(random: RandomSource = Math.random): Journey {
  return {
    japanRoute: getRandomItem(japanRoutes, random),
    worldRoute: getRandomItem(worldRoutes, random),
    spaceRoute,
  }
}
