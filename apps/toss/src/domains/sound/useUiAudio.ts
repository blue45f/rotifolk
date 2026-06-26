import { useCallback, useEffect, useState } from 'react'

const UI_SOUND_STORAGE_KEY = 'rotifolk-ui-audio'
const UI_SOUND_EVENT = 'rotifolk-ui-audio-state'
const UI_SOUND_DEFAULT = true

function readFromStorage(raw: string | null): boolean {
  if (raw == null) return UI_SOUND_DEFAULT
  if (raw === '0') return false
  if (raw === '1') return true
  if (raw.toLowerCase() === 'false') return false
  if (raw.toLowerCase() === 'true') return true
  if (raw === 'off') return false
  if (raw === 'on') return true
  const numeric = Number(raw)
  if (Number.isFinite(numeric)) return numeric !== 0
  return UI_SOUND_DEFAULT
}

export function readUiAudioEnabled(): boolean {
  if (typeof window === 'undefined') return UI_SOUND_DEFAULT

  try {
    const raw = window.localStorage.getItem(UI_SOUND_STORAGE_KEY)
    return readFromStorage(raw)
  } catch {
    return UI_SOUND_DEFAULT
  }
}

export function writeUiAudioEnabled(next: boolean) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(UI_SOUND_STORAGE_KEY, String(next))
  } catch {
    // storage 정책/시크릿모드 예외 — 즉시 반영이 안 되더라도 동작은 유지.
  }

  try {
    const event = new CustomEvent<boolean>(UI_SOUND_EVENT, { detail: next })
    window.dispatchEvent(event)
  } catch {
    // 일부 환경에서 CustomEvent 제한될 수 있음.
  }
}

export function isUiAudioEnabled(): boolean {
  return readUiAudioEnabled()
}

export function useUiAudioEnabled() {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => readUiAudioEnabled())

  const setEnabled = useCallback((next: boolean) => {
    writeUiAudioEnabled(next)
    setIsEnabled(next)
  }, [])

  const toggle = useCallback(() => {
    const next = !isEnabled
    writeUiAudioEnabled(next)
    setIsEnabled(next)
  }, [isEnabled])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = (event: Event) => {
      const next = (event as CustomEvent<boolean>).detail
      if (typeof next === 'boolean') {
        setIsEnabled(next)
        return
      }
      setIsEnabled(readUiAudioEnabled())
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== UI_SOUND_STORAGE_KEY) return
      setIsEnabled(readUiAudioEnabled())
    }

    window.addEventListener(UI_SOUND_EVENT, handler as EventListener)
    window.addEventListener('storage', onStorage)
    setIsEnabled(readUiAudioEnabled())

    return () => {
      window.removeEventListener(UI_SOUND_EVENT, handler as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return {
    isEnabled,
    setEnabled,
    toggle,
  }
}
