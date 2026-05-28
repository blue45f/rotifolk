import { Link, NavLink } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import { useLocale, useT } from '@features/i18n/i18n'
import { useAuthStore } from '@store/authStore'
import { useThemeStore } from '@store/themeStore'
import { api } from '@services/api'
import { getSocket } from '@features/live/socket'
import styles from './Header.module.css'

export function Header() {
  const user = useAuthStore((s) => s.user)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const t = useT()
  const [locale, setLocale] = useLocale()
  const qc = useQueryClient()
  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('notifications/unread-count'),
    enabled: !!user,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    const handler = () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    }
    socket.on('notification:new', handler)
    return () => { socket.off('notification:new', handler) }
  }, [user, qc])
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  const nextLocale = locale === 'ko' ? 'en' : 'ko'
  const langLabel = locale === 'ko' ? 'EN' : '한'
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label="Rotifolk 홈">
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.logo}>rotifolk</span>
        </Link>

        <nav className={styles.nav} aria-label="주요 메뉴">
          <NavLink to="/discover" className={({ isActive }) => (isActive ? styles.active : '')}>
            {t('nav.discover')}
          </NavLink>
          <NavLink to="/venues" className={({ isActive }) => (isActive ? styles.active : '')}>
            {t('nav.venues')}
          </NavLink>
          <NavLink to="/digest" className={({ isActive }) => (isActive ? styles.active : '')}>
            {t('nav.digest')}
          </NavLink>
          {user && (
            <NavLink to="/host" className={({ isActive }) => (isActive ? styles.active : '')}>
              {t('nav.host')}
            </NavLink>
          )}
        </nav>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.langBtn}
            onClick={() => setLocale(nextLocale)}
            aria-label={`Switch language to ${nextLocale.toUpperCase()}`}
            title={nextLocale.toUpperCase()}
          >
            {langLabel}
          </button>
          <button
            type="button"
            className={styles.themeBtn}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? t('btn.light') : t('btn.dark')}
            title={isDark ? t('btn.light') : t('btn.dark')}
          >
            {isDark ? '🌞' : '🌙'}
          </button>
          {user && (
            <Link to="/notifications" className={styles.bell} aria-label="알림">
              <span aria-hidden="true">🔔</span>
              {(unread?.count ?? 0) > 0 && (
                <span className={styles.bellDot} aria-hidden="true">
                  {unread!.count > 9 ? '9+' : unread!.count}
                </span>
              )}
            </Link>
          )}
          {user ? (
            <Link to="/me" aria-label="내 프로필">
              <Avatar size="sm" emoji={user.nickname[0]} hue="#7A1F3D" pattern="gradient" />
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  {t('btn.login')}
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" size="sm">
                  {t('btn.signup')}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
