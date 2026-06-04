import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const BRAND = 'Rotifolk'
const DEFAULT_TITLE = 'Rotifolk · 로테이션 파티 매칭'

// 라우트 첫 세그먼트 → 탭/스크린리더용 한국어 제목. 파라미터(:partyId 등)는
// 세그먼트 매칭으로 흡수되므로 라우트 추가 시 첫 세그먼트만 등록하면 된다.
const SEGMENT_TITLES: Record<string, string> = {
  discover: '둘러보기',
  category: '카테고리',
  vibe: '분위기',
  community: '커뮤니티',
  neighborhood: '동네',
  quick: '빠른 개설',
  parties: '파티',
  venues: '공간',
  help: '도움말',
  policies: '약관·정책',
  hosts: '호스트',
  'match-card': '매치 카드',
  me: '마이',
  login: '로그인',
  signup: '회원가입',
  host: '호스팅',
  sourcing: '소싱',
  live: '라이브 라운드',
  chats: '채팅',
  notifications: '알림',
  search: '검색',
  invite: '초대',
  digest: '다이제스트',
  'become-host': '호스트 되기',
  calendar: '캘린더',
  admin: '관리자',
}

/**
 * 라우트 전환마다 document.title 을 동기화한다(탭 식별·스크린리더 맥락·SEO).
 * 형제 앱(resume/offhours/PromptMarket 등)이 모두 갖춘 표준인데 rotifolk만 누락이었다.
 * RootLayout 에서 한 번 호출한다.
 */
export function useDocumentTitle(): void {
  const { pathname } = useLocation()

  useEffect(() => {
    const segment = pathname.split('/').filter(Boolean)[0]
    const label = segment ? SEGMENT_TITLES[segment] : undefined
    document.title = label ? `${label} · ${BRAND}` : DEFAULT_TITLE
  }, [pathname])
}
