import { useEffect, useMemo, useRef, useState } from 'react'

import styles from './Loading.module.css'

type LoadingProps = {
  label?: string
  delayMs?: number
  timeoutMs?: number
  onRetry?: () => void
  retryLabel?: string
}

export default function Loading({
  label,
  delayMs = 7000,
  timeoutMs,
  onRetry,
  retryLabel = '새로고침',
}: LoadingProps) {
  const safeDelayMs =
    delayMs !== undefined && Number.isFinite(delayMs) ? Math.max(0, Math.trunc(delayMs)) : 7000
  const safeTimeoutMs =
    timeoutMs !== undefined && Number.isFinite(timeoutMs)
      ? Math.max(0, Math.trunc(timeoutMs))
      : null
  const timeoutMsValue = safeTimeoutMs === null ? safeDelayMs * 4 : safeTimeoutMs
  const useTimeout = timeoutMsValue > 0

  const resolvedLabel = useMemo(() => {
    if (typeof window === 'undefined') return label ?? '로딩 중'
    if (label) return label

    const path = window.location.pathname

    if (path.startsWith('/parties/')) return '모임 정보를 불러오는 중'
    if (path === '/search') return '검색 결과를 찾는 중'
    if (path.startsWith('/me')) return '내 정보를 가져오는 중'
    if (path === '/discover') return '모임 검색 결과를 불러오는 중'
    if (path === '/terms' || path === '/privacy' || path === '/cancel-policy') {
      return '약관·정책 문서를 불러오는 중'
    }
    if (path === '/policy' || path === '/policies') return '약관 문서를 불러오는 중'
    if (path.startsWith('/hosts/')) return '호스트 정보를 불러오는 중'
    if (path.startsWith('/clubs/')) return '클럽 정보를 불러오는 중'
    if (path.startsWith('/chat')) return '채팅을 불러오는 중'
    if (path.startsWith('/notifications')) return '알림을 불러오는 중'
    if (path === '/host' || path.startsWith('/host/')) return '호스트 화면을 불러오는 중'
    if (path.startsWith('/payments') || path.startsWith('/notes'))
      return '결제·노트 정보를 불러오는 중'
    if (path.startsWith('/calendar')) return '일정을 불러오는 중'
    if (path.startsWith('/admin')) return '관리 화면을 불러오는 중'
    if (path === '/match-card' || path.startsWith('/match-card/')) return '매칭 정보를 불러오는 중'
    return '로딩 중'
  }, [label])

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const retryTimerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const isDelayed = safeDelayMs <= 0 || elapsedSeconds >= Math.ceil(safeDelayMs / 1000)
  const isLongDelay = safeDelayMs <= 0 || elapsedSeconds >= Math.ceil((safeDelayMs * 2) / 1000)
  const isTimedOut = useTimeout && elapsedSeconds >= Math.ceil(timeoutMsValue / 1000)
  const isRetryEnabled = elapsedSeconds >= 1

  const progressRatio =
    timeoutMsValue > 0
      ? Math.min(100, Math.round(((elapsedSeconds * 1000) / timeoutMsValue) * 100))
      : 0

  const timeoutMessage =
    timeoutMsValue > 0
      ? `${Math.max(0, Math.floor(timeoutMsValue / 1000) - elapsedSeconds)}초 내로 재시도 제안`
      : ''

  useEffect(() => {
    if (typeof window === 'undefined') return

    startedAtRef.current = Date.now()
    const refresh = () => {
      const next = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000))
      setElapsedSeconds((current) => (current === next ? current : next))
    }

    refresh()
    const ticker = window.setInterval(refresh, 1000)

    return () => {
      window.clearInterval(ticker)
      if (retryTimerRef.current != null) {
        window.clearTimeout(retryTimerRef.current)
      }
    }
  }, [safeDelayMs, timeoutMsValue, useTimeout])

  const onRetryAction = onRetry ?? (() => window.location.reload())
  const subtitle = isLongDelay
    ? `네트워크가 원활하지 않을 수 있습니다. ${elapsedSeconds}초째 응답이 지연되고 있어요.`
    : isDelayed
      ? `요청이 지연되고 있어요. ${elapsedSeconds}초째 진행 중입니다.`
      : ''
  const timeoutText = isTimedOut
    ? '요청 타임아웃이 발생했어요. 네트워크 상태를 확인하고 다시 시도해 주세요.'
    : ''
  const retryButtonLabel = retryLabel

  const isOffline =
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && !navigator.onLine

  const handleRetry = () => {
    if (retryTimerRef.current != null) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }

    setIsRetrying(true)
    onRetryAction()
    retryTimerRef.current = window.setTimeout(() => {
      setIsRetrying(false)
      retryTimerRef.current = null
    }, 800)
  }

  return (
    <div className={styles.wrap} role="status" aria-live="polite" aria-busy>
      <div className={styles.spinnerWrap} aria-hidden="true">
        <span className={styles.ring} />
        <span className={styles.ringGlow} />
      </div>
      <div className={styles.textWrap}>
        <p className={styles.title}>{resolvedLabel}</p>
        <p className={styles.timer} aria-live="polite" aria-atomic="true">
          {isOffline ? '오프라인 상태입니다.' : `${elapsedSeconds}초 경과`}
        </p>
        <div className={styles.progressWrap} aria-hidden="true">
          <span
            className={styles.progressBar}
            style={{ transform: `scaleX(${progressRatio / 100})` }}
          />
        </div>
        {subtitle ? <p className={styles.delayText}>{subtitle}</p> : null}
        {timeoutMsValue > 0 ? (
          <p className={styles.progressText}>
            예상 대기 시간 {progressRatio}% · {timeoutMessage}
          </p>
        ) : null}
        {isDelayed && isRetryEnabled ? (
          <button type="button" className={styles.retryButton} onClick={handleRetry}>
            {isRetrying ? '요청 중…' : retryButtonLabel}
          </button>
        ) : null}
        {isTimedOut ? (
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => (globalThis.location.href = '/')}
          >
            홈으로 이동
          </button>
        ) : null}
        {isTimedOut ? <p className={styles.delayText}>{timeoutText}</p> : null}
      </div>
      <span className="sr-only">
        {isLongDelay
          ? `${resolvedLabel}. 네트워크 상태가 느릴 수 있어요. 새로고침하거나 조금만 더 기다려 주세요.`
          : isDelayed
            ? `${resolvedLabel}. 네트워크 응답이 늦어 재시도 안내를 표시했습니다.`
            : resolvedLabel}
      </span>
    </div>
  )
}
