import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import { Icon, type IconName } from '@components/ui/Icon/Icon'
import { Tooltip } from '@components/ui/Tooltip/Tooltip'
import { useLocale, useT } from '@domains/i18n/useI18n'
import { notificationKeys } from '@domains/notifications/useNotificationsRealtime'
import { api } from '@infrastructure/api'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAuthStore } from '@store/authStore'
import { useThemeStore } from '@store/themeStore'
import { useQuery } from '@tanstack/react-query'
import { Link, NavLink, useLocation } from 'react-router-dom'

import styles from './Header.module.css'

interface HeaderProps {
  onOpenCommand?: () => void
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

export function Header({ onOpenCommand }: HeaderProps) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const t = useT()
  const [locale, setLocale] = useLocale()
  const location = useLocation()
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
          <NavLink to="/quick" className={({ isActive }) => (isActive ? styles.active : '')}>
            {t('nav.quick')}
          </NavLink>
          <NavLink to="/host" className={({ isActive }) => (isActive ? styles.active : '')}>
            {t('nav.hosting')}
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? styles.active : '')}>
              관리자
            </NavLink>
          )}
        </nav>

        <div className={styles.actions}>
          {!user && (
            <Link to={demoLoginHref} className={styles.commandBtn} aria-label="데모 계정 빠른 시작">
              <Icon name="sparkle" aria-hidden />
              <span className={styles.commandBtnHint}>데모</span>
            </Link>
          )}
          <Tooltip label={`Switch language to ${nextLocale.toUpperCase()}`}>
            <button
              type="button"
              className={styles.langBtn}
              onClick={() => setLocale(nextLocale)}
              aria-label={`Switch language to ${nextLocale.toUpperCase()}`}
            >
              {langLabel}
            </button>
          </Tooltip>
          {onOpenCommand && (
            <Tooltip label={`${t('command.openLabel')} (⌘K / /)`}>
              <button
                type="button"
                className={styles.commandBtn}
                onClick={() => onOpenCommand()}
                aria-label={`${t('command.openLabel')} (⌘K / /)`}
              >
                <span aria-hidden="true">⌘K</span>
                <span className={styles.commandBtnHint} aria-hidden="true">
                  /
                </span>
              </button>
            </Tooltip>
          )}
          <div className={styles.themeWrap}>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className={styles.themeBtn}
                  aria-label={t('theme.switchLabel')}
                >
                  <Icon name={theme === 'light' ? 'sun' : theme === 'dark' ? 'moon' : 'monitor'} />
                </button>
              </DropdownMenu.Trigger>
              <span className={styles.themeModeText}>{themeModeLabel}</span>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className={styles.themeMenu}
                  align="end"
                  sideOffset={8}
                  aria-label={t('theme.modeLabel')}
                >
                  <DropdownMenu.RadioGroup
                    value={theme}
                    onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                  >
                    {THEME_OPTIONS.map((item) => (
                      <DropdownMenu.RadioItem
                        key={item.value}
                        value={item.value}
                        className={styles.themeOption}
                      >
                        <Icon name={item.icon} aria-hidden />
                        <span>{t(item.labelKey)}</span>
                      </DropdownMenu.RadioItem>
                    ))}
                  </DropdownMenu.RadioGroup>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
          {user && (
            <Tooltip label="알림">
              <Link to="/notifications" className={styles.bell} aria-label="알림">
                <Icon name="bell" aria-hidden />
                {(unread?.count ?? 0) > 0 && (
                  <span className={styles.bellDot} aria-hidden="true">
                    {unread!.count > 9 ? '9+' : unread!.count}
                  </span>
                )}
              </Link>
            </Tooltip>
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
