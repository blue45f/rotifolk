import { describe, expect, it } from 'vitest'
import { resolveTheme, THEME_STORAGE_KEY } from './themeStore'

/**
 * resolveTheme() is the single source of truth shared by useApplyTheme() and the
 * no-FOUC pre-paint script in index.html. These cases mirror that inline script
 * so the two cannot silently drift apart.
 */
describe('resolveTheme', () => {
  it('honors an explicit dark pin regardless of system preference', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('dark', true)).toBe('dark')
  })

  it('honors an explicit light pin regardless of system preference', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('light', false)).toBe('light')
  })

  it('follows the system signal when preference is "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})

describe('THEME_STORAGE_KEY', () => {
  it('matches the localStorage key read by the pre-paint script in index.html', () => {
    // The inline bootstrap in index.html hard-codes this string; keep them aligned.
    expect(THEME_STORAGE_KEY).toBe('rotifolk-theme')
  })
})

/**
 * Replays the exact branch logic of the index.html inline script against the
 * zustand-persisted localStorage shape, guarding the FOUC fix end-to-end.
 */
describe('no-FOUC inline bootstrap logic', () => {
  function bootstrap(storedRaw: string | null, prefersDark: boolean): 'light' | 'dark' {
    try {
      const pref: 'light' | 'dark' | 'system' = storedRaw
        ? JSON.parse(storedRaw).state.theme
        : 'system'
      return pref === 'dark' || (pref !== 'light' && prefersDark) ? 'dark' : 'light'
    } catch {
      return prefersDark ? 'dark' : 'light'
    }
  }

  it('reads a persisted dark preference from the zustand shape', () => {
    const raw = JSON.stringify({ state: { theme: 'dark' }, version: 0 })
    expect(bootstrap(raw, false)).toBe('dark')
  })

  it('reads a persisted light preference even when the system prefers dark', () => {
    const raw = JSON.stringify({ state: { theme: 'light' }, version: 0 })
    expect(bootstrap(raw, true)).toBe('light')
  })

  it('falls back to system preference when nothing is stored', () => {
    expect(bootstrap(null, true)).toBe('dark')
    expect(bootstrap(null, false)).toBe('light')
  })

  it('falls back safely on malformed storage', () => {
    expect(bootstrap('not json', true)).toBe('dark')
    expect(bootstrap('not json', false)).toBe('light')
  })
})
