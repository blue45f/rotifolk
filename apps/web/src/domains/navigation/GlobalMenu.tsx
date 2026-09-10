import { Icon, type IconName } from '@components/ui/Icon/Icon'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { useAuthStore } from '@store/authStore'
import { useThemeStore, type Theme } from '@store/themeStore'
import { Link, useLocation } from 'react-router-dom'

import styles from './GlobalMenu.module.css'
import {
  buildGlobalNavigation,
  isNavigationItemActive,
  type GlobalNavigationItem,
} from './navigationModel'

import { useLocale } from '@/domains/i18n/useI18n'

interface GlobalMenuProps {
  open: boolean
  onClose: () => void
}

const THEME_OPTIONS = [
  { value: 'light', label: '라이트', icon: 'sun' },
  { value: 'dark', label: '다크', icon: 'moon' },
  { value: 'system', label: '시스템', icon: 'monitor' },
] as const satisfies ReadonlyArray<{ value: Theme; label: string; icon: IconName }>

function destinationWithReturnPath(item: GlobalNavigationItem, from: string) {
  if (!['/community', '/help', '/tutorial', '/policies'].includes(item.to)) return item.to
  return `${item.to}?from=${from}`
}

export function GlobalMenu({ open, onClose }: GlobalMenuProps) {
  const user = useAuthStore((state) => state.user)
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const [locale, setLocale] = useLocale()
  const location = useLocation()
  const currentPath = `${location.pathname}${location.search}${location.hash}` || '/'
  const encodedCurrentPath = encodeURIComponent(currentPath)
  const sections = buildGlobalNavigation(user?.role ?? null)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="전체 메뉴"
      description="지금 할 일과 Rotifolk의 모든 기능을 한곳에서 찾을 수 있어요."
      size="lg"
    >
      <div className={styles.content}>
        {user ? (
          <Link to="/me" className={styles.profileCard} onClick={onClose}>
            <span className={styles.avatar} aria-hidden="true">
              {user.nickname.slice(0, 1)}
            </span>
            <span className={styles.profileCopy}>
              <strong>{user.nickname}님</strong>
              <small>내 프로필과 참여 현황 보기</small>
            </span>
            <Icon name="chevron-right" className={styles.profileArrow} aria-hidden="true" />
          </Link>
        ) : (
          <section className={styles.guestCard} aria-labelledby="guest-menu-title">
            <div>
              <span className={styles.eyebrow}>처음 오셨나요?</span>
              <h2 id="guest-menu-title">둘러본 흐름 그대로 이어서 시작하세요.</h2>
              <p>데모로 먼저 체험하거나, 가입 후 모임을 저장하고 참여할 수 있어요.</p>
            </div>
            <div className={styles.guestActions}>
              <Link
                to={`/signup?from=${encodedCurrentPath}`}
                className={styles.primaryAction}
                onClick={onClose}
              >
                가입하고 시작
              </Link>
              <Link
                to={`/login?from=${encodedCurrentPath}`}
                className={styles.secondaryAction}
                onClick={onClose}
              >
                로그인
              </Link>
              <Link
                to={`/login?demo=1&auto=1&from=${encodedCurrentPath}`}
                className={styles.demoAction}
                onClick={onClose}
              >
                데모 체험
              </Link>
            </div>
          </section>
        )}

        <nav className={styles.navigation} aria-label="전체 기능">
          {sections.map((section) => (
            <section key={section.key} className={styles.section}>
              <header className={styles.sectionHeader}>
                <h2>{section.label}</h2>
                <p>{section.description}</p>
              </header>
              <div className={styles.linkGrid}>
                {section.items.map((item) => {
                  const active = isNavigationItemActive(location.pathname, item)
                  const destination = destinationWithReturnPath(item, encodedCurrentPath)

                  return (
                    <Link
                      key={item.key}
                      to={destination}
                      className={`${styles.menuItem} ${active ? styles.menuItemActive : ''}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={onClose}
                    >
                      <span className={styles.itemIcon} aria-hidden="true">
                        <Icon name={item.icon} />
                      </span>
                      <span className={styles.itemCopy}>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                      {active ? (
                        <span className={styles.currentLabel}>현재</span>
                      ) : (
                        <Icon name="chevron-right" className={styles.itemArrow} aria-hidden="true" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </nav>

        <section className={styles.preferences} aria-labelledby="preferences-title">
          <header className={styles.sectionHeader}>
            <h2 id="preferences-title">빠른 설정</h2>
            <p>화면 분위기와 언어를 바로 바꿀 수 있어요.</p>
          </header>
          <div className={styles.preferenceRows}>
            <div className={styles.preferenceRow}>
              <span className={styles.preferenceLabel}>화면 테마</span>
              <div className={styles.segmented} role="group" aria-label="화면 테마">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={styles.segmentButton}
                    aria-pressed={theme === option.value}
                    onClick={() => setTheme(option.value)}
                  >
                    <Icon name={option.icon} aria-hidden="true" />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.preferenceRow}>
              <span className={styles.preferenceLabel}>언어</span>
              <div className={styles.segmented} role="group" aria-label="언어 선택">
                <button
                  type="button"
                  className={styles.segmentButton}
                  aria-pressed={locale === 'ko'}
                  onClick={() => setLocale('ko')}
                >
                  한국어
                </button>
                <button
                  type="button"
                  className={styles.segmentButton}
                  aria-pressed={locale === 'en'}
                  onClick={() => setLocale('en')}
                >
                  English
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Sheet>
  )
}

export default GlobalMenu
