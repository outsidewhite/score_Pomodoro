import { Button } from '../../components/ui/Button.tsx'
import type { MeasurementStatus } from '../../shared/types/measurement.ts'
import './MeasurementPage.css'

type MeasurementPageProps = {
  currentScore: number | null
  elapsedMs: number
  onFinish: () => void
  status: MeasurementStatus
}

function formatElapsedTime(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function MeasurementPage({
  currentScore,
  elapsedMs,
  onFinish,
  status,
}: MeasurementPageProps) {
  return (
    <main className="measurement-page">
      <header className="measurement-page__header">
        <div>
          <p>計測時間</p>
          <strong>{formatElapsedTime(elapsedMs)}</strong>
        </div>
        <div aria-live="polite">
          <p>現在のスコア</p>
          <strong>{currentScore ?? '—'}</strong>
        </div>
      </header>

      <section className="measurement-page__preview" aria-label="カメラ映像表示領域">
        <p>カメラ映像と姿勢解析結果をここに表示します。</p>
      </section>

      <Button onClick={onFinish} disabled={status !== 'measuring'}>
        計測を終了
      </Button>
    </main>
  )
}
