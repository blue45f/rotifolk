import { useEffect, useState } from 'react'

export function useTransientMessage(hideAfterMs = 2200) {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    const id = globalThis.setTimeout(() => setMessage(null), hideAfterMs)
    return () => globalThis.clearTimeout(id)
  }, [message, hideAfterMs])

  return {
    message,
    show: (next: string) => setMessage(next),
    clear: () => setMessage(null),
  }
}
