import type { StatusTone } from './statusTone.ts'
import './AppHeader.css'

type AppHeaderProps = {
  status: string
  statusTone?: StatusTone
}

export function AppHeader({ status, statusTone = 'setup' }: AppHeaderProps) {
  // ブランド表示を全ページで統一し、ページ固有の状態だけを受け取る。
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span aria-hidden="true">S</span>
        <div>
          <strong>Score Pomodoro</strong>
          <small>FOCUS SESSION</small>
        </div>
      </div>
      <div
        className={`app-header__status app-header__status--${statusTone}`}
        role="status"
      >
        <span aria-hidden="true" />
        {status}
      </div>
    </header>
  )
}
