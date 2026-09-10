import type { IconName } from '@components/ui/Icon/Icon'

export type NavigationRole = 'admin' | 'host' | 'participant' | null

export interface GlobalNavigationItem {
  key: string
  to: string
  label: string
  description: string
  icon: IconName
  activePrefixes?: string[]
}

export interface GlobalNavigationSection {
  key: string
  label: string
  description: string
  items: GlobalNavigationItem[]
}

const START_SECTION: GlobalNavigationSection = {
  key: 'start',
  label: '바로 시작',
  description: '지금 필요한 행동으로 곧장 이동합니다.',
  items: [
    {
      key: 'discover',
      to: '/discover',
      label: '파티 둘러보기',
      description: '날짜·지역·가격으로 모임 찾기',
      icon: 'compass',
      activePrefixes: ['/discover', '/category', '/parties'],
    },
    {
      key: 'search',
      to: '/search',
      label: '통합 검색',
      description: '파티와 키워드를 한 번에 검색',
      icon: 'search',
    },
    {
      key: 'quick',
      to: '/quick',
      label: '즉석 모임',
      description: '세 번의 선택으로 빠르게 개설',
      icon: 'bolt',
    },
  ],
}

const EXPLORE_SECTION: GlobalNavigationSection = {
  key: 'explore',
  label: '취향 넓히기',
  description: '모임·사람·장소를 다양한 관점으로 발견합니다.',
  items: [
    {
      key: 'clubs',
      to: '/clubs',
      label: '클럽',
      description: '꾸준히 만나는 취향 모임',
      icon: 'sparkle',
    },
    {
      key: 'community',
      to: '/community',
      label: '커뮤니티',
      description: '질문과 후기로 먼저 분위기 보기',
      icon: 'chat',
    },
    {
      key: 'vibe',
      to: '/vibe',
      label: '분위기로 찾기',
      description: '오늘 원하는 무드에서 시작',
      icon: 'moon',
    },
    {
      key: 'neighborhood',
      to: '/neighborhood',
      label: '내 동네',
      description: '가까운 곳의 새로운 라운드',
      icon: 'pin',
    },
    {
      key: 'venues',
      to: '/venues',
      label: '장소',
      description: '검증된 라운지·바·카페 탐색',
      icon: 'pin',
    },
    {
      key: 'digest',
      to: '/digest',
      label: '주간 다이제스트',
      description: '놓치기 아쉬운 소식 모아보기',
      icon: 'archive',
    },
  ],
}

const ACCOUNT_SECTION: GlobalNavigationSection = {
  key: 'account',
  label: '내 활동',
  description: '참여 기록과 관계, 저장한 내용을 관리합니다.',
  items: [
    {
      key: 'profile',
      to: '/me',
      label: '내 프로필',
      description: '프로필과 참여 현황 확인',
      icon: 'user',
      activePrefixes: ['/me/profile-studio'],
    },
    {
      key: 'chats',
      to: '/chats',
      label: '채팅',
      description: '매칭된 사람과 이어서 대화',
      icon: 'mail',
    },
    {
      key: 'notifications',
      to: '/notifications',
      label: '알림',
      description: '참여·매칭·운영 소식 확인',
      icon: 'bell',
    },
    {
      key: 'calendar',
      to: '/calendar',
      label: '캘린더',
      description: '예정된 모임을 일정으로 확인',
      icon: 'clock',
    },
    {
      key: 'saved',
      to: '/me/saved',
      label: '저장한 모임',
      description: '관심 있는 라운드 다시 보기',
      icon: 'bookmark',
    },
    {
      key: 'cards',
      to: '/me/cards',
      label: '매치 카드',
      description: '교환한 카드와 인연 모아보기',
      icon: 'sparkle',
    },
    {
      key: 'follows',
      to: '/me/follows',
      label: '팔로우',
      description: '관심 있는 호스트와 사람',
      icon: 'user',
    },
    {
      key: 'notes',
      to: '/me/notes',
      label: '받은 노트',
      description: '모임 뒤 도착한 메시지 확인',
      icon: 'mail',
    },
    {
      key: 'payments',
      to: '/me/payments',
      label: '결제 내역',
      description: '참가비와 환불 상태 확인',
      icon: 'archive',
    },
  ],
}

const PARTICIPANT_HOST_SECTION: GlobalNavigationSection = {
  key: 'host',
  label: '호스트 시작',
  description: '내 취향의 모임을 직접 열어봅니다.',
  items: [
    {
      key: 'become-host',
      to: '/become-host',
      label: '호스트 지원',
      description: '운영 방식과 자격을 확인하고 시작',
      icon: 'shield',
    },
  ],
}

const HOST_SECTION: GlobalNavigationSection = {
  key: 'host',
  label: '호스트 도구',
  description: '파티 개설부터 현장 운영까지 한곳에서 관리합니다.',
  items: [
    {
      key: 'host-console',
      to: '/host',
      label: '호스트 콘솔',
      description: '다가오는 파티와 운영 상태 확인',
      icon: 'shield',
    },
    {
      key: 'host-create',
      to: '/host/create',
      label: '새 파티 만들기',
      description: '정식 로테이션 파티 개설',
      icon: 'plus',
    },
    {
      key: 'host-sourcing',
      to: '/host/sourcing',
      label: '게스트 모집',
      description: '초대와 모집 채널 관리',
      icon: 'search',
    },
    {
      key: 'host-space',
      to: '/host/space',
      label: '공간 호스팅',
      description: '보유 공간을 모임 장소로 운영',
      icon: 'pin',
    },
  ],
}

const ADMIN_SECTION: GlobalNavigationSection = {
  key: 'admin',
  label: '운영 관리',
  description: '서비스 상태와 신고·운영 항목을 관리합니다.',
  items: [
    {
      key: 'admin-dashboard',
      to: '/admin',
      label: '관리자 대시보드',
      description: '핵심 운영 지표와 상태 확인',
      icon: 'shield',
    },
    {
      key: 'admin-moderation',
      to: '/admin/moderation',
      label: '신고·검토',
      description: '안전 관련 신고와 조치 관리',
      icon: 'shield',
    },
  ],
}

const HELP_SECTION: GlobalNavigationSection = {
  key: 'help',
  label: '도움과 안전',
  description: '처음부터 다시 보거나 문제가 생겼을 때 이용합니다.',
  items: [
    {
      key: 'tutorial',
      to: '/tutorial',
      label: '튜토리얼',
      description: '핵심 사용 흐름을 단계별로 익히기',
      icon: 'compass',
    },
    {
      key: 'help-center',
      to: '/help',
      label: '이용 가이드',
      description: '참여자·호스트별 도움말',
      icon: 'sparkle',
    },
    {
      key: 'support',
      to: '/support',
      label: '고객 지원',
      description: '문의와 문제 해결 요청',
      icon: 'chat',
    },
    {
      key: 'policies',
      to: '/policies',
      label: '정책과 안전',
      description: '취소·개인정보·안전 정책 확인',
      icon: 'archive',
    },
  ],
}

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
  const prefixes = [item.to, ...(item.activePrefixes ?? [])]
  return prefixes.some((prefix) => {
    if (prefix === '/') return pathname === '/'
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  })
}
