import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { SessionLog } from '../../components/Timer/SessionLog.tsx'
import { Timer } from '../../components/Timer/Timer.tsx'
import type { TimerLogEntry, TimerMode } from '../../components/Timer/timerTypes.ts'
import { ScorePanel } from '../../components/Score/ScorePanel.tsx'
import { AppHeader } from '../../components/ui/AppHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { getTimerStatus } from '../../components/ui/statusTone.ts'
import type { ModelStatus } from '../../features/camera/cameraTypes.ts'
import { usePoseScoring } from '../../features/pose/usePoseScoring.ts'
import type {
  PostureBaseline,
  ScoreIntervalResult,
} from '../../features/scoring/intervalScoring.ts'
import {
  getMeasuredWorkDuration,
  loadTimerSession,
  saveTimerSession,
  type TimerSession,
} from '../../features/session/timerSession.ts'
import type { MeasurementStatus } from '../../shared/types/measurement.ts'
import './MeasurementPage.css'

// 同じ事象の通知が積み重ならないよう、姿勢解析エラーの通知idは固定にする。
const POSE_ANALYSIS_ERROR_TOAST_ID = 'pose-analysis-error'
const POSE_MODEL_LOAD_TOAST_ID = 'pose-model-load'
const AUTO_AWAY_TOAST_ID = 'auto-away'
const CALIBRATION_TOAST_ID = 'posture-calibration'

type MeasurementPageProps = {
  baseline: PostureBaseline | null
  cameraError: string | null
  cameraStream: MediaStream | null
  elapsedMs: number
  isPreparingCamera: boolean
  nextIntervalNumber: number
  onBaselineChange: (baseline: PostureBaseline) => void
  onCameraRetry: () => void
  onFinish: () => void
  onScoreUpdate: (result: ScoreIntervalResult) => void
  originalScore: number
  scoreIncrement: number | null
  sessionId: string
  status: MeasurementStatus
  targetMinutes?: number
}

