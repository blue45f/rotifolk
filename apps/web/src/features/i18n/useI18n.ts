import { useCallback, useContext, type Dispatch, type SetStateAction } from 'react'

import { LocaleContext, type Locale, type LocaleContextValue } from './i18nContext'

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale/useT must be used within <I18nProvider>')
  }
  return ctx
}

export function useLocale(): [Locale, Dispatch<SetStateAction<Locale>>] {
  const { locale, setLocale } = useLocaleContext()
  return [locale, setLocale]
}

export function useT() {
  const { dict, fallbackDict } = useLocaleContext()
  return useCallback(
    (key: string): string => {
      const hit = dict[key]
      if (hit !== undefined) return hit
      return fallbackDict[key] ?? key
    },
    [dict, fallbackDict]
  )
}
