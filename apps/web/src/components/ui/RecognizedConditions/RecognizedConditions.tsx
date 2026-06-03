import type { SmartChip } from '@rotifolk/shared'
import styles from './RecognizedConditions.module.css'

export interface RecognizedConditionsProps {
  /** Recognized filter chips (e.g. from `describeParse()` in the smart search). */
  chips: SmartChip[]
  /** Leading label for the row. */
  label?: string
  /** Accessible label for the chip group. */
  'aria-label'?: string
}

/**
 * Read-only "recognized search conditions" chip row.
 *
 * Presentational extraction of the smart-search parsed-filter row: renders the
 * structured filters the natural-language search recognized (category, area,
 * format, capacity, day, time-of-day, residual query) as non-interactive info
 * chips. Returns `null` when there is nothing to show.
 */
export function RecognizedConditions({
  chips,
  label = '인식한 조건',
  'aria-label': ariaLabel = '인식된 검색 필터',
}: RecognizedConditionsProps) {
  if (chips.length === 0) return null
  return (
    <div className={styles.row} aria-label={ariaLabel}>
      <span className={styles.label}>{label}</span>
      <div className={styles.chips}>
        {chips.map((c) => (
          <span key={c.key} className={styles.chip}>
            {c.emoji != null && c.emoji !== '' && (
              <span className={styles.mark} aria-hidden="true">
                {c.emoji}
              </span>
            )}
            <span>{c.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default RecognizedConditions
