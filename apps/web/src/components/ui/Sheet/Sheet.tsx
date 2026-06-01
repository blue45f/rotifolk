import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Sheet.module.css'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?: 'sheet' | 'modal'
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  variant = 'sheet',
}: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = original
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className={styles.backdrop}>
      <button type="button" className={styles.scrim} aria-label="배경 닫기" onClick={onClose} />
      <div
        className={`${styles.panel} ${styles[`v_${variant}`]} ${styles[`s_${size}`]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
      >
        {(title || description) && (
          <header className={styles.header}>
            {title && (
              <h2 id="sheet-title" className={styles.title}>
                {title}
              </h2>
            )}
            {description && <p className={styles.desc}>{description}</p>}
          </header>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
        <button type="button" aria-label="닫기" className={styles.close} onClick={onClose}>
          ✕
        </button>
      </div>
    </div>,
    document.body,
  )
}

export default Sheet
