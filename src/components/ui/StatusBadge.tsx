import './StatusBadge.css'

type StatusTone = 'neutral' | 'pending' | 'success' | 'error'

type StatusBadgeProps = {
  compact?: boolean
  label: string
  tone?: StatusTone
}

export function StatusBadge({
  compact = false,
  label,
  tone = 'neutral',
}: StatusBadgeProps) {
  const classes = [
    'status-badge',
    `status-badge--${tone}`,
    compact ? 'status-badge--compact' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} role="status">
      <span className="status-badge__dot" aria-hidden="true" />
      {label}
    </span>
  )
}
