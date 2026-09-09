import type { ScoreConfig } from './scoreTypes.ts'

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  // 正規化座標上で、この値以上の傾きを姿勢点0として扱う。
  maxTilt: 0.15,
  // 連続フレーム間で、この値以上の移動を安定性0として扱う。
  maxMovement: 0.08,
  weights: {
    detection: 0.2,
    posture: 0.4,
    stability: 0.4,
  },
}
