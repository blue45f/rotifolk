import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const items = [
  { to: '/', label: '홈', icon: '🏠', end: true },
  { to: '/discover', label: '탐색', icon: '🔭' },
  { to: '/host/create', label: '개설', icon: '✨', emphasize: true },
  { to: '/host', label: '호스트', icon: '🎙️' },
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
