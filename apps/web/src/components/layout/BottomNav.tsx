import { Icon, type IconName } from '@components/ui/Icon/Icon'
import { useAuthStore } from '@store/authStore'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'

import styles from './BottomNav.module.css'

import { chatKeys } from '@/domains/chat/queries'
import { api } from '@/infrastructure/api'

interface BottomNavProps {
  onOpenMenu: () => void
  menuOpen: boolean
}

type MobileDestination = {
  key: 'home' | 'discover' | 'quick'
  to: string
  label: string
  icon: IconName
  emphasize?: boolean
}

const PRIMARY_ITEMS: MobileDestination[] = [
  { key: 'home', to: '/', label: '홈', icon: 'home' },
  { key: 'discover', to: '/discover', label: '탐색', icon: 'compass' },
  { key: 'quick', to: '/quick', label: '즉석', icon: 'bolt', emphasize: true },
]

function destinationIsActive(pathname: string, key: MobileDestination['key']) {
  if (key === 'home') return pathname === '/'
  if (key === 'quick') return pathname === '/quick'
  return ['/discover', '/category', '/parties', '/venues', '/vibe'].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function BottomNav({ onOpenMenu, menuOpen }: BottomNavProps) {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const { data: chatUnread } = useQuery({
    queryKey: chatKeys.unread,
    queryFn: () => api.get<{ count: number; rooms: number }>('chat/unread-count'),
    enabled: !!user,
  })

  const currentPath = `${location.pathname}${location.search}${location.hash}` || '/'
  const accountDestination = user
    ? '/chats'
    : `/login?from=${encodeURIComponent(currentPath)}`
  const accountActive = user
    ? location.pathname === '/chats' || location.pathname.startsWith('/chats/')
    : location.pathname === '/login' || location.pathname === '/signup'
  const hasUnreadChat = !!user && (chatUnread?.rooms ?? 0) > 0

  return (
    <nav className={styles.nav} aria-label="하단 주요 메뉴">
      {PRIMARY_ITEMS.map((item) => {
        const active = destinationIsActive(location.pathname, item.key)
        return (
          <Link
            key={item.key}
            to={item.to}
            className={`${styles.item} ${active ? styles.active : ''} ${
              item.emphasize ? styles.emphasize : ''
            }`}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.iconWrap}>
              <span className={styles.icon} aria-hidden="true">
                <Icon name={item.icon} />
              </span>
            </span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        )
      })}

      <Link
        to={accountDestination}
        className={`${styles.item} ${accountActive ? styles.active : ''}`}
        aria-current={accountActive ? 'page' : undefined}
      >
        <span className={styles.iconWrap}>
          <span className={styles.icon} aria-hidden="true">
            <Icon name={user ? 'mail' : 'user'} />
          </span>
          {hasUnreadChat && (
            <span className={styles.badge} aria-label={`읽지 않은 메시지 ${chatUnread!.count}개`}>
              {chatUnread!.count > 9 ? '9+' : chatUnread!.count}
            </span>
          )}
        </span>
        <span className={styles.label}>{user ? '채팅' : '로그인'}</span>
      </Link>

      <button
        type="button"
        className={`${styles.item} ${menuOpen ? styles.active : ''}`}
        onClick={onOpenMenu}
        aria-label="전체 메뉴 열기"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
      >
        <span className={styles.iconWrap}>
          <span className={styles.icon} aria-hidden="true">
            <Icon name="settings" />
          </span>
        </span>
        <span className={styles.label}>메뉴</span>
      </button>
    </nav>
  )
}
