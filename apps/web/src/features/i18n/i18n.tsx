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
  'nav.home': '홈',
  'nav.venues': '장소',
  'nav.community': '커뮤니티',
  'nav.neighborhood': '동네',
  'nav.host': '호스트 콘솔',
  'nav.digest': '다이제스트',
  'nav.policies': '정책',
  'nav.chats': '채팅',
  'nav.me': '내 프로필',
  'nav.notifications': '알림',
  'nav.calendar': '캘린더',
  'nav.quick': '즉석',
  'nav.help': '도움말',
  'nav.search': '검색',
  'nav.tutorial': '튜토리얼',
  'nav.hostApply': '호스트 시작',
  'nav.admin': '관리자',
  'theme.light': '라이트',
  'theme.dark': '다크',
  'theme.system': '시스템',
  'theme.switchLabel': '테마 모드 전환',
  'theme.modeLabel': '테마 모드 선택',
  'command.openLabel': '명령 팔레트 열기',
  'command.title': '빠른 이동',
  'command.placeholder': '페이지나 최근 검색어 검색',
  'command.group.navigation': '빠른 이동',
  'command.group.account': '내 계정',
  'command.group.host': '호스트',
  'command.group.admin': '관리자',
  'command.group.search': '검색',
  'command.group.recent': '최근 검색',
  'command.group.quickstart': '빠른 시작',
  'command.searchFor': '검색하기',
  'command.quick.onboarding': '튜토리얼 다시 보기',
  'command.quick.demoLogin': '데모 계정 시작',
  'command.quick.communityGuide': '커뮤니티 첫 질문 가이드',
  'command.quick.helpGuide': '도움말 8단계 가이드',
  'command.quick.policiesGuide': '필수 정책 바로 보기',
  'command.empty': '표시할 항목이 없습니다',
  'command.hints.navigate': '위아래 화살표',
  'command.hints.select': '엔터',
  'command.hints.close': 'ESC',
  'btn.login': '로그인',
  'btn.signup': '무료 시작',
  'btn.clear': '전체삭제',
  'btn.dark': '다크 모드',
  'btn.light': '라이트 모드',
  'footer.tagline': '좋은 와인처럼, 좋은 만남도 천천히 깊어집니다.',
  'footer.navLabel': '약관 및 도움말',
  'footer.terms': '이용약관',
  'footer.privacy': '개인정보처리방침',
  'footer.refund': '환불 정책',
}

const EN: Record<string, string> = {
  'home.hero.title': 'Before your sip ends, next seat.',
  'cta.discover': "Today's parties",
  'cta.quick': '⚡ Instant party',
  'nav.discover': 'Discover',
  'nav.home': 'Home',
  'nav.venues': 'Venues',
  'nav.community': 'Community',
  'nav.neighborhood': 'Neighborhood',
  'nav.host': 'Host console',
  'nav.digest': 'Digest',
  'nav.policies': 'Policies',
  'nav.chats': 'Chats',
  'nav.me': 'My profile',
  'nav.notifications': 'Notifications',
  'nav.calendar': 'Calendar',
  'nav.quick': 'Quick',
  'nav.help': 'Help',
  'nav.search': 'Search',
  'nav.tutorial': 'Tutorial',
  'nav.hostApply': 'Start hosting',
  'nav.admin': 'Admin',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',
  'theme.switchLabel': 'Switch theme mode',
  'theme.modeLabel': 'Theme mode',
  'command.openLabel': 'Open command palette',
  'command.title': 'Quick navigation',
  'command.placeholder': 'Find pages or recent searches',
  'command.group.navigation': 'Quick navigation',
  'command.group.account': 'Account',
  'command.group.host': 'Host',
  'command.group.admin': 'Admin',
  'command.group.search': 'Search',
  'command.group.recent': 'Recent searches',
  'command.group.quickstart': 'Quick start',
  'command.searchFor': 'Search',
  'command.quick.onboarding': 'Restart tutorial',
  'command.quick.demoLogin': 'Start with demo account',
  'command.quick.communityGuide': 'Community first post guide',
  'command.quick.helpGuide': '8-step getting started guide',
  'command.quick.policiesGuide': 'Open required policies',
  'command.empty': 'No matches found',
  'command.hints.navigate': 'Arrow up/down',
  'command.hints.select': 'Enter',
  'command.hints.close': 'Esc',
  'btn.login': 'Login',
  'btn.signup': 'Start free',
  'btn.clear': 'Clear all',
  'btn.dark': 'Dark mode',
  'btn.light': 'Light mode',
  'footer.tagline': 'Like good wine, good company deepens slowly.',
  'footer.navLabel': 'Legal and help',
  'footer.terms': 'Terms of Service',
  'footer.privacy': 'Privacy Policy',
  'footer.refund': 'Refund Policy',
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
