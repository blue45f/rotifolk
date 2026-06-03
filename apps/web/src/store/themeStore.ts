import { useEffect } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

/** localStorage key shared with the no-FOUC inline bootstrap in index.html. */
export const THEME_STORAGE_KEY = 'rotifolk-theme'

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    { name: THEME_STORAGE_KEY, storage: createJSONStorage(() => localStorage) },
  ),
)

/**
 * Pure resolver: maps a stored preference + system signal to the concrete
 * `data-theme` value. Kept side-effect-free so it can be unit-tested and so the
 * pre-paint inline script in index.html stays in lockstep with the React store.
 */
export function resolveTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  return prefersDark ? 'dark' : 'light'
}

export function useApplyTheme() {
  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    const root = document.documentElement
    const apply = (t: 'light' | 'dark') => root.setAttribute('data-theme', t)
    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      const update = () => apply(resolveTheme('system', mql.matches))
      update()
      mql.addEventListener('change', update)
      return () => mql.removeEventListener('change', update)
    }
    apply(resolveTheme(theme, false))
  }, [theme])
}
