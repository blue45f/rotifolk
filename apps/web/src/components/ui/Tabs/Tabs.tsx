import { type ReactNode, useId } from 'react'

import styles from './Tabs.module.css'

interface Tab {
  value: string
  label: string
  icon?: ReactNode
  badge?: ReactNode
}

interface Props {
  tabs: Tab[]
  value: string
  onChange: (value: string) => void
  size?: 'sm' | 'md'
  variant?: 'pill' | 'underline'
}

export function Tabs({ tabs, value, onChange, size = 'md', variant = 'pill' }: Props) {
  const groupId = useId()
  return (
    <div
      className={[styles.group, styles[`s_${size}`], styles[`v_${variant}`]].join(' ')}
      role="tablist"
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          aria-controls={`tab-${groupId}-${t.value}`}
          className={`${styles.tab} ${value === t.value ? styles.active : ''}`}
          onClick={() => onChange(t.value)}
        >
          {t.icon}
          <span>{t.label}</span>
          {t.badge && <span className={styles.badge}>{t.badge}</span>}
        </button>
      ))}
    </div>
  )
}

export default Tabs
