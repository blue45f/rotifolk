import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { useApplyTheme } from '@store/themeStore'
import PwaInstallBanner from '@components/feedback/PwaInstallBanner'
import OnboardingSheet from '@features/onboard/OnboardingSheet'
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

  const isLive = location.pathname.startsWith('/live')

  return (
    <div className={styles.shell} data-live={isLive ? 'true' : undefined}>
      <a href="#main-content" className="skip-link">
        본문 바로가기
      </a>
      {!isLive && <Header />}
      {!isLive && <PwaInstallBanner />}
      <main id="main-content" role="main" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      {!isLive && <BottomNav />}
      {!isLive && <OnboardingSheet />}
    </div>
  )
}
