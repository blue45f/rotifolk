import styles from './Chip.module.css'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  leadingEmoji?: string
  /** Inline-SVG (or other node) leading mark. Takes precedence over leadingEmoji. */
  leadingIcon?: ReactNode
  children: ReactNode
}

export function Chip({
  selected,
  leadingEmoji,
  leadingIcon,
  className,
  children,
  ...rest
}: ChipProps) {
  const leading = leadingIcon ?? leadingEmoji
  return (
    <button
      type="button"
      className={[styles.chip, selected && styles.selected, className].filter(Boolean).join(' ')}
      aria-pressed={selected}
      {...rest}
    >
      {leading != null && leading !== '' && (
        <span className={styles.leading} aria-hidden="true">
          {leading}
        </span>
      )}
      <span>{children}</span>
    </button>
  )
}

export default Chip
