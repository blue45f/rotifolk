import styles from './EmptyState.module.css'

import type { ReactNode } from 'react'

interface Props {
  emoji?: string
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ emoji = '🍷', title, description, action }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.emoji} aria-hidden="true">
        {emoji}
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.desc}>{description}</p>}
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  )
}
