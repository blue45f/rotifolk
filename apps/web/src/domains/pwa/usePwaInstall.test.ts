import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePwaInstall } from './usePwaInstall'

const DISMISSED_KEY = 'rotifolk-pwa-dismissed-at'

describe('usePwaInstall', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  it('captures beforeinstallprompt and handles acceptance', async () => {
    const { result } = renderHook(() => usePwaInstall())
    const prompt = vi.fn().mockResolvedValue(undefined)
    const userChoice = Promise.resolve({ outcome: 'accepted' as const })
    const event = new Event('beforeinstallprompt') as Event & {
      preventDefault: () => void
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
    }
    const preventDefault = vi.fn()

    Object.assign(event, {
      prompt,
      userChoice,
      preventDefault,
    })

    act(() => {
      globalThis.dispatchEvent(event)
    })

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(result.current.canInstall).toBe(true)

    await act(async () => {
      await result.current.install()
    })

    expect(prompt).toHaveBeenCalledTimes(1)
    expect(result.current.canInstall).toBe(false)
  })

  it('dismisses for 14 days and records timestamp', () => {
    const dismissedAt = Date.now() - 1_000
    globalThis.localStorage.setItem(DISMISSED_KEY, String(dismissedAt))
    const { result } = renderHook(() => usePwaInstall())

    expect(result.current.canInstall).toBe(false)

    act(() => {
      result.current.dismiss()
    })

    const current = Number(globalThis.localStorage.getItem(DISMISSED_KEY))
    expect(current).toBeGreaterThan(dismissedAt)
    expect(result.current.canInstall).toBe(false)
  })

  it('sets installed state when appinstalled event fires', () => {
    const { result } = renderHook(() => usePwaInstall())
    const prompt = vi.fn().mockResolvedValue(undefined)
    const userChoice = Promise.resolve({ outcome: 'dismissed' as const })
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
    }

    Object.assign(event, { prompt, userChoice })

    act(() => {
      globalThis.dispatchEvent(event)
      globalThis.dispatchEvent(new Event('appinstalled'))
    })

    expect(result.current.canInstall).toBe(false)
  })
})
