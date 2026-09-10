import type { IconName } from '@components/ui/Icon/Icon'

export type NavigationRole = 'admin' | 'host' | 'participant' | null

export interface GlobalNavigationItem {
  key: string
  to: string
  label: string
  description: string
  icon: IconName
  activePrefixes?: string[]
  exact?: boolean
}

export interface GlobalNavigationSection {
  key: string
  label: string
  description: string
  items: GlobalNavigationItem[]
}

type NavigationItemOptions = Pick<GlobalNavigationItem, 'activePrefixes' | 'exact'>

function createItem(
  key: string,
  to: string,
  label: string,
  description: string,
  icon: IconName,
  options: NavigationItemOptions = {}
): GlobalNavigationItem {
  return { key, to, label, description, icon, ...options }
}

function createSection(
  key: string,
  label: string,
  description: string,
  items: GlobalNavigationItem[]
): GlobalNavigationSection {
  return { key, label, description, items }
}

const START_SECTION = createSection('start', '바로 시작', '지금 필요한 행동으로 곧장 이동합니다.', [
  createItem(
    'discover',
    '/discover',
    '파티 둘러보기',
    '날짜·지역·가격으로 모임 찾기',
    'compass',
    { activePrefixes: ['/discover', '/category', '/parties'] }
  ),
  createItem('search', '/search', '통합 검색', '파티와 키워드를 한 번에 검색', 'search'),
  createItem('quick', '/quick', '즉석 모임', '세 번의 선택으로 빠르게 개설', 'bolt'),
])

const EXPLORE_SECTION = createSection(
  'explore',
  '취향 넓히기',
  '모임·사람·장소를 다양한 관점으로 발견합니다.',
  [
    createItem('clubs', '/clubs', '클럽', '꾸준히 만나는 취향 모임', 'sparkle'),
    createItem('community', '/community', '커뮤니티', '질문과 후기로 먼저 분위기 보기', 'chat'),
    createItem('vibe', '/vibe', '분위기로 찾기', '오늘 원하는 무드에서 시작', 'moon'),
    createItem('neighborhood', '/neighborhood', '내 동네', '가까운 곳의 새로운 라운드', 'pin'),
    createItem('venues', '/venues', '장소', '검증된 라운지·바·카페 탐색', 'pin'),
    createItem('digest', '/digest', '주간 다이제스트', '놓치기 아쉬운 소식 모아보기', 'archive'),
  ]
)

const ACCOUNT_SECTION = createSection(
  'account',
  '내 활동',
  '참여 기록과 관계, 저장한 내용을 관리합니다.',
  [
    createItem('profile', '/me', '내 프로필', '프로필과 참여 현황 확인', 'user', {
      activePrefixes: ['/me/profile-studio'],
      exact: true,
    }),
    createItem('chats', '/chats', '채팅', '매칭된 사람과 이어서 대화', 'mail'),
    createItem('notifications', '/notifications', '알림', '참여·매칭·운영 소식 확인', 'bell'),
    createItem('calendar', '/calendar', '캘린더', '예정된 모임을 일정으로 확인', 'clock'),
    createItem('saved', '/me/saved', '저장한 모임', '관심 있는 라운드 다시 보기', 'bookmark'),
    createItem('cards', '/me/cards', '매치 카드', '교환한 카드와 인연 모아보기', 'sparkle'),
    createItem('follows', '/me/follows', '팔로우', '관심 있는 호스트와 사람', 'user'),
    createItem('notes', '/me/notes', '받은 노트', '모임 뒤 도착한 메시지 확인', 'mail'),
    createItem('payments', '/me/payments', '결제 내역', '참가비와 환불 상태 확인', 'archive'),
  ]
)

const PARTICIPANT_HOST_SECTION = createSection(
  'host',
  '호스트 시작',
  '내 취향의 모임을 직접 열어봅니다.',
  [
    createItem(
      'become-host',
      '/become-host',
      '호스트 지원',
      '운영 방식과 자격을 확인하고 시작',
      'shield'
    ),
  ]
)

const HOST_SECTION = createSection(
  'host',
  '호스트 도구',
  '파티 개설부터 현장 운영까지 한곳에서 관리합니다.',
  [
    createItem('host-console', '/host', '호스트 콘솔', '다가오는 파티와 운영 상태 확인', 'shield', {
      exact: true,
    }),
    createItem('host-create', '/host/create', '새 파티 만들기', '정식 로테이션 파티 개설', 'plus'),
    createItem('host-sourcing', '/host/sourcing', '게스트 모집', '초대와 모집 채널 관리', 'search'),
    createItem('host-space', '/host/space', '공간 호스팅', '보유 공간을 모임 장소로 운영', 'pin'),
  ]
)

const ADMIN_SECTION = createSection(
  'admin',
  '운영 관리',
  '서비스 상태와 신고·운영 항목을 관리합니다.',
  [
    createItem('admin-dashboard', '/admin', '관리자 대시보드', '핵심 운영 지표와 상태 확인', 'shield', {
      exact: true,
    }),
    createItem(
      'admin-moderation',
      '/admin/moderation',
      '신고·검토',
      '안전 관련 신고와 조치 관리',
      'shield'
    ),
  ]
)

const HELP_SECTION = createSection(
  'help',
  '도움과 안전',
  '처음부터 다시 보거나 문제가 생겼을 때 이용합니다.',
  [
    createItem('tutorial', '/tutorial', '튜토리얼', '핵심 사용 흐름을 단계별로 익히기', 'compass'),
    createItem('help-center', '/help', '이용 가이드', '참여자·호스트별 도움말', 'sparkle'),
    createItem('support', '/support', '고객 지원', '문의와 문제 해결 요청', 'chat'),
    createItem('policies', '/policies', '정책과 안전', '취소·개인정보·안전 정책 확인', 'archive'),
  ]
)

export function buildGlobalNavigation(role: NavigationRole): GlobalNavigationSection[] {
  const sections = [START_SECTION, EXPLORE_SECTION]

  if (role) sections.push(ACCOUNT_SECTION)
  if (role === 'participant') sections.push(PARTICIPANT_HOST_SECTION)
  if (role === 'host' || role === 'admin') sections.push(HOST_SECTION)
  if (role === 'admin') sections.push(ADMIN_SECTION)

  sections.push(HELP_SECTION)
  return sections
}

export function isNavigationItemActive(pathname: string, item: GlobalNavigationItem): boolean {
  if (pathname === item.to) return true
  if (!item.exact && item.to !== '/' && pathname.startsWith(`${item.to}/`)) return true

  return (item.activePrefixes ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