export function MeasurementPage({
  baseline,
  cameraError,
  cameraStream,
  elapsedMs,
  isPreparingCamera,
  nextIntervalNumber,
  onBaselineChange,
  onCameraRetry,
  onFinish,
  onScoreUpdate,
  originalScore,
  scoreIncrement,
  sessionId,
  status,
  targetMinutes = 25,
}: MeasurementPageProps) {
  const [initialTimerSession] = useState(() => loadTimerSession(sessionId))
  const [isCameraBlurred, setIsCameraBlurred] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [timerNow, setTimerNow] = useState(initialTimerSession.lastObservedAt)
  const [timerLogs, setTimerLogs] = useState<TimerLogEntry[]>(
    initialTimerSession.logs,
  )
  const timerLogsRef = useRef(initialTimerSession.logs)
  const [modelLoadStatus, setModelLoadStatus] = useState<ModelStatus>('loading')
  const [modelReloadRequest, setModelReloadRequest] = useState(0)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [timerMode, setTimerMode] = useState<TimerMode>('away')
  const [autoPauseRequest, setAutoPauseRequest] = useState(0)
  const initialElapsedMs = Math.max(
    elapsedMs,
    getMeasuredWorkDuration(
      initialTimerSession.logs,
      initialTimerSession.lastObservedAt,
    ),
  )
  const initialLogId = Math.max(
    0,
    ...initialTimerSession.logs.map(({ id }) => id),
  )
  const persistTimerLogs = useCallback((
    logs: TimerLogEntry[],
    lastObservedAt: number,
  ) => {
    const session: TimerSession = {
      ...initialTimerSession,
      lastObservedAt,
      logs,
    }
    saveTimerSession(session)
  }, [initialTimerSession])
  // Timerの単一クロックをログ表示にも渡し、秒の切り替わりを同期する。
  const handleTimerClockUpdate = useCallback((currentTimeMs: number) => {
    setTimerNow(currentTimeMs)
    persistTimerLogs(timerLogsRef.current, currentTimeMs)
  }, [persistTimerLogs])
  // 新しいモードが始まった時刻で直前のログを確定する。
  const handleTimerLog = useCallback((entry: TimerLogEntry) => {
    const nextLogs = [...timerLogsRef.current]
    const previousEntry = nextLogs.at(-1)

    if (previousEntry && previousEntry.endedAt === null) {
      nextLogs[nextLogs.length - 1] = {
        ...previousEntry,
        endedAt: Math.max(previousEntry.startedAt, entry.startedAt),
      }
    }

    nextLogs.push(entry)
    timerLogsRef.current = nextLogs
    setTimerLogs(nextLogs)
    persistTimerLogs(nextLogs, entry.startedAt)
  }, [persistTimerLogs])
  const requestModelReload = useCallback(() => {
    setModelReloadRequest((request) => request + 1)
  }, [])
  const handleModelLoadStart = useCallback(() => {
    setModelLoadStatus('loading')
    setAnalysisError(null)
    // 読み込み完了まで同じ通知を維持し、成功・失敗時に同じidで更新する。
    toast.loading('モデル読み込み中です', {
      duration: Infinity,
      id: POSE_MODEL_LOAD_TOAST_ID,
    })
  }, [])
  const handleModelReady = useCallback(() => {
    setModelLoadStatus('ready')
    setAnalysisError(null)
    toast.dismiss(POSE_ANALYSIS_ERROR_TOAST_ID)
    toast.success('読み込みに成功しました！', {
      id: POSE_MODEL_LOAD_TOAST_ID,
    })
  }, [])
  const handleModelLoadError = useCallback((message: string) => {
    setModelLoadStatus('error')
    setAnalysisError(message)
    // ユーザー操作があった場合だけモデルの再読み込みを実行する。
    toast.error('モデルの読み込みに失敗しました', {
      action: {
        label: '再読み込み',
        onClick: requestModelReload,
      },
      description: message,
      duration: Infinity,
      id: POSE_MODEL_LOAD_TOAST_ID,
    })
  }, [requestModelReload])
  const handleAnalysisError = useCallback((message: string) => {
    setAnalysisError(message)
    // 同じidの通知は新規追加ではなく更新されるため、連続発生しても1件だけ表示される。
    toast.error('姿勢解析でエラーが発生しました', {
      description: message,
      id: POSE_ANALYSIS_ERROR_TOAST_ID,
    })
  }, [])
  const handleTimerModeChange = useCallback((nextMode: TimerMode) => {
    setTimerMode(nextMode)
    setAnalysisError(null)
    toast.dismiss(POSE_ANALYSIS_ERROR_TOAST_ID)
  }, [])
  const handleAwayDetected = useCallback(() => {
    setAutoPauseRequest((request) => request + 1)
    toast.warning('離席を検出したためタイマーを停止しました', {
      id: AUTO_AWAY_TOAST_ID,
    })
  }, [])
  const handleIntervalComplete = useCallback((result: ScoreIntervalResult) => {
    if (result.isCalibration && !result.calibrationSucceeded) {
      toast.warning('基準姿勢を取得できなかったため、次の1分で再試行します', {
        id: CALIBRATION_TOAST_ID,
      })
    } else if (result.calibrationSucceeded) {
      toast.success('基準姿勢を保存しました', { id: CALIBRATION_TOAST_ID })
    }
    onScoreUpdate(result)
  }, [onScoreUpdate])
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // 取得済みのストリームだけを表示し、再取得中も計測画面自体は維持する。
    video.srcObject = cameraStream
    if (cameraStream) void video.play()

    return () => {
      video.srcObject = null
    }
  }, [cameraStream])

  useEffect(() => () => {
    // 読み込み途中で画面を離れた場合に、待機中の通知を次画面へ残さない。
    toast.dismiss(POSE_MODEL_LOAD_TOAST_ID)
    toast.dismiss(POSE_ANALYSIS_ERROR_TOAST_ID)
  }, [])

  useEffect(() => {
    const handlePageHide = () => {
      persistTimerLogs(timerLogsRef.current, Date.now())
    }
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      // 通常の画面遷移でも、最後に観測した状態を同じセッションへ保存する。
      persistTimerLogs(timerLogsRef.current, Date.now())
    }
  }, [persistTimerLogs])

  usePoseScoring({
    enabled: status === 'measuring' && timerMode === 'focus',
    initialBaseline: baseline,
    initialIntervalNumber: nextIntervalNumber,
    onAwayDetected: handleAwayDetected,
    onBaselineChange,
    onError: handleAnalysisError,
    onIntervalComplete: handleIntervalComplete,
    onModelLoadError: handleModelLoadError,
    onModelLoadStart: handleModelLoadStart,
    onModelReady: handleModelReady,
    reloadRequest: modelReloadRequest,
    sessionId,
    videoRef,
  })

  const analysisStatus: 'error' | 'loading' | 'paused' | 'ready' =
    modelLoadStatus === 'loading'
      ? 'loading'
      : modelLoadStatus === 'error' || analysisError
        ? 'error'
        : timerMode === 'focus'
          ? 'ready'
          : 'paused'
  // ヘッダーの表示はタイマーの状態から導き、ランプ色と時刻の文字色を対応させる。
  const timerStatus = getTimerStatus(timerMode)

  return (
    <main className="measurement-page">
      <AppHeader
        status={status === 'measuring' ? timerStatus.label : '計測準備中'}
        statusTone={status === 'measuring' ? timerStatus.tone : 'setup'}
      />

      {/* 左を上下1:1、画面全体を横3:2に分ける計測画面の基本骨格。 */}
      <div className="measurement-page__layout">
        <div className="measurement-page__left-column">
          <section
            className="measurement-panel measurement-panel--camera"
            aria-label="カメラ"
          >
            <div className="camera-panel__body">
              <div
                className={`camera-panel__preview ${isCameraBlurred ? 'camera-panel__preview--blurred' : ''}`}
                aria-label="カメラ映像表示領域"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                />
                {!cameraStream && (
                  <div
                    className="camera-panel__placeholder"
                    role={cameraError ? 'alert' : 'status'}
                  >
                    <span className="camera-panel__camera-icon" aria-hidden="true" />
                    <strong>
                      {isPreparingCamera
                        ? 'カメラを準備中です…'
                        : 'カメラを利用できません'}
                    </strong>
                    <small>
                      {cameraError ??
                        '再読み込み後のカメラストリームを取得しています。'}
                    </small>
                    {!isPreparingCamera && (
                      <Button variant="secondary" onClick={onCameraRetry}>
                        カメラを再取得
                      </Button>
                    )}
                  </div>
                )}
                {isCameraBlurred && (
                  <div className="camera-panel__blur-message">
                    <strong>カメラ映像をぼかしています</strong>
                    <small>計測は引き続き動作しています</small>
                  </div>
                )}
              </div>

              <div className="camera-panel__controls" aria-label="カメラ操作">
                <Button
                  variant="secondary"
                  aria-pressed={isCameraBlurred}
                  disabled={!cameraStream}
                  onClick={() => setIsCameraBlurred((blurred) => !blurred)}
                >
                  {isCameraBlurred ? 'ぼかしを解除' : 'カメラをぼかす'}
                </Button>
              </div>
            </div>
          </section>

          <section
            className="measurement-panel measurement-panel--timer"
            aria-label="タイマー"
          >
            <div className="timer-panel__body">
              <SessionLog currentTimeMs={timerNow} entries={timerLogs} />

              <div className="timer-panel__clock">
                <Timer
                  autoPauseRequest={autoPauseRequest}
                  disabled={status !== 'measuring'}
                  initialElapsedMs={initialElapsedMs}
                  initialLogId={initialLogId}
                  onClockUpdate={handleTimerClockUpdate}
                  onExit={onFinish}
                  onLogEntry={handleTimerLog}
                  onModeChange={handleTimerModeChange}
                  startDisabled={modelLoadStatus !== 'ready'}
                  targetMinutes={targetMinutes}
                />
              </div>
            </div>
          </section>
        </div>

        <ScorePanel
          analysisError={analysisError}
          analysisStatus={analysisStatus}
          originalScore={originalScore}
          scoreIncrement={scoreIncrement}
        />
      </div>
    </main>
  )
}
