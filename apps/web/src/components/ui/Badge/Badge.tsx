import styles from './Badge.module.css'

import type { HTMLAttributes, ReactNode } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?:
    | 'neutral'
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'gold'
    | 'wine'
    | 'coffee'
    | 'tea'
    | 'whisky'
  size?: 'sm' | 'md'
  outlined?: boolean
  children: ReactNode
}

export function Badge({
  tone = 'neutral',
  size = 'sm',
  outlined,
  className,
  children,
  ...rest
}: BadgeProps) {
  const cls = [
    styles.badge,
    styles[`t_${tone}`],
    styles[`s_${size}`],
    outlined && styles.outlined,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  )
}

export default Badge
