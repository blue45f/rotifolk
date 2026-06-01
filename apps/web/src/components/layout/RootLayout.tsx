import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { useApplyTheme } from '@store/themeStore'
import PwaInstallBanner from '@components/feedback/PwaInstallBanner'
import OnboardingSheet from '@features/onboard/OnboardingSheet'
import { useChatRealtime } from '@features/chat/useChatRealtime'
import { useNotificationsRealtime } from '@features/notifications/useNotificationsRealtime'
import styles from './RootLayout.module.css'

export default function RootLayout() {
  useApplyTheme()
  useChatRealtime()
  useNotificationsRealtime()
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const isLive = location.pathname.startsWith('/live')

  return (
    <div className={styles.shell} data-live={isLive ? 'true' : undefined}>
      <a href="#main-content" className="skip-link">
        본문 바로가기
      </a>
      {!isLive && <Header />}
      {!isLive && <PwaInstallBanner />}
      <main id="main-content" role="main" className={styles.main}>
        <Outlet />
      </main>
      {!isLive && <BottomNav />}
      {!isLive && <OnboardingSheet />}
    </div>
  )
}
