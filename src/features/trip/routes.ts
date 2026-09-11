import type { Route } from './types.ts'

export const japanRoutes: readonly Route[] = [
  {
    id: 'japan-west-east',
    name: '西から東へ',
    points: [
      { requiredScore: 0, name: 'スタート', area: 'japan' },
      { requiredScore: 45, name: '福岡', area: 'japan' },
      { requiredScore: 90, name: '広島', area: 'japan' },
      { requiredScore: 135, name: '神戸', area: 'japan' },
      { requiredScore: 180, name: '大阪', area: 'japan' },
      { requiredScore: 225, name: '京都', area: 'japan' },
      { requiredScore: 270, name: '名古屋', area: 'japan' },
      { requiredScore: 315, name: '東京', area: 'japan' },
    ],
  },
  {
    id: 'japan-northbound',
    name: '日本縦断',
    points: [
      { requiredScore: 0, name: 'スタート', area: 'japan' },
      { requiredScore: 45, name: '那覇', area: 'japan' },
      { requiredScore: 90, name: '鹿児島', area: 'japan' },
      { requiredScore: 135, name: '福岡', area: 'japan' },
      { requiredScore: 180, name: '大阪', area: 'japan' },
      { requiredScore: 225, name: '名古屋', area: 'japan' },
      { requiredScore: 270, name: '東京', area: 'japan' },
      { requiredScore: 315, name: '札幌', area: 'japan' },
    ],
  },
  {
    id: 'japan-sightseeing',
    name: '観光名所めぐり',
    points: [
      { requiredScore: 0, name: 'スタート', area: 'japan' },
      { requiredScore: 45, name: '福岡', area: 'japan' },
      { requiredScore: 90, name: '宮島', area: 'japan' },
      { requiredScore: 135, name: '大阪', area: 'japan' },
      { requiredScore: 180, name: '京都', area: 'japan' },
      { requiredScore: 225, name: '富士山', area: 'japan' },
      { requiredScore: 270, name: '東京', area: 'japan' },
      { requiredScore: 315, name: '北海道', area: 'japan' },
    ],
  },
]

export const worldRoutes: readonly Route[] = [
  {
    id: 'world-standard',
    name: '王道世界一周',
    points: [
      { requiredScore: 360, name: 'ソウル', area: 'world' },
      { requiredScore: 405, name: '北京', area: 'world' },
      { requiredScore: 450, name: '香港', area: 'world' },
      { requiredScore: 495, name: 'バンコク', area: 'world' },
      { requiredScore: 540, name: 'シンガポール', area: 'world' },
      { requiredScore: 585, name: 'ドバイ', area: 'world' },
      { requiredScore: 630, name: 'カイロ', area: 'world' },
      { requiredScore: 675, name: 'ローマ', area: 'world' },
      { requiredScore: 720, name: 'パリ', area: 'world' },
      { requiredScore: 765, name: 'ロンドン', area: 'world' },
      { requiredScore: 810, name: 'ニューヨーク', area: 'world' },
      { requiredScore: 855, name: 'フロリダ', area: 'world' },
    ],
  },
  {
    id: 'world-europe',
    name: 'ヨーロッパ横断',
    points: [
      { requiredScore: 360, name: 'ソウル', area: 'world' },
      { requiredScore: 405, name: '上海', area: 'world' },
      { requiredScore: 450, name: 'シンガポール', area: 'world' },
      { requiredScore: 495, name: 'ドバイ', area: 'world' },
      { requiredScore: 540, name: 'イスタンブール', area: 'world' },
      { requiredScore: 585, name: 'アテネ', area: 'world' },
      { requiredScore: 630, name: 'ローマ', area: 'world' },
      { requiredScore: 675, name: 'ウィーン', area: 'world' },
      { requiredScore: 720, name: 'パリ', area: 'world' },
      { requiredScore: 765, name: 'ロンドン', area: 'world' },
      { requiredScore: 810, name: 'ニューヨーク', area: 'world' },
      { requiredScore: 855, name: 'フロリダ', area: 'world' },
    ],
  },
]

export const spaceRoute: Route = {
  id: 'space-main',
  name: '月への旅',
  points: [
    { requiredScore: 900, name: '宇宙ステーション', area: 'space' },
    { requiredScore: 945, name: '地球周回軌道', area: 'space' },
    { requiredScore: 990, name: '月への航路', area: 'space' },
    { requiredScore: 1_035, name: '月周回軌道', area: 'space' },
  ],
}
