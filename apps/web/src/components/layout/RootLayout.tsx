import ConnectivityStatus from '@components/feedback/ConnectivityStatus'
import PwaInstallBanner from '@components/feedback/PwaInstallBanner'
import RouteAnnouncer from '@components/feedback/RouteAnnouncer'
import { useDocumentTitle } from '@hooks/useDocumentTitle'
import { useApplyTheme } from '@store/themeStore'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { IntroSplash } from './IntroSplash'
import styles from './RootLayout.module.css'
import enhancements from './ShellEnhancements.module.css'
import { SiteFooter } from './SiteFooter'

import { useSiteAmbientBgm } from '@/domains/bgm/useSiteAmbientBgm'
import { useChatRealtime } from '@/domains/chat/useChatRealtime'
import CommandPalette from '@/domains/command-palette/CommandPalette'
import { FeedbackButton } from '@/domains/deskcloud/FeedbackButton'
import GlobalMenu from '@/domains/navigation/GlobalMenu'
import { useNotificationsRealtime } from '@/domains/notifications/useNotificationsRealtime'
import OnboardingSheet from '@/domains/onboard/OnboardingSheet'
import { useUiAudioEnabled } from '@/domains/sound/useUiAudio'
import { isTossInApp } from '@/infrastructure/toss'

