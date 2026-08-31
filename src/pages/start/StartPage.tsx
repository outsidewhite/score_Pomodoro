import { Button } from '../../components/ui/Button.tsx'
import './StartPage.css'

type StartPageProps = {
  isPreparing?: boolean
  onStart: () => void
}

export function StartPage({
  isPreparing = false,
  onStart,
}: StartPageProps) {
  return (
    <main className="start-page">
      <section className="start-page__content" aria-labelledby="start-title">
        <p className="start-page__eyebrow">SCORE POMODORO</p>
        <h1 id="start-title">集中時間を計測する</h1>
        <p>
          カメラから姿勢を解析し、作業中の集中状態をスコアとして記録します。
        </p>
        <Button onClick={onStart} disabled={isPreparing}>
          {isPreparing ? '準備中…' : '計測を開始'}
        </Button>
      </section>
    </main>
  )
}
