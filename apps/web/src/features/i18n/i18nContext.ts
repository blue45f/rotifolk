import { createContext, type Dispatch, type SetStateAction } from 'react'

export type Locale = 'ko' | 'en'

export interface LocaleContextValue {
  locale: Locale
  setLocale: Dispatch<SetStateAction<Locale>>
  dict: Record<string, string>
  fallbackDict: Record<string, string>
}

export const LocaleContext = createContext<LocaleContextValue | null>(null)
