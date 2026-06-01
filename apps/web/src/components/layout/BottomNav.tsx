import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@store/authStore'
import { api } from '@services/api'
import { chatKeys } from '@features/chat/queries'
import styles from './BottomNav.module.css'

const BASE_ITEMS = [
  { to: '/', label: '홈', icon: '🏠', end: true, key: 'home' },
  { to: '/neighborhood', label: '내 동네', icon: '📍', key: 'hood' },
  { to: '/quick', label: '즉석', icon: '⚡', emphasize: true, key: 'quick' },
  { to: '/chats', label: '채팅', icon: '💌', key: 'chats' },
  { to: '/me', label: '나', icon: '🌙', key: 'me' },
] as const

const ADMIN_ITEM = { to: '/admin', label: '관리', icon: '🛡️', key: 'admin' } as const

export function BottomNav() {
  const me = useAuthStore((s) => s.user)
  const isAdmin = me?.role === 'admin'
  const { data: chatUnread } = useQuery({
    queryKey: chatKeys.unread,
    queryFn: () => api.get<{ count: number; rooms: number }>('chat/unread-count'),
    enabled: !!me,
  })
  const items = isAdmin ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS

  return (
    <nav className={styles.nav} aria-label="하단 메뉴">
      {items.map((it) => {
        const showBadge = it.key === 'chats' && (chatUnread?.rooms ?? 0) > 0
        return (
          <NavLink
            key={it.to}
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
                {it.icon}
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
