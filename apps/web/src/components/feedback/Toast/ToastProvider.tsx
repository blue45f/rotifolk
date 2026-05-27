import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import styles from './Toast.module.css'

export type ToastKind = 'info' | 'success' | 'warning' | 'error'

export interface ToastItem {
  id: string
  kind: ToastKind
  message: string
  durationMs?: number
}

interface Ctx {
  show: (msg: string, kind?: ToastKind, durationMs?: number) => void
}

const ToastContext = createContext<Ctx | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const show = useCallback((message: string, kind: ToastKind = 'info', durationMs = 2800) => {
    const id = `t-${++seq.current}`
    setItems((prev) => [...prev, { id, kind, message, durationMs }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, durationMs)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.layer} role="region" aria-label="알림 영역">
        {items.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[`k_${t.kind}`]}`} role="status">
            <span className={styles.dot} aria-hidden="true" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
