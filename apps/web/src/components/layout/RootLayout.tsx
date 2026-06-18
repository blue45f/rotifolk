import { ChangelogWidget } from '@components/deskcloud/changelogdesk/ChangelogWidget'
import { ChatWidget } from '@components/deskcloud/chatdesk/ChatWidget'
import { CommunityBoard } from '@components/deskcloud/communitydesk/CommunityBoard'
import { NotificationBell } from '@components/deskcloud/notifydesk/NotificationBell'
import { TestimonialWall } from '@components/deskcloud/reviewdesk/ReviewWidgets'
import { SearchPalette } from '@components/deskcloud/searchdesk/SearchPalette'
import PwaInstallBanner from '@components/feedback/PwaInstallBanner'
import { FeedbackWidget } from '@components/feedback/SurveyDesk/FeedbackWidget'
import { useDocumentTitle } from '@hooks/useDocumentTitle'
import { useCurrentUser } from '@store/authStore'
import { useApplyTheme } from '@store/themeStore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { BottomNav } from './BottomNav'
import { Header } from './Header'
import styles from './RootLayout.module.css'
import { SiteFooter } from './SiteFooter'

import { useChatRealtime } from '@/domains/chat/useChatRealtime'
import CommandPalette from '@/domains/command-palette/CommandPalette'
import { useNotificationsRealtime } from '@/domains/notifications/useNotificationsRealtime'
import OnboardingSheet from '@/domains/onboard/OnboardingSheet'

// DeskCloud 위젯은 각자의 VITE_*_URL 이 설정됐을 때만 렌더된다(미설정=완전 비활성).
// 퍼블리시 키는 공개 키라 브라우저 노출이 안전하며 미지정 시 데모 키로 폴백한다.
const env = import.meta.env

export default function RootLayout() {
  useApplyTheme()
  useChatRealtime()
  useNotificationsRealtime()
  useDocumentTitle()
  const user = useCurrentUser()
  const location = useLocation()
  const isFirstRender = useRef(true)
  const [commandOpen, setCommandOpen] = useState(false)
  const [onboardingOpenSignal, setOnboardingOpenSignal] = useState(0)
  const isLive = location.pathname.startsWith('/live')
  const isCommandOpen = isLive ? false : commandOpen
  const openCommand = useCallback(() => setCommandOpen(true), [])
  const closeCommand = useCallback(() => setCommandOpen(false), [])
  const openOnboarding = useCallback(() => {
    setOnboardingOpenSignal((n) => n + 1)
  }, [])

  // 라우트 전환 시 스크롤을 최상단으로 되돌리고 본문 랜드마크로 포커스를 옮긴다(a11y).
  // 첫 진입(직접 연 위치)은 포커스를 가로채지 않는다.
  useEffect(() => {
    globalThis.scrollTo(0, 0)
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }, [location.pathname])

  useEffect(() => {
    if (isLive) {
      let cancelled = false
      queueMicrotask(() => {
        if (!cancelled) setCommandOpen(false)
      })
      return () => {
        cancelled = true
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const isSlash = e.key === '/'
      const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      const isEditable =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)

      if (isSlash && (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || isEditable)) return
      if (isModK || isSlash) {
        e.preventDefault()
        setCommandOpen((open) => !open)
        return
      }
    }
    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  }, [isLive])

  return (
    <div className={styles.shell} data-live={isLive ? 'true' : undefined}>
      <a href="#main-content" className="skip-link">
        본문 바로가기
      </a>
      {!isLive && <Header onOpenCommand={openCommand} />}
      {!isLive && <PwaInstallBanner />}
      <main id="main-content" role="main" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      {!isLive && <SiteFooter />}
      {!isLive && <BottomNav />}
      {!isLive && <OnboardingSheet forceOpenSignal={onboardingOpenSignal} />}
      {isCommandOpen && (
        <CommandPalette onClose={closeCommand} onRestartOnboarding={openOnboarding} />
      )}
      {/* SurveyDesk 미배포 시(VITE_SURVEYDESK_URL 미설정) 위젯은 렌더되지 않아 앱에 영향 없음 */}
      {env.VITE_SURVEYDESK_URL && (
        <FeedbackWidget appId="rotifolk" endpoint={env.VITE_SURVEYDESK_URL} />
      )}

      {/* ───────────────── DeskCloud 위젯 (각 env URL 설정 시에만 활성) ─────────────────
          전역 셸에 데스크당 1회 마운트하며, 미설정 env 는 렌더 자체를 건너뛴다(기존 앱 기능 보존). */}
      {!isLive && env.VITE_CHANGELOGDESK_URL && (
        <ChangelogWidget
          publishableKey={env.VITE_CHANGELOGDESK_PK ?? 'pk_demo'}
          endpoint={env.VITE_CHANGELOGDESK_URL}
          position="bottom-left"
        />
      )}
      {!isLive && user && env.VITE_NOTIFYDESK_URL && (
        <div className={styles.deskNotifyBell}>
          <NotificationBell
            recipientId={user.id}
            publishableKey={env.VITE_NOTIFYDESK_PK ?? 'pk_demo'}
            endpoint={env.VITE_NOTIFYDESK_URL}
          />
        </div>
      )}
      {!isLive && env.VITE_SEARCHDESK_URL && (
        <SearchPalette
          publishableKey={env.VITE_SEARCHDESK_PK ?? 'pk_demo'}
          endpoint={env.VITE_SEARCHDESK_URL}
          hotkey="mod+shift+k"
        />
      )}
      {!isLive && env.VITE_REVIEWDESK_URL && (
        <div
          className={`${styles.deskFloatPanel} ${styles.deskFloatPanelReview}`}
          role="complementary"
          aria-label="이용 후기"
        >
          <TestimonialWall
            publishableKey={env.VITE_REVIEWDESK_PK ?? 'pk_demo'}
            endpoint={env.VITE_REVIEWDESK_URL}
            title="이용 후기"
            limit={3}
          />
        </div>
      )}
      {!isLive && env.VITE_COMMUNITYDESK_URL && (
        <div
          className={`${styles.deskFloatPanel} ${styles.deskFloatPanelCommunity}`}
          role="complementary"
          aria-label="커뮤니티"
        >
          <CommunityBoard
            publishableKey={env.VITE_COMMUNITYDESK_PK ?? 'pk_demo'}
            endpoint={env.VITE_COMMUNITYDESK_URL}
            boardSlug="general"
            memberId={user?.id}
            memberName={user?.nickname}
          />
        </div>
      )}
      {!isLive && user && env.VITE_CHATDESK_URL && (
        <ChatWidget
          publishableKey={env.VITE_CHATDESK_PK ?? 'pk_demo'}
          endpoint={env.VITE_CHATDESK_URL}
          memberId={user.id}
          memberName={user.nickname}
        />
      )}
    </div>
  )
}
