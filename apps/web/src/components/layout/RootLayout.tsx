import { FeedbackWidget } from '@components/feedback/SurveyDesk/FeedbackWidget'
import PwaInstallBanner from '@components/feedback/PwaInstallBanner'
import { useChatRealtime } from '@domains/chat/useChatRealtime'
import CommandPalette from '@domains/command-palette/CommandPalette'
import { useNotificationsRealtime } from '@domains/notifications/useNotificationsRealtime'
import OnboardingSheet from '@domains/onboard/OnboardingSheet'
import { useDocumentTitle } from '@hooks/useDocumentTitle'
import { useApplyTheme } from '@store/themeStore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { BottomNav } from './BottomNav'
import { Header } from './Header'
import styles from './RootLayout.module.css'
import { SiteFooter } from './SiteFooter'

export default function RootLayout() {
  useApplyTheme()
  useChatRealtime()
  useNotificationsRealtime()
  useDocumentTitle()
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
      {import.meta.env.VITE_SURVEYDESK_URL && (
        <FeedbackWidget appId="rotifolk" endpoint={import.meta.env.VITE_SURVEYDESK_URL} />
      )}
    </div>
  )
}
