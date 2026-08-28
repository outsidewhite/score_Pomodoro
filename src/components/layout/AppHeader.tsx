import { StatusBadge } from '../ui/StatusBadge'
import type { CameraStatus, ModelStatus } from '../../features/camera/types'
import './AppHeader.css'

const cameraStatusLabel: Record<CameraStatus, string> = {
  idle: '停止中',
  requesting: '接続中',
  active: '起動中',
  error: 'エラー',
}

const modelStatusLabel: Record<ModelStatus, string> = {
  loading: 'モデル読込中',
  ready: 'モデル準備完了',
  error: 'モデルエラー',
}

const cameraStatusTone = {
  idle: 'neutral',
  requesting: 'pending',
  active: 'success',
  error: 'error',
} as const

const modelStatusTone = {
  loading: 'pending',
  ready: 'success',
  error: 'error',
} as const

type AppHeaderProps = {
  cameraStatus: CameraStatus
  modelStatus: ModelStatus
}

export function AppHeader({ cameraStatus, modelStatus }: AppHeaderProps) {
  return (
    <header className="page-header">
      <a className="brand" href="/" aria-label="Score Pomodoro ホーム">
        <span className="brand-mark" aria-hidden="true">
          S
        </span>
        <span>Score Pomodoro</span>
      </a>
      <div className="header-statuses">
        <StatusBadge
          label={modelStatusLabel[modelStatus]}
          tone={modelStatusTone[modelStatus]}
        />
        <StatusBadge
          label={`カメラ：${cameraStatusLabel[cameraStatus]}`}
          tone={cameraStatusTone[cameraStatus]}
        />
      </div>
    </header>
  )
}
