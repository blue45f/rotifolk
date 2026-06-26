import { useToast } from '@components/feedback/Toast/useToast'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { PartyShareCard } from './PartyShareCard'
import styles from './ShareSheet.module.css'
import { copyToClipboard, share, shareText } from './useShare'

export interface ShareSheetProps {
  open: boolean
  onClose: () => void
  title: string
  category: string
  venueArea: string
  startAtISO: string
  currentParticipants: number
  maxParticipants: number
  /** 완성된 초대 절대 URL. (useShare.buildInviteUrl로 만든 값) */
  inviteUrl: string
  gradient?: string
}

const QR_ENDPOINT = 'https://api.qrserver.com/v1/create-qr-code/'

/**
 * 모임 공유 바텀시트.
 * PartyShareCard 미리보기 + 시스템 공유 / 링크 복사 / X / 카카오 / QR.
 * 새 의존성 없이 Web Share API · globalThis.open intent · clipboard만 사용.
 */
export function ShareSheet({
  open,
  onClose,
  title,
  category,
  venueArea,
  startAtISO,
  currentParticipants,
  maxParticipants,
  inviteUrl,
  gradient,
}: ShareSheetProps) {
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    globalThis.addEventListener('keydown', onKey)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      globalThis.removeEventListener('keydown', onKey)
      document.body.style.overflow = original
    }
  }, [open, onClose])

  if (!open) return null

  const text = shareText(title)
  const qrSrc = `${QR_ENDPOINT}?size=180x180&data=${encodeURIComponent(inviteUrl)}`

  const handleSystemShare = async () => {
    const outcome = await share({ title, url: inviteUrl, text })
    if (outcome === 'copied') toast.show('링크를 복사했어요', 'success')
    else if (outcome === 'unsupported') toast.show('공유를 지원하지 않는 환경이에요', 'warning')
  }

  const handleCopy = async () => {
    const ok = await copyToClipboard(inviteUrl)
    toast.show(ok ? '링크를 복사했어요' : '복사에 실패했어요', ok ? 'success' : 'error')
  }

  const handleTwitter = () => {
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(inviteUrl)}`
    globalThis.open(intent, '_blank', 'noopener,noreferrer')
  }

  const handleKakao = async () => {
    // 별도 SDK 없이 — 시스템 공유 시트(카카오톡 포함)를 띄우고, 없으면 링크 복사.
    const outcome = await share({ title, url: inviteUrl, text })
    if (outcome === 'shared' || outcome === 'cancelled') return
    const ok = outcome === 'copied' || (await copyToClipboard(inviteUrl))
    toast.show(
      ok ? '링크를 복사했어요. 카카오톡에 붙여넣어 보내세요' : '복사에 실패했어요',
      ok ? 'success' : 'error'
    )
  }

  return createPortal(
    <div className={styles.backdrop}>
      <button type="button" className={styles.scrim} aria-label="배경 닫기" onClick={onClose} />
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-sheet-title"
      >
        <header className={styles.header}>
          <h2 id="share-sheet-title" className={styles.heading}>
            모임 공유하기
          </h2>
          <button type="button" aria-label="닫기" className={styles.close} onClick={onClose}>
            ✕
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.preview}>
            <PartyShareCard
              title={title}
              category={category}
              venueArea={venueArea}
              startAtISO={startAtISO}
              currentParticipants={currentParticipants}
              maxParticipants={maxParticipants}
              gradient={gradient}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.action} onClick={handleSystemShare}>
              <span className={styles.actionIcon} aria-hidden="true">
                ↗
              </span>
              <span className={styles.actionLabel}>공유</span>
            </button>
            <button type="button" className={styles.action} onClick={handleCopy}>
              <span className={styles.actionIcon} aria-hidden="true">
                🔗
              </span>
              <span className={styles.actionLabel}>링크 복사</span>
            </button>
            <button type="button" className={styles.action} onClick={handleTwitter}>
              <span className={styles.actionIcon} aria-hidden="true">
                𝕏
              </span>
              <span className={styles.actionLabel}>X (트위터)</span>
            </button>
            <button type="button" className={styles.action} onClick={handleKakao}>
              <span className={styles.actionIcon} aria-hidden="true">
                💬
              </span>
              <span className={styles.actionLabel}>카카오톡</span>
            </button>
          </div>

          <div className={styles.qrBlock}>
            <img
              className={styles.qr}
              src={qrSrc}
              width={180}
              height={180}
              alt="초대 링크 QR 코드"
              loading="lazy"
            />
            <p className={styles.qrHint}>QR을 스캔하면 초대장으로 이동해요</p>
          </div>

          <div className={styles.linkRow}>
            <span className={styles.linkText} title={inviteUrl}>
              {inviteUrl}
            </span>
            <button type="button" className={styles.linkCopy} onClick={handleCopy}>
              복사
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ShareSheet