export default function RootLayout() {
  useApplyTheme()
  useChatRealtime()
  useNotificationsRealtime()
  useDocumentTitle()
  const location = useLocation()
  const isInTossInApp = isTossInApp()
  const isFirstRender = useRef(true)
  const [commandOpen, setCommandOpen] = useState(false)
  const [globalMenuOpen, setGlobalMenuOpen] = useState(false)
  const [onboardingOpenSignal, setOnboardingOpenSignal] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [ambientPanelOpen, setAmbientPanelOpen] = useState(false)
  const ambientWrapRef = useRef<HTMLDivElement | null>(null)
  const ambientRangeId = useId()
  const isLive = location.pathname.startsWith('/live')
  const showChrome = !isLive && !isInTossInApp
  const uiAudio = useUiAudioEnabled()
  const ambient = useSiteAmbientBgm(showChrome, uiAudio.isEnabled)
  const isCommandOpen = showChrome ? commandOpen : false
  const isGlobalMenuOpen = showChrome ? globalMenuOpen : false
  const openCommand = useCallback(() => {
    setGlobalMenuOpen(false)
    setCommandOpen(true)
  }, [])
  const closeCommand = useCallback(() => setCommandOpen(false), [])
  const openGlobalMenu = useCallback(() => {
    setCommandOpen(false)
    setGlobalMenuOpen(true)
  }, [])
  const closeGlobalMenu = useCallback(() => setGlobalMenuOpen(false), [])
  const openOnboarding = useCallback(() => {
    setGlobalMenuOpen(false)
    setOnboardingOpenSignal((count) => count + 1)
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
    if (!showChrome) {
      let cancelled = false
      queueMicrotask(() => {
        if (cancelled) return
        setCommandOpen(false)
        setGlobalMenuOpen(false)
      })
      return () => {
        cancelled = true
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const isSlash = event.key === '/'
      const isModK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      const isEditable =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)

      if (
        isSlash &&
        (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || isEditable)
      ) {
        return
      }
      if (isModK || isSlash) {
        event.preventDefault()
        setGlobalMenuOpen(false)
        setCommandOpen((open) => !open)
      }
    }
    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  }, [showChrome])

  useEffect(() => {
    if (!showChrome || typeof window === 'undefined') return

    const handleScroll = () => {
      const html = document.documentElement
      const total = Math.max(1, html.scrollHeight - window.innerHeight)
      setScrollProgress(Math.min(100, Math.round((window.scrollY / total) * 100)))
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [showChrome])

  useEffect(() => {
    if (!ambientPanelOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ambientWrapRef.current) return
      if (!(event.target instanceof Node)) return
      if (!ambientWrapRef.current.contains(event.target)) {
        setAmbientPanelOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [ambientPanelOpen])

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const volumePercent = Math.round(ambient.volume * 100)

  return (
    <div
      className={styles.shell}
      data-live={isLive ? 'true' : undefined}
      data-toss={isInTossInApp ? 'true' : undefined}
    >
      {!isInTossInApp && <IntroSplash />}
      <a href="#main-content" className="skip-link">
        본문 바로가기
      </a>
      {showChrome && (
        <Header
          onOpenCommand={openCommand}
          onOpenMenu={openGlobalMenu}
          menuOpen={isGlobalMenuOpen}
        />
      )}
      {showChrome && (
        <div className={styles.scrollProgress} aria-hidden="true">
          <span
            className={styles.scrollProgressBar}
            style={{ transform: `scaleX(${scrollProgress / 100})` }}
          />
        </div>
      )}
      {showChrome && <PwaInstallBanner />}
      {showChrome && <ConnectivityStatus />}
      <RouteAnnouncer />
      <main id="main-content" role="main" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      {showChrome && scrollProgress > 12 && (
        <button
          type="button"
          className={`${styles.toTop} ${enhancements.toTop}`}
          onClick={handleScrollToTop}
          aria-label="페이지 상단으로 이동"
        >
          ↑
        </button>
      )}
      {showChrome && ambient.isSupported && (
        <div
          className={`${styles.ambientDock} ${enhancements.ambientDock}`}
          ref={ambientWrapRef}
        >
          <button
            type="button"
            className={`${styles.ambientBgm} ${ambient.isEnabled ? styles.ambientBgmOn : ''}`}
            onClick={ambient.toggle}
            aria-label={ambient.isEnabled ? '배경음악 끄기' : '배경음악 켜기'}
            aria-pressed={ambient.isEnabled ? 'true' : 'false'}
          >
            {ambient.isEnabled ? '🎶' : '🔇'}
          </button>
          <button
            type="button"
            className={styles.ambientDockToggle}
            onClick={() => setAmbientPanelOpen((value) => !value)}
            aria-expanded={ambientPanelOpen ? 'true' : 'false'}
            aria-label="배경음악 설정 열기"
          >
            ⚙
          </button>
          <div
            className={`${styles.ambientPanel} ${ambientPanelOpen ? styles.ambientPanelOpen : ''}`}
          >
            <p className={styles.ambientPanelLabel}>배경음 · {ambient.trackLabel}</p>
            <label className={styles.ambientPanelRangeLabel} htmlFor={ambientRangeId}>
              볼륨 {volumePercent}%
            </label>
            <input
              id={ambientRangeId}
              className={styles.ambientRange}
              type="range"
              min={0.12}
              max={1}
              step={0.01}
              value={ambient.volume}
              onChange={(event) => {
                ambient.setVolume(Number(event.target.value))
              }}
            />
            <div className={styles.ambientPanelActions}>
              <button
                type="button"
                className={styles.ambientPanelAction}
                onClick={uiAudio.toggle}
                aria-label={uiAudio.isEnabled ? '효과음 끄기' : '효과음 켜기'}
              >
                {uiAudio.isEnabled ? '효과음 끄기' : '효과음 켜기'}
              </button>
              <button
                type="button"
                className={styles.ambientPanelAction}
                onClick={ambient.nextTrack}
              >
                다음 배경음
              </button>
              <button type="button" className={styles.ambientPanelAction} onClick={ambient.toggle}>
                {ambient.isEnabled ? '음악 끄기' : '음악 켜기'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showChrome && <SiteFooter />}
      {showChrome && (
        <BottomNav onOpenMenu={openGlobalMenu} menuOpen={isGlobalMenuOpen} />
      )}
      {showChrome && <OnboardingSheet forceOpenSignal={onboardingOpenSignal} />}
      {showChrome && <GlobalMenu open={isGlobalMenuOpen} onClose={closeGlobalMenu} />}
      {isCommandOpen && (
        <CommandPalette onClose={closeCommand} onRestartOnboarding={openOnboarding} />
      )}
      {/* SurveyDesk(피드백) — @heejun/deskcloud SDK(pk_) 로 데이터만 받아 앱 컴포넌트로 네이티브 렌더.
          VITE_SURVEYDESK_URL 미설정 시 런처가 렌더되지 않고, 앱의 1차 고객지원(/support)이 유지된다. */}
      {showChrome && <FeedbackButton />}
    </div>
  )
}
