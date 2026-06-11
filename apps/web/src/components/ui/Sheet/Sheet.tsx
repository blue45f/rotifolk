import { useEffect, useRef, type ReactNode } from 'react'
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

/** 보이는 포커서블만 추린다 — proto-live dialog 패턴 차용. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => {
      const computed = window.getComputedStyle(element)
      return computed.visibility !== 'hidden' && computed.display !== 'none'
    },
  )
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
  const panelRef = useRef<HTMLDivElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    // 포커스 트랩 — 열릴 때 시트 안으로 들어가고, Tab은 시트 안에서만 순환한다.
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : previousFocusRef.current
    const focusables = getFocusableElements(panelRef.current)
    if (focusables.length > 0) {
      focusables[0].focus()
    } else {
      panelRef.current?.focus()
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const items = getFocusableElements(panelRef.current)
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      // 시트 밖으로 새는 경우(포털 외부 포커스 포함)도 안으로 끌어온다.
      if (!event.shiftKey && (active === last || !panelRef.current?.contains(active))) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault()
        last.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = original
      // 닫힐 때 열기 전에 포커스가 있던 자리로 되돌린다.
      const restoreTarget = previousFocusRef.current
      if (restoreTarget && restoreTarget.isConnected) {
        restoreTarget.focus()
      }
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className={styles.backdrop}>
      <button type="button" className={styles.scrim} aria-label="배경 닫기" onClick={onClose} />
      <div
        ref={panelRef}
        className={`${styles.panel} ${styles[`v_${variant}`]} ${styles[`s_${size}`]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        aria-describedby={description ? 'sheet-description' : undefined}
        tabIndex={-1}
      >
        {(title || description) && (
          <header className={styles.header}>
            {title && (
              <h2 id="sheet-title" className={styles.title}>
                {title}
              </h2>
            )}
            {description && (
              <p id="sheet-description" className={styles.desc}>
                {description}
              </p>
            )}
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
