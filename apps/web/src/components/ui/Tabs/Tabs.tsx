import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { type ReactNode } from 'react'

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
  /** Accessible name for the segmented control. */
  label?: string
}

/**
 * Segmented control on top of Radix ToggleGroup (single select). Radix gives
 * roving tabindex + arrow-key navigation and `data-state` styling hooks; the
 * public `tabs / value / onChange` API is unchanged. Deselecting to empty is
 * suppressed so one segment is always active.
 */
export function Tabs({ tabs, value, onChange, size = 'md', variant = 'pill', label }: Props) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next)
      }}
      className={[styles.group, styles[`s_${size}`], styles[`v_${variant}`]].join(' ')}
      aria-label={label}
    >
      {tabs.map((t) => (
        <ToggleGroup.Item
          key={t.value}
          value={t.value}
          className={`${styles.tab} ${value === t.value ? styles.active : ''}`}
        >
          {t.icon}
          <span>{t.label}</span>
          {t.badge && <span className={styles.badge}>{t.badge}</span>}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}

export default Tabs
