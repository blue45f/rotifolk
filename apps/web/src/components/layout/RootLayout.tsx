import { Outlet, useLocation } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { SiteFooter } from './SiteFooter'
import { useApplyTheme } from '@store/themeStore'
import PwaInstallBanner from '@components/feedback/PwaInstallBanner'
import OnboardingSheet from '@features/onboard/OnboardingSheet'
import CommandPalette from '@features/command-palette/CommandPalette'
import { useChatRealtime } from '@features/chat/useChatRealtime'
import { useNotificationsRealtime } from '@features/notifications/useNotificationsRealtime'
import { useDocumentTitle } from '@hooks/useDocumentTitle'
import styles from './RootLayout.module.css'

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
    window.scrollTo(0, 0)
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
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
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
    </div>
  )
}
