import { AppHeader } from './components/layout/AppHeader'
import { AnalysisPanel } from './features/analysis/AnalysisPanel'
import { CameraPanel } from './features/camera/CameraPanel'
import { usePoseCamera } from './features/camera/usePoseCamera'
import './styles/page.css'

function App() {
  const {
    analysisErrorMessage,
    analysisResult,
    errorMessage,
    modelErrorMessage,
    modelStatus,
    startCamera,
    status,
    stopCamera,
    videoRef,
  } = usePoseCamera()

  return (
    <main className="camera-page">
      <AppHeader cameraStatus={status} modelStatus={modelStatus} />

      <section className="camera-demo" aria-labelledby="camera-title">
        <div className="intro">
          <p className="eyebrow">POSE ANALYSIS</p>
          <h1 id="camera-title">姿勢ランドマークを解析</h1>
          <p>
            カメラ映像をMediaPipe Tasks Visionでリアルタイム解析し、
            検出した人物と各ランドマークの座標を表示します。
          </p>
        </div>

        <div className="workspace-grid">
          <CameraPanel
            errorMessage={errorMessage}
            onStart={startCamera}
            onStop={stopCamera}
            status={status}
            videoRef={videoRef}
          />
          <AnalysisPanel
            analysisErrorMessage={analysisErrorMessage}
            analysisResult={analysisResult}
            isCameraActive={status === 'active'}
            modelErrorMessage={modelErrorMessage}
            modelStatus={modelStatus}
          />
        </div>
      </section>
    </main>
  )
}

export default App
