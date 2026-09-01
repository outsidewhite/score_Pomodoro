import { useEffect } from 'react'
import { MeasurementPage } from './pages/measurement/MeasurementPage.tsx'
import './App.css'

function App() {
  useEffect(() => {
    // 仮サイトを経由せず、起動時のURLを計測画面へ統一する。
    if (window.location.pathname !== '/measurement') {
      window.history.replaceState(null, '', '/measurement')
    }
  }, [])

  return (
    <div className="app-shell">
      <MeasurementPage
        currentScore={null}
        elapsedMs={0}
        onFinish={() => undefined}
        status="measuring"
      />
    </div>
  )
}

export default App
