import { Link, NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import { Icon, type IconName } from '@components/ui/Icon/Icon'
import { useLocale, useT } from '@features/i18n/useI18n'
import { useAuthStore } from '@store/authStore'
import { useThemeStore } from '@store/themeStore'
import { api } from '@services/api'
import { notificationKeys } from '@features/notifications/useNotificationsRealtime'
import styles from './Header.module.css'

interface HeaderProps {
  onOpenCommand?: () => void
  onOpenOnboarding?: () => void
}

type ThemeOption = {
  value: 'light' | 'dark' | 'system'
  labelKey: 'theme.light' | 'theme.dark' | 'theme.system'
  icon: IconName
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', labelKey: 'theme.light', icon: 'sun' },
  { value: 'dark', labelKey: 'theme.dark', icon: 'moon' },
  { value: 'system', labelKey: 'theme.system', icon: 'monitor' },
]

export function Header({ onOpenCommand, onOpenOnboarding }: HeaderProps) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const t = useT()
  const [locale, setLocale] = useLocale()
  const location = useLocation()
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const themeMenuRef = useRef<HTMLDivElement>(null)
  const themeButtonRef = useRef<HTMLButtonElement>(null)
  const { data: unread } = useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => api.get<{ count: number }>('notifications/unread-count'),
    enabled: !!user,
    staleTime: 60_000,
  })

  const themeModeLabel =
    theme === 'light' ? t('theme.light') : theme === 'dark' ? t('theme.dark') : t('theme.system')
  const nextLocale = locale === 'ko' ? 'en' : 'ko'
  const langLabel = locale === 'ko' ? 'EN' : '한'
  const currentPath = `${location.pathname}${location.search}${location.hash}`
  const encodedCurrentPath = encodeURIComponent(currentPath || '/')
  const demoLoginHref = `/login?demo=1&auto=1&from=${encodeURIComponent(currentPath || '/')}`

  useEffect(() => {
    if (!themeMenuOpen) return
    const onDocDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!themeMenuRef.current?.contains(target) && !themeButtonRef.current?.contains(target)) {
        setThemeMenuOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setThemeMenuOpen(false)
        themeButtonRef.current?.focus()
      }
    }
    window.addEventListener('mousedown', onDocDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onDocDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [themeMenuOpen])

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
          <NavLink
            to={`/community?from=${encodedCurrentPath}`}
            className={({ isActive }) => (isActive ? styles.active : '')}
          >
            {t('nav.community')}
          </NavLink>
          <NavLink to="/clubs" className={({ isActive }) => (isActive ? styles.active : '')}>
            {t('nav.clubs')}
          </NavLink>
          <NavLink to="/digest" className={({ isActive }) => (isActive ? styles.active : '')}>
            {t('nav.digest')}
          </NavLink>
          <NavLink
            to={`/help?from=${encodedCurrentPath}`}
            className={({ isActive }) => (isActive ? styles.active : '')}
          >
            {t('nav.help')}
          </NavLink>
          <NavLink
            to={`/tutorial?from=${encodedCurrentPath}`}
            className={({ isActive }) => (isActive ? styles.active : '')}
          >
            {t('nav.tutorial')}
          </NavLink>
          <NavLink
            to={`/policies?from=${encodedCurrentPath}`}
            className={({ isActive }) => (isActive ? styles.active : '')}
          >
            {t('nav.policies')}
          </NavLink>
          {user && (
            <NavLink to="/host" className={({ isActive }) => (isActive ? styles.active : '')}>
              {t('nav.host')}
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? styles.active : '')}>
              관리자
            </NavLink>
          )}
        </nav>

        <div className={styles.actions}>
          {onOpenCommand && onOpenOnboarding && (
            <button
              type="button"
              className={styles.commandBtn}
              onClick={() => onOpenOnboarding()}
              aria-label={t('command.quick.onboarding')}
              title={t('command.quick.onboarding')}
            >
              <Icon name="compass" />
              <span className={styles.commandBtnHint}>튜토리얼</span>
            </button>
          )}
          {!user && (
            <Link to={demoLoginHref} className={styles.commandBtn} aria-label="데모 계정 빠른 시작">
              <Icon name="sparkle" aria-hidden />
              <span className={styles.commandBtnHint}>데모</span>
            </Link>
          )}
          <button
            type="button"
            className={styles.langBtn}
            onClick={() => setLocale(nextLocale)}
            aria-label={`Switch language to ${nextLocale.toUpperCase()}`}
            title={nextLocale.toUpperCase()}
          >
            {langLabel}
          </button>
          {onOpenCommand && (
            <button
              type="button"
              className={styles.commandBtn}
              onClick={() => onOpenCommand()}
              aria-label={`${t('command.openLabel')} (⌘K / /)`}
              title={`${t('command.openLabel')} (⌘K / /)`}
            >
              <span aria-hidden="true">⌘K</span>
              <span className={styles.commandBtnHint} aria-hidden="true">
                /
              </span>
            </button>
          )}
          <div className={styles.themeWrap}>
            <button
              ref={themeButtonRef}
              type="button"
              className={styles.themeBtn}
              onClick={() => setThemeMenuOpen((prev) => !prev)}
              aria-label={t('theme.switchLabel')}
              aria-expanded={themeMenuOpen}
              aria-haspopup="menu"
            >
              <Icon name={theme === 'light' ? 'sun' : theme === 'dark' ? 'moon' : 'monitor'} />
            </button>
            <span className={styles.themeModeText}>{themeModeLabel}</span>
            {themeMenuOpen && (
              <div
                ref={themeMenuRef}
                className={styles.themeMenu}
                role="menu"
                aria-label={t('theme.modeLabel')}
              >
                {THEME_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={theme === item.value}
                    className={styles.themeOption}
                    onClick={() => {
                      setTheme(item.value)
                      setThemeMenuOpen(false)
                    }}
                  >
                    <Icon name={item.icon} aria-hidden />
                    <span>{t(item.labelKey)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {user && (
            <Link to="/notifications" className={styles.bell} aria-label="알림">
              <Icon name="bell" aria-hidden />
              {(unread?.count ?? 0) > 0 && (
                <span className={styles.bellDot} aria-hidden="true">
                  {unread!.count > 9 ? '9+' : unread!.count}
                </span>
              )}
            </Link>
          )}
          {user ? (
            <Link to="/me" aria-label="내 프로필">
              <Avatar
                size="sm"
                emoji={user.nickname[0]}
                hue="var(--color-primary)"
                pattern="gradient"
                imageSrc={user.avatarImage ?? null}
              />
            </Link>
          ) : (
            <>
              <Link to={`/login?from=${encodedCurrentPath}`}>
                <Button variant="ghost" size="sm">
                  {t('btn.login')}
                </Button>
              </Link>
              <Link to={`/signup?from=${encodedCurrentPath}`}>
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
