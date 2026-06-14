import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { Badge } from '@components/ui/Badge/Badge'
import { Card } from '@components/ui/Card/Card'
import { Chip } from '@components/ui/Chip/Chip'
import { Icon } from '@components/ui/Icon/Icon'
import { useVenueAreas, useVenues } from '@domains/venues/queries'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import styles from './Venues.module.css'

import type { Venue, VenueKind } from '@rotifolk/shared'

const KIND_META: Record<VenueKind, { emoji: string; label: string }> = {
  'wine-bar': { emoji: '🍷', label: '와인바' },
  cafe: { emoji: '☕️', label: '카페' },
  'tea-house': { emoji: '🍵', label: '다실' },
  'whisky-bar': { emoji: '🥃', label: '위스키바' },
  lounge: { emoji: '🛋️', label: '라운지' },
  'private-room': { emoji: '🔒', label: '프라이빗' },
  rooftop: { emoji: '🌆', label: '루프탑' },
  gallery: { emoji: '🖼️', label: '갤러리' },
  studio: { emoji: '🎬', label: '스튜디오' },
  restaurant: { emoji: '🍽️', label: '레스토랑' },
  pub: { emoji: '🍺', label: '펍' },
  custom: { emoji: '✨', label: '기타' },
}

/** 한 장의 장소 카드. featured면 와이드 레이아웃으로 리스트에 리듬을 준다. */
function VenueCard({ v, featured = false }: { v: Venue; featured?: boolean }) {
  const meta = KIND_META[v.kind]
  return (
    <Card
      padding="none"
      hoverable
      className={featured ? `${styles.card} ${styles.featured}` : styles.card}
    >
      <div className={styles.cover}>
        {v.photos[0] ? (
          <img src={v.photos[0]} alt="" loading="lazy" />
        ) : (
          <div className={styles.placeholder} aria-hidden="true">
            {meta.emoji}
          </div>
        )}
        {v.partnered && (
          <div className={styles.coverBadge}>
            <Badge tone="gold" size="sm">
              제휴
            </Badge>
          </div>
        )}
        <span className={styles.coverKind}>
          <span aria-hidden="true">{meta.emoji}</span> {meta.label}
        </span>
      </div>
      <Card.Body className={styles.body}>
        <h3 className={styles.vName}>{v.name}</h3>
        <dl className={styles.vMeta}>
          <div className={styles.metaItem}>
            <dt className="sr-only">지역</dt>
            <dd>
              <Icon name="pin" size={1} aria-hidden="true" />
              {v.area}
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt className="sr-only">정원</dt>
            <dd>
              <Icon name="user" size={1} aria-hidden="true" />
              {v.capacity}명
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt className="sr-only">평점</dt>
            <dd>
              <span className={styles.star} aria-hidden="true">
                ★
              </span>
              {v.rating.toFixed(1)}
              <span className={styles.reviewCount}>({v.reviewCount})</span>
            </dd>
          </div>
        </dl>
        {v.description && <p className={styles.vDesc}>{v.description}</p>}
        <div className={styles.vFooter}>
          <span className={styles.vPrice}>
            시간당 <strong>{v.pricePerHourKRW.toLocaleString()}원</strong>
          </span>
          <Link to={`/discover?area=${encodeURIComponent(v.area)}`} className={styles.areaLink}>
            이 지역 모임
            <Icon name="chevron-right" size={1} aria-hidden="true" />
          </Link>
        </div>
      </Card.Body>
    </Card>
  )
}

export default function VenuesPage() {
  const [kind, setKind] = useState<VenueKind | undefined>()
  const [area, setArea] = useState<string | undefined>()
  const { data: venueAreas } = useVenueAreas()
  const { data, isLoading } = useVenues({ kind, area, partnered: true })
  const areaOptions = useMemo(() => venueAreas ?? [], [venueAreas])

  const venues = data ?? []
  const hasFilters = Boolean(area || kind)
  const [featured, ...rest] = venues

  const resetFilters = () => {
    setArea(undefined)
    setKind(undefined)
  }

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <p className={styles.kicker}>VENUES · 제휴 장소</p>
        <h1 className={styles.title}>파티를 열 장소를 골라보세요</h1>
        <p className={styles.lead}>
          파티를 열기 좋은 라운지·와인바·카페·다실. 호스트 콘솔에서 바로 선택할 수 있어요.
        </p>
      </header>

      <section className={`container ${styles.filterGroup}`} aria-label="장소 필터">
        <div className={styles.filters} role="group" aria-label="지역">
          <Chip selected={!area} onClick={() => setArea(undefined)}>
            전체 지역
          </Chip>
          {areaOptions.map((a) => (
            <Chip key={a} selected={area === a} onClick={() => setArea(area === a ? undefined : a)}>
              {a}
            </Chip>
          ))}
        </div>
        <div className={styles.filters} role="group" aria-label="장소 종류">
          <Chip
            selected={!kind}
            onClick={() => setKind(undefined)}
            leadingIcon={<Icon name="sparkle" size={1} aria-hidden="true" />}
          >
            전체 종류
          </Chip>
          {(Object.keys(KIND_META) as VenueKind[]).map((k) => (
            <Chip
              key={k}
              selected={kind === k}
              onClick={() => setKind(kind === k ? undefined : k)}
              leadingEmoji={KIND_META[k].emoji}
            >
              {KIND_META[k].label}
            </Chip>
          ))}
        </div>
      </section>

      <section className={`container ${styles.list}`} aria-label="장소 목록" aria-busy={isLoading}>
        {isLoading ? (
          <Loading />
        ) : venues.length === 0 ? (
          <EmptyState
            emoji="🏛️"
            title="해당 조건의 장소가 아직 없어요"
            description={
              hasFilters
                ? '필터를 조금 풀어 보면 더 많은 장소가 보여요.'
                : '곧 새로운 제휴 장소가 추가될 예정이에요.'
            }
            action={
              hasFilters ? (
                <button type="button" className={styles.resetBtn} onClick={resetFilters}>
                  필터 초기화
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className={styles.count} aria-live="polite">
              {venues.length}곳의 장소
            </p>
            {featured && <VenueCard v={featured} featured />}
            {rest.length > 0 && (
              <div className={styles.grid}>
                {rest.map((v) => (
                  <VenueCard key={v.id} v={v} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
