import type { HTMLAttributes } from 'react'
import type { HostLevel } from '@rotifolk/shared'
import { HOST_LEVELS } from '@rotifolk/shared'
import styles from './HostLevelBadge.module.css'

interface HostLevelBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  level: HostLevel
  size?: 'sm' | 'md'
}

export function HostLevelBadge({
  level,
  size = 'sm',
  className,
  ...rest
}: HostLevelBadgeProps) {
  const info = HOST_LEVELS.find((l) => l.level === level) ?? HOST_LEVELS[0]
  const cls = [
    styles.badge,
    styles[`lvl_${info.level}`],
    styles[`s_${size}`],
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <span className={cls} title={`${info.label} 호스트`} {...rest}>
      <span className={styles.emoji} aria-hidden>{info.emoji}</span>
      <span className={styles.label}>{info.label}</span>
    </span>
  )
}

export default HostLevelBadge
