import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

export type Locale = 'ko' | 'en'

const STORAGE_KEY = 'rotifolk-locale'

const KO: Record<string, string> = {
  'home.hero.title': '한 모금이 끝나기 전, 다음 자리로.',
  'cta.discover': '오늘의 파티',
  'cta.quick': '⚡ 즉석 모임',
  'nav.discover': '파티 탐색',
  'nav.venues': '장소',
  'nav.host': '호스트 콘솔',
  'nav.digest': '다이제스트',
  'nav.policies': '정책',
  'btn.login': '로그인',
  'btn.signup': '무료 시작',
  'btn.dark': '다크 모드',
  'btn.light': '라이트 모드',
}

const EN: Record<string, string> = {
  'home.hero.title': 'Before your sip ends, next seat.',
  'cta.discover': "Today's parties",
  'cta.quick': '⚡ Instant party',
  'nav.discover': 'Discover',
  'nav.venues': 'Venues',
  'nav.host': 'Host console',
  'nav.digest': 'Digest',
  'nav.policies': 'Policies',
  'btn.login': 'Login',
  'btn.signup': 'Start free',
  'btn.dark': 'Dark mode',
  'btn.light': 'Light mode',
}

const DICTS: Record<Locale, Record<string, string>> = { ko: KO, en: EN }

interface LocaleContextValue {
  locale: Locale
  setLocale: Dispatch<SetStateAction<Locale>>
  dict: Record<string, string>
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'ko'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'ko' || stored === 'en') return stored
  } catch {
    // ignore storage access errors (private mode etc.)
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : ''
  return nav.toLowerCase().startsWith('ko') ? 'ko' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectInitialLocale)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // ignore storage write errors
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, dict: DICTS[locale] }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

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
  const { dict } = useLocaleContext()
  return useCallback(
    (key: string): string => {
      const hit = dict[key]
      if (hit !== undefined) return hit
      // fallback to Korean dictionary, then the key itself
      return KO[key] ?? key
    },
    [dict],
  )
}
