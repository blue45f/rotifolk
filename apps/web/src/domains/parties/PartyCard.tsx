import { Badge } from '@components/ui/Badge/Badge'
import {
  CHILDREN_POLICY_LABEL,
  MARITAL_STATUS_LABEL,
  SEOUL_AREAS,
  formatDistanceKm,
  haversineKm,
} from '@rotifolk/shared'
import { useAuthStore } from '@store/authStore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'

import styles from './PartyCard.module.css'

import type { PartySummary } from '@rotifolk/shared'

import { CATEGORY_META } from '@/domains/categories/meta'
import { useGeolocation } from '@/domains/geo/useGeolocation'
import { api } from '@/infrastructure/api'

interface Props {
  party: PartySummary
}

function distanceLabel(area: string, here?: { lat: number; lng: number }): string | null {
  if (!here) return null
  const coords = SEOUL_AREAS[area]
  if (!coords) return null
  return formatDistanceKm(haversineKm(here, coords))
}

const TONE_BY_CATEGORY: Record<string, 'wine' | 'coffee' | 'tea' | 'whisky' | 'gold' | 'primary'> =
  {
    wine: 'wine',
    coffee: 'coffee',
    tea: 'tea',
    whisky: 'whisky',
    'natural-wine': 'gold',
  }

const DRINK_HINT: Record<string, string> = {
  none: '음료 별도',
  'per-glass': '잔당 결제',
  unlimited: '무제한',
  paired: '페어링 코스',
}

export function PartyCard({ party }: Props) {
  const navigate = useNavigate()
  const cat = CATEGORY_META[party.category]
  // 돌싱/자녀 등 자격 제한이 있을 때만 칩으로 노출(전체 허용이면 숨김).
  const marital = party.maritalRequirement ?? []
  const maritalChip =
    marital.length > 0 && marital.length < 5
      ? marital.map((m) => MARITAL_STATUS_LABEL[m]).join('·')
      : null
  const childrenChip =
    party.childrenPolicy && party.childrenPolicy !== 'any'
      ? CHILDREN_POLICY_LABEL[party.childrenPolicy]
      : null
  const start = new Date(party.startAt)
  const fillRate = Math.min(1, party.currentParticipants / Math.max(1, party.maxParticipants))
  const isFull = fillRate >= 1
  const isHot = fillRate >= 0.75 && !isFull
  const isLive = party.status === 'live'
  const tone = TONE_BY_CATEGORY[party.category] ?? 'primary'
  const geo = useGeolocation()
  const distance = distanceLabel(party.venueArea, geo.coords)
  const me = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const { data: saved } = useQuery({
    queryKey: ['saved', 'me'],
    queryFn: () => api.get<PartySummary[]>('saved'),
    enabled: !!me,
    staleTime: 30_000,
  })
  const isSaved = saved?.some((s) => s.id === party.id) ?? false
  const toggleSave = useMutation({
    mutationFn: () => (isSaved ? api.delete(`saved/${party.id}`) : api.post(`saved/${party.id}`)),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['saved', 'me'] })
      const prev = qc.getQueryData<PartySummary[]>(['saved', 'me'])
      qc.setQueryData<PartySummary[]>(['saved', 'me'], (cur) => {
        if (!cur) return cur
        return isSaved ? cur.filter((s) => s.id !== party.id) : [party, ...cur]
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['saved', 'me'], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['saved'] })
    },
  })
  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!me || toggleSave.isPending) return
    toggleSave.mutate()
  }

  const handleHostClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/hosts/${party.hostId}`, { replace: false })
  }

  const handleCardNavigate = () => {
    navigate(`/parties/${party.id}`)
  }

  const datePart = start.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
  const timePart = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  return (
    <article className={styles.card} aria-label={`${party.title} 상세 보기`}>
      <button
        type="button"
        className={styles.cardActionLink}
        aria-label={`${party.title} 상세 보기`}
        onClick={handleCardNavigate}
      />
      <div className={styles.cover} style={{ background: cat.bgGradient }}>
        {party.coverImageUrl ? (
          <img src={party.coverImageUrl} alt="" className={styles.coverImg} loading="lazy" />
        ) : (
          <div className={styles.coverEmoji} aria-hidden="true">
            {cat.emoji}
          </div>
        )}
        <div className={styles.coverScrim} aria-hidden="true" />
        <div className={styles.coverHead}>
          <Badge tone={tone} size="sm">
            {cat.emoji} {cat.shortLabel}
          </Badge>
          {isLive && (
            <Badge tone="danger" size="sm">
              🔴 LIVE
            </Badge>
          )}
          {!isLive && isFull && (
            <Badge tone="warning" size="sm">
              마감
            </Badge>
          )}
          {!isLive && isHot && (
            <Badge tone="gold" size="sm">
              곧 마감
            </Badge>
          )}
        </div>
        {me && (
          <button
            type="button"
            className={`${styles.saveBtn} ${isSaved ? styles.saveBtnActive : ''}`}
            onClick={handleSaveClick}
            aria-pressed={isSaved}
            aria-label={isSaved ? '저장 취소' : '저장'}
            title={isSaved ? '저장됨' : '저장'}
          >
            {isSaved ? '★' : '☆'}
          </button>
        )}
        <div className={styles.coverFoot}>
          <span className={styles.dateBadge}>
            <strong>{datePart}</strong>
            <em>{timePart}</em>
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{party.title}</h3>
        {(maritalChip || childrenChip) && (
          <div className={styles.eligRow}>
            {maritalChip && (
              <Badge tone="info" size="sm" outlined>
                {maritalChip}
              </Badge>
            )}
            {childrenChip && (
              <Badge tone="neutral" size="sm" outlined>
                👶 {childrenChip}
              </Badge>
            )}
          </div>
        )}
        <p className={styles.meta}>
          <span>📍 {party.venueArea}</span>
          {distance && (
            <>
              <span className={styles.metaDivider} aria-hidden="true" />
              <span className={styles.distance}>{distance}</span>
            </>
          )}
          <span className={styles.metaDivider} aria-hidden="true" />
          <span>{DRINK_HINT[party.drinkPackage] ?? party.drinkPackage}</span>
        </p>

        <div className={styles.gauge} aria-label={`${party.currentParticipants}명 참여`}>
          <div className={styles.gaugeFill} style={{ width: `${fillRate * 100}%` }} />
        </div>

        <div className={styles.footer}>
          <span className={styles.people}>
            <strong>{party.currentParticipants}</strong>
            <span aria-hidden="true">/</span>
            {party.maxParticipants}명
          </span>
          <span className={styles.price}>
            {party.basePriceKRW === 0 ? '무료' : `${party.basePriceKRW.toLocaleString()}원`}
          </span>
        </div>
        {party.hostNickname && (
          <Link to={`/hosts/${party.hostId}`} className={styles.hostLink} onClick={handleHostClick}>
            🎙️ {party.hostNickname}
          </Link>
        )}
      </div>
    </article>
  )
}

export default PartyCard
