import { StatusBadge } from '../../components/ui/StatusBadge'
import type { ModelStatus } from '../camera/types'
import type { AnalysisResult } from '../../types/pose'
import { POSE_LANDMARK_NAMES } from './landmarks'
import './AnalysisPanel.css'

const modelStatusLabel: Record<ModelStatus, string> = {
  loading: 'モデル読込中',
  ready: 'モデル準備完了',
  error: 'モデルエラー',
}

const modelStatusTone = {
  loading: 'pending',
  ready: 'success',
  error: 'error',
} as const

function formatCoordinate(value: number) {
  return Number.isFinite(value) ? value.toFixed(5) : '取得不可'
}

type AnalysisPanelProps = {
  analysisErrorMessage: string
  analysisResult: AnalysisResult | null
  isCameraActive: boolean
  modelErrorMessage: string
  modelStatus: ModelStatus
}

export function AnalysisPanel({
  analysisErrorMessage,
  analysisResult,
  isCameraActive,
  modelErrorMessage,
  modelStatus,
}: AnalysisPanelProps) {
  return (
    <section className="analysis-panel" aria-labelledby="analysis-title">
      <div className="analysis-header">
        <div>
          <p className="analysis-kicker">DEBUG OUTPUT</p>
          <h2 id="analysis-title">解析結果</h2>
        </div>
        <StatusBadge
          compact
          label={modelStatusLabel[modelStatus]}
          tone={modelStatusTone[modelStatus]}
        />
      </div>

      <div className="landmark-explanation">
        <p>
          <strong>ランドマーク番号の見方</strong>
          表の「部位」列で各番号が表す身体の位置を確認できます。
        </p>
        <details>
          <summary>0〜32の番号一覧を表示</summary>
          <ol className="landmark-guide-list">
            {POSE_LANDMARK_NAMES.map((name, index) => (
              <li key={name}>
                <span>{index}</span>
                {name}
              </li>
            ))}
          </ol>
        </details>
      </div>

      {modelStatus === 'error' ? (
        <div className="analysis-empty analysis-empty--error" role="alert">
          <strong>モデルの読み込みに失敗しました</strong>
          <span>{modelErrorMessage}</span>
        </div>
      ) : analysisErrorMessage ? (
        <div className="analysis-empty analysis-empty--error" role="alert">
          <strong>解析を停止しました</strong>
          <span>{analysisErrorMessage}</span>
        </div>
      ) : !isCameraActive ? (
        <div className="analysis-empty">
          <strong>解析待機中</strong>
          <span>カメラを起動すると、ここにランドマークの解析値が表示されます。</span>
        </div>
      ) : modelStatus === 'loading' ? (
        <div className="analysis-empty">
          <span className="loading-spinner" aria-hidden="true" />
          <strong>モデルを読み込んでいます</strong>
          <span>読み込みが完了すると自動的に解析を開始します。</span>
        </div>
      ) : analysisResult === null ? (
        <div className="analysis-empty">
          <span className="loading-spinner" aria-hidden="true" />
          <strong>最初の映像フレームを解析しています</strong>
        </div>
      ) : (
        <div className="analysis-output">
          <div className="detection-summary" aria-live="polite">
            <span>検出した人数</span>
            <strong>{analysisResult.people.length}人</strong>
            <small>更新: {Math.round(analysisResult.detectedAt)} ms</small>
          </div>

          {analysisResult.people.length === 0 ? (
            <div className="no-detection">
              <strong>検出なし</strong>
              <span>カメラに全身が映る位置へ移動してください。</span>
            </div>
          ) : (
            <div className="people-list">
              {analysisResult.people.map((landmarks, personIndex) => (
                <details className="person-result" open key={personIndex}>
                  <summary>
                    <span>人物 {personIndex + 1}</span>
                    <small>{landmarks.length}ランドマーク</small>
                  </summary>
                  <div className="landmark-table-wrap">
                    <table className="landmark-table">
                      <thead>
                        <tr>
                          <th scope="col">番号</th>
                          <th scope="col">部位</th>
                          <th scope="col">X</th>
                          <th scope="col">Y</th>
                          <th scope="col">Z</th>
                          <th scope="col">visibility</th>
                        </tr>
                      </thead>
                      <tbody>
                        {landmarks.map((landmark, landmarkIndex) => (
                          <tr key={landmarkIndex}>
                            <th scope="row">{landmarkIndex}</th>
                            <td className="landmark-name">
                              {POSE_LANDMARK_NAMES[landmarkIndex] ?? '不明'}
                            </td>
                            <td>{formatCoordinate(landmark.x)}</td>
                            <td>{formatCoordinate(landmark.y)}</td>
                            <td>{formatCoordinate(landmark.z)}</td>
                            <td>{formatCoordinate(landmark.visibility)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
