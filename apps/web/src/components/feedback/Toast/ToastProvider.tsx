import * as Toast from '@radix-ui/react-toast'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'

import styles from './Toast.module.css'
import { ToastContext, type ToastItem, type ToastKind } from './ToastContext'

/**
 * Toaster on top of Radix Toast. The public `show()` API is unchanged; Radix
 * adds aria-live announcement, swipe-to-dismiss, and pause-on-hover/focus.
 * Each call appends an item; Radix drives its `duration` and removal.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const show = useCallback((message: string, kind: ToastKind = 'info', durationMs = 2800) => {
    const id = `t-${++seq.current}`
    setItems((prev) => [...prev, { id, kind, message, durationMs }])
  }, [])

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      <Toast.Provider swipeDirection="right" label="알림">
        {children}
        {items.map((t) => (
          <Toast.Root
            key={t.id}
            duration={t.durationMs}
            onOpenChange={(open) => {
              if (!open) remove(t.id)
            }}
            className={`${styles.toast} ${styles[`k_${t.kind}`]}`}
          >
            <span className={styles.dot} aria-hidden="true" />
            <Toast.Title>{t.message}</Toast.Title>
          </Toast.Root>
        ))}
        <Toast.Viewport className={styles.layer} />
      </Toast.Provider>
    </ToastContext.Provider>
  )
}
