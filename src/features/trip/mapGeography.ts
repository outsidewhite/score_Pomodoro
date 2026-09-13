import japanLand from './geography/japan.json'
import worldLand from './geography/world.json'

export type MapCoordinate = readonly [number, number]
type EarthArea = 'japan' | 'world'

// 経度・緯度の順で代表地点を定義し、地形と目的地を同じ投影で配置する。
export const destinationCoordinates: Readonly<Record<string, MapCoordinate>> = {
  福岡: [130.4017, 33.5902], 広島: [132.4553, 34.3853], 神戸: [135.1955, 34.6901],
  大阪: [135.5023, 34.6937], 京都: [135.7681, 35.0116], 名古屋: [136.9066, 35.1815],
  東京: [139.6917, 35.6895], 那覇: [127.6809, 26.2124], 鹿児島: [130.5571, 31.5966],
  札幌: [141.3545, 43.0618], 北海道: [141.3545, 43.0618], 宮島: [132.3197, 34.2959],
  富士山: [138.7274, 35.3606], ソウル: [126.978, 37.5665], 北京: [116.4074, 39.9042],
  香港: [114.1694, 22.3193], バンコク: [100.5018, 13.7563], シンガポール: [103.8198, 1.3521],
  ドバイ: [55.2708, 25.2048], カイロ: [31.2357, 30.0444], ローマ: [12.4964, 41.9028],
  パリ: [2.3522, 48.8566], ロンドン: [-0.1276, 51.5072], ニューヨーク: [-74.006, 40.7128],
  フロリダ: [-80.6043, 28.3922], 上海: [121.4737, 31.2304],
  イスタンブール: [28.9784, 41.0082], アテネ: [23.7275, 37.9838], ウィーン: [16.3738, 48.2082],
}

export const MAP_WIDTH = 720
export const mapHeights = { japan: 660, world: 400, space: 360 } as const

export function projectCoordinate(area: EarthArea, [longitude, latitude]: MapCoordinate): MapCoordinate {
  if (area === 'world') return [20 + (longitude + 180) * 680 / 360, 20 + (90 - latitude) * 2]
  // 日本は北緯36度で横方向を補正した正距円筒図法。沖縄から北海道まで同一縮尺で収める。
  return [360 + (longitude - 135) * 27 * Math.cos(Math.PI / 5), 330 - (latitude - 35) * 27]
}

function landPath(area: EarthArea, rings: number[][][]) {
  return rings.map(ring => ring.map((point, index) => {
    const [x, y] = projectCoordinate(area, [point[0]!, point[1]!])
    return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`
  }).join('') + 'Z').join('')
}

// 地形パスはモジュール読込時に一度だけ生成し、スコア更新では再計算しない。
export const landPaths = { japan: landPath('japan', japanLand), world: landPath('world', worldLand) }
