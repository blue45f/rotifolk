import { Button } from '@components/ui/Button/Button'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { useCallback, useRef, useState, type ReactNode } from 'react'

import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './ConfirmContext'

/**
 * Imperative `confirm()` resolving to a boolean, backed by the branded modal
 * {@link Sheet} — a themed, accessible replacement for `globalThis.confirm`. One
 * instance lives at the app root (like the Toaster); call sites do
 * `if (!(await confirm({ title, danger: true }))) return`.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = useCallback((result: boolean) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setOptions(null)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        open={options !== null}
        onClose={() => settle(false)}
        variant="modal"
        size="sm"
        title={options?.title}
        footer={
          options ? (
            <>
              <Button variant="ghost" onClick={() => settle(false)}>
                {options.cancelLabel ?? '취소'}
              </Button>
              <Button variant={options.danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
                {options.confirmLabel ?? '확인'}
              </Button>
            </>
          ) : null
        }
      >
        {options?.description ? <p>{options.description}</p> : null}
      </Sheet>
    </ConfirmContext.Provider>
  )
}
