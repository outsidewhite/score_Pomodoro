import type { ScoreConfig } from './scoreTypes.ts'

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  // 3秒間隔のサンプルで約6秒までの検出抜けは継続扱いにする。
  absenceGraceSamples: 2,
  // 生の評価が70%以上なら最終スコアを100点にする。
  fullScoreThreshold: 0.7,
  // カメラ正面から20度以内の体の向きは満点として扱う。
  fullScoreOrientationAngleDegrees: 20,
  // 70度以上の横向きは体の向きの加点を0にする。
  maxOrientationAngleDegrees: 70,
  // 約30秒連続で検出できなかった場合に継続点を0にする。
  maxConsecutiveAbsenceSamples: 10,
  // 正規化座標上で、この値以上の移動を大きな移動として扱う。
  maxMovement: 0.3,
  minLandmarkVisibility: 0.5,
  // 筆記や姿勢変更に伴う通常の動きは減点しない。
  movementGrace: 0.12,
  weights: {
    presence: 50,
    continuity: 25,
    movement: 10,
    orientation: 15,
  },
}
