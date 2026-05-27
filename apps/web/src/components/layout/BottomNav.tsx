import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const items = [
  { to: '/', label: '홈', icon: '🏠', end: true },
  { to: '/neighborhood', label: '내 동네', icon: '📍' },
  { to: '/quick', label: '즉석', icon: '⚡', emphasize: true },
  { to: '/chats', label: '채팅', icon: '💌' },
  { to: '/me', label: '나', icon: '🌙' },
] as const

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="하단 메뉴">
      {items.map((it) => (
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
          <span className={styles.icon} aria-hidden="true">
            {it.icon}
          </span>
          <span>{it.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
