import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import { Icon } from '@components/ui/Icon/Icon'
import { Tooltip } from '@components/ui/Tooltip/Tooltip'
import { useAuthStore } from '@store/authStore'
import { useQuery } from '@tanstack/react-query'
import { Link, NavLink, useLocation } from 'react-router-dom'

import styles from './Header.module.css'

import { WhatsNew } from '@/domains/deskcloud/WhatsNew'
import { useT } from '@/domains/i18n/useI18n'
import { notificationKeys } from '@/domains/notifications/useNotificationsRealtime'
import { api } from '@/infrastructure/api'

interface HeaderProps {
  onOpenCommand?: () => void
  onOpenMenu?: () => void
  menuOpen?: boolean
}

export function Header({ onOpenCommand, onOpenMenu, menuOpen = false }: HeaderProps) {
  const user = useAuthStore((state) => state.user)
  const t = useT()
  const location = useLocation()
  const { data: unread } = useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => api.get<{ count: number }>('notifications/unread-count'),
    enabled: !!user,
    staleTime: 60_000,
  })

  const currentPath = `${location.pathname}${location.search}${location.hash}` || '/'
  const encodedCurrentPath = encodeURIComponent(currentPath)

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label="Rotifolk 홈">
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.logo}>rotifolk</span>
          <span className={styles.betaBadge}>BETA</span>
        </Link>

        <nav className={styles.nav} aria-label="주요 메뉴">
          <NavLink to="/discover" className={({ isActive }) => (isActive ? styles.active : '')}>
            {t('nav.discover')}
          </NavLink>
          <NavLink to="/clubs" className={({ isActive }) => (isActive ? styles.active : '')}>
            클럽
          </NavLink>
          <NavLink to="/community" className={({ isActive }) => (isActive ? styles.active : '')}>
            커뮤니티
          </NavLink>
          <NavLink to="/quick" className={({ isActive }) => (isActive ? styles.active : '')}>
            {t('nav.quick')}
          </NavLink>
          <NavLink to="/host" className={({ isActive }) => (isActive ? styles.active : '')}>
            {t('nav.hosting')}
          </NavLink>
        </nav>

        <div className={styles.actions}>
          <Tooltip label="검색과 빠른 이동 (⌘K / /)">
            {onOpenCommand ? (
              <button
                type="button"
                className={`${styles.utilityButton} ${styles.searchButton}`}
                onClick={onOpenCommand}
                aria-label="검색과 빠른 이동 열기 (⌘K 또는 /)"
              >
                <Icon name="search" aria-hidden="true" />
                <span className={styles.actionText}>검색</span>
                <kbd className={styles.shortcut}>⌘K</kbd>
              </button>
            ) : (
              <Link
                to="/search"
                className={`${styles.utilityButton} ${styles.searchButton}`}
                aria-label="파티 검색"
              >
                <Icon name="search" aria-hidden="true" />
                <span className={styles.actionText}>검색</span>
              </Link>
            )}
          </Tooltip>

          <div className={styles.whatsNew}>
            <WhatsNew />
          </div>

          {user && (
            <Tooltip label="알림">
              <Link to="/notifications" className={styles.bell} aria-label="알림">
                <Icon name="bell" aria-hidden="true" />
                {(unread?.count ?? 0) > 0 && (
                  <span className={styles.bellDot} aria-hidden="true">
                    {unread!.count > 9 ? '9+' : unread!.count}
                  </span>
                )}
              </Link>
            </Tooltip>
          )}

          {onOpenMenu && (
            <Tooltip label="전체 메뉴와 설정">
              <button
                type="button"
                className={styles.utilityButton}
                onClick={onOpenMenu}
                aria-label="전체 메뉴와 설정 열기"
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
              >
                <Icon name="settings" aria-hidden="true" />
                <span className={styles.actionText}>메뉴</span>
              </button>
            </Tooltip>
          )}

          {user ? (
            <Link to="/me" className={styles.avatarLink} aria-label="내 프로필">
              <Avatar
                size="sm"
                emoji={user.nickname[0]}
                hue="var(--color-primary)"
                pattern="gradient"
                imageSrc={user.avatarImage ?? null}
              />
            </Link>
          ) : (
            <div className={styles.authActions}>
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
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
