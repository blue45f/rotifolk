import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Chip.module.css'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  leadingEmoji?: string
  children: ReactNode
}

export function Chip({ selected, leadingEmoji, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      className={[styles.chip, selected && styles.selected, className].filter(Boolean).join(' ')}
      aria-pressed={selected}
      {...rest}
    >
      {leadingEmoji && <span aria-hidden="true">{leadingEmoji}</span>}
      <span>{children}</span>
    </button>
  )
}

export default Chip
