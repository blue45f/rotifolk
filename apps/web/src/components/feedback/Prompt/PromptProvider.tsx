import { useId, useRef, useState, type ReactNode } from 'react'

import { Button } from '@components/ui/Button/Button'
import { Input } from '@components/ui/Input/Input'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { PromptContext, type PromptFn, type PromptOptions } from './PromptContext'

/**
 * Imperative `prompt()` resolving to the entered string (or `null` when
 * dismissed), backed by the branded modal {@link Sheet} — a themed, accessible
 * replacement for `window.prompt`. One instance lives at the app root next to
 * the ConfirmProvider; call sites do
 * `const name = await prompt({ title, label }); if (name === null) return`.
 */
export function PromptProvider({ children }: { children: ReactNode }) {
  const formId = useId()
  const [options, setOptions] = useState<PromptOptions | null>(null)
  const [value, setValue] = useState('')
  const resolverRef = useRef<((result: string | null) => void) | null>(null)

  const prompt: PromptFn = (opts) => {
    // Settle a dangling request (re-entrant open) as dismissed before replacing it.
    resolverRef.current?.(null)
    setOptions(opts)
    setValue(opts.defaultValue ?? '')
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve
    })
  }

  const settle = (result: string | null) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setOptions(null)
  }

  return (
    <PromptContext.Provider value={prompt}>
      {children}
      <Sheet
        open={options !== null}
        onClose={() => settle(null)}
        variant="modal"
        size="sm"
        title={options?.title}
        description={options?.description}
        footer={
          options ? (
            <>
              <Button variant="ghost" onClick={() => settle(null)}>
                {options.cancelLabel ?? '취소'}
              </Button>
              <Button type="submit" form={formId}>
                {options.confirmLabel ?? '확인'}
              </Button>
            </>
          ) : null
        }
      >
        {options ? (
          <form
            id={formId}
            onSubmit={(event) => {
              event.preventDefault()
              settle(value)
            }}
          >
            <Input
              label={options.label}
              placeholder={options.placeholder}
              maxLength={options.maxLength}
              autoComplete="off"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </form>
        ) : null}
      </Sheet>
    </PromptContext.Provider>
  )
}
