import { CATEGORY_META } from '@features/categories/meta'

import styles from './PartyShareCard.module.css'

import type { PartyCategory } from '@rotifolk/shared'

export interface PartyShareCardProps {
  title: string
  /** 카테고리 키 (CATEGORY_META). 모르는 값이면 기본 와인 톤으로 폴백. */
  category: string
  venueArea: string
  startAtISO: string
  currentParticipants: number
  maxParticipants: number
  /** 카테고리 그라데이션을 직접 덮어쓰고 싶을 때. */
  gradient?: string
}

const FALLBACK_GRADIENT = 'linear-gradient(135deg, #4A0E25 0%, #7A1F3D 50%, #C9627F 100%)'

function metaFor(category: string) {
  return CATEGORY_META[category as PartyCategory] as
    | (typeof CATEGORY_META)[PartyCategory]
    | undefined
}

function formatStart(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 공유용 프로모 카드. 카테고리 그라데이션 배경 위에 모임 제목·동네·일시·남은
 * 자리와 "rotifolk" 워드마크를 얹는다. SNS 미리보기/스크린샷 용도.
 */
export function PartyShareCard({
  title,
  category,
  venueArea,
  startAtISO,
  currentParticipants,
  maxParticipants,
  gradient,
}: PartyShareCardProps) {
  const meta = metaFor(category)
  const bg = gradient ?? meta?.bgGradient ?? FALLBACK_GRADIENT
  const categoryLabel = meta?.label ?? '로테이션 모임'
  const emoji = meta?.emoji ?? '🍷'
  const startLabel = formatStart(startAtISO)
  const spotsLeft = Math.max(0, maxParticipants - currentParticipants)
  const isFull = spotsLeft <= 0

  return (
    <figure className={styles.card} style={{ background: bg }} aria-label="공유 카드 미리보기">
      <div className={styles.sheen} aria-hidden="true" />
      <div className={styles.top}>
        <span className={styles.category}>
          <span aria-hidden="true">{emoji}</span> {categoryLabel}
        </span>
        <span className={styles.spots}>{isFull ? '대기 가능' : `${spotsLeft}자리 남음`}</span>
      </div>

      <div className={styles.center}>
        <h3 className={styles.title}>{title}</h3>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt aria-hidden="true">📍</dt>
            <dd>{venueArea}</dd>
          </div>
          {startLabel && (
            <div className={styles.metaRow}>
              <dt aria-hidden="true">🗓️</dt>
              <dd>{startLabel}</dd>
            </div>
          )}
          <div className={styles.metaRow}>
            <dt aria-hidden="true">👥</dt>
            <dd>
              {currentParticipants}/{maxParticipants}명 모임
            </dd>
          </div>
        </dl>
      </div>

      <figcaption className={styles.bottom}>
        <span className={styles.wordmark}>rotifolk</span>
        <span className={styles.tag}>같이 한 잔 어때요?</span>
      </figcaption>
    </figure>
  )
}

export default PartyShareCard
