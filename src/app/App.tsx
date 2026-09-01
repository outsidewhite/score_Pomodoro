import CameraDemo from '../App.tsx'
import { MeasurementPage } from '../pages/measurement/MeasurementPage.tsx'

function App() {
  // 末尾のスラッシュを取り除き、どちらのURL表記でも同じ画面を表示する。
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/'

  if (currentPath === '/measurement') {
    return (
      <MeasurementPage
        currentScore={null}
        elapsedMs={0}
        onFinish={() => undefined}
        status="measuring"
      />
    )
  }

  // トップページでは既存のカメラ解析デモを引き続き表示する。
  return <CameraDemo />
}

export default App
