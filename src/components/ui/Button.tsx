import type { ButtonHTMLAttributes } from 'react'
import './Button.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

export function Button({
  className = '',
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = ['button', `button--${variant}`, className]
    .filter(Boolean)
    .join(' ')

  return <button className={classes} type={type} {...props} />
}
