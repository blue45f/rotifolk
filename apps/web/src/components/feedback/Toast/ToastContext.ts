import { createContext } from 'react'

export type ToastKind = 'info' | 'success' | 'warning' | 'error'

export interface ToastItem {
  id: string
  kind: ToastKind
  message: string
  durationMs?: number
}

export interface ToastContextValue {
  show: (msg: string, kind?: ToastKind, durationMs?: number) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
