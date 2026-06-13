import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@store/authStore'
import { api } from '@services/api'
import { chatKeys } from '@features/chat/queries'
import { Icon, type IconName } from '@components/ui/Icon/Icon'
import styles from './BottomNav.module.css'

const BASE_ITEMS = [
  { to: '/', label: '홈', icon: 'home', end: true, key: 'home' },
  { to: '/tutorial', label: '튜토리얼', icon: 'compass', key: 'tutorial' },
  { to: '/community', label: '커뮤니티', icon: 'chat', key: 'community' },
  { to: '/quick', label: '즉석', icon: 'bolt', emphasize: true, key: 'quick' },
  { to: '/chats', label: '채팅', icon: 'mail', key: 'chats' },
  { to: '/me', label: '나', icon: 'user', key: 'me' },
] as const satisfies readonly {
  to: string
  label: string
  icon: IconName
  key: string
  end?: boolean
  emphasize?: boolean
}[]

const ADMIN_ITEM = { to: '/admin', label: '관리', icon: 'shield', key: 'admin' } as const

export function BottomNav() {
  const location = useLocation()
  const me = useAuthStore((s) => s.user)
  const isAdmin = me?.role === 'admin'
  const { data: chatUnread } = useQuery({
    queryKey: chatKeys.unread,
    queryFn: () => api.get<{ count: number; rooms: number }>('chat/unread-count'),
    enabled: !!me,
  })
  const items = isAdmin ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS
  const encodedCurrentPath = encodeURIComponent(
    `${location.pathname}${location.search}${location.hash}` || '/',
  )
  const itemsWithReturn = items.map((it) => {
    if (it.to === '/tutorial' || it.to === '/community') {
      return { ...it, to: `${it.to}?from=${encodedCurrentPath}` }
    }
    return it
  })

  return (
    <nav className={styles.nav} aria-label="하단 메뉴">
      {itemsWithReturn.map((it) => {
        const showBadge = it.key === 'chats' && (chatUnread?.rooms ?? 0) > 0
        return (
          <NavLink
            key={it.key}
            to={it.to}
            end={'end' in it ? it.end : false}
            className={({ isActive }) =>
              `${styles.item} ${isActive ? styles.active : ''} ${
                'emphasize' in it && it.emphasize ? styles.emphasize : ''
              }`
            }
          >
            <span className={styles.iconWrap}>
              <span className={styles.icon} aria-hidden="true">
                <Icon name={it.icon} />
              </span>
              {showBadge && (
                <span
                  className={styles.badge}
                  aria-label={`읽지 않은 메시지 ${chatUnread!.count}개`}
                >
                  {chatUnread!.count > 9 ? '9+' : chatUnread!.count}
                </span>
              )}
            </span>
            <span>{it.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
