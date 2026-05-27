import { Link, NavLink } from 'react-router-dom'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import { useAuthStore } from '@store/authStore'
import { useThemeStore } from '@store/themeStore'
import styles from './Header.module.css'

export function Header() {
  const user = useAuthStore((s) => s.user)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label="Rotifolk 홈">
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.logo}>rotifolk</span>
        </Link>

        <nav className={styles.nav} aria-label="주요 메뉴">
          <NavLink to="/discover" className={({ isActive }) => (isActive ? styles.active : '')}>
            파티 탐색
          </NavLink>
          <NavLink to="/venues" className={({ isActive }) => (isActive ? styles.active : '')}>
            장소
          </NavLink>
          <NavLink to="/digest" className={({ isActive }) => (isActive ? styles.active : '')}>
            다이제스트
          </NavLink>
          {user && (
            <NavLink to="/host" className={({ isActive }) => (isActive ? styles.active : '')}>
              호스트 콘솔
            </NavLink>
          )}
        </nav>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.themeBtn}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? '라이트 모드로' : '다크 모드로'}
            title={isDark ? '라이트 모드' : '다크 모드'}
          >
            {isDark ? '🌞' : '🌙'}
          </button>
          {user ? (
            <Link to="/me" aria-label="내 프로필">
              <Avatar size="sm" emoji={user.nickname[0]} hue="#7A1F3D" pattern="gradient" />
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  로그인
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" size="sm">
                  무료 시작
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
