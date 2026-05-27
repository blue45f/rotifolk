import { useEffect } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'rotifolk-theme', storage: createJSONStorage(() => localStorage) },
  ),
)

export function useApplyTheme() {
  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    const root = document.documentElement
    const apply = (t: 'light' | 'dark') => root.setAttribute('data-theme', t)
    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      const update = () => apply(mql.matches ? 'dark' : 'light')
      update()
      mql.addEventListener('change', update)
      return () => mql.removeEventListener('change', update)
    }
    apply(theme)
  }, [theme])
}
