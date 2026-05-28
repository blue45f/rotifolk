import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { VenueKind } from '@rotifolk/shared'
import { useVenues } from '@features/venues/queries'
import { Chip } from '@components/ui/Chip/Chip'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import styles from './Venues.module.css'

const AREAS = ['강남', '한남', '연남', '성수', '북촌', '망원', '이태원', '홍대']

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
  custom: { emoji: '✨', label: '기타' },
}

export default function VenuesPage() {
  const [kind, setKind] = useState<VenueKind | undefined>()
  const [area, setArea] = useState<string | undefined>()
  const { data, isLoading } = useVenues({ kind, area, partnered: true })

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <h1 className={styles.title}>제휴 장소 디렉터리</h1>
        <p className={styles.lead}>
          파티를 열기 좋은 라운지/와인바/카페·다실. 호스트 콘솔에서 바로 선택할 수 있어요.
        </p>
      </header>

      <section className={`container ${styles.filterGroup}`}>
        <div className={styles.filters}>
          <Chip selected={!area} onClick={() => setArea(undefined)}>
            전체
          </Chip>
          {AREAS.map((a) => (
            <Chip
              key={a}
              selected={area === a}
              onClick={() => setArea(area === a ? undefined : a)}
            >
              {a}
            </Chip>
          ))}
        </div>
        <div className={styles.filters}>
          <Chip selected={!kind} onClick={() => setKind(undefined)} leadingEmoji="🌟">
            전체
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

      <section className={`container ${styles.list}`}>
        {isLoading ? (
          <Loading />
        ) : !data || data.length === 0 ? (
          <EmptyState emoji="🏛️" title="해당 카테고리의 장소가 아직 없어요" />
        ) : (
          <div className={styles.grid}>
            {data.map((v) => (
              <Card key={v.id} padding="none" hoverable>
                <div className={styles.cover}>
                  {v.photos[0] ? (
                    <img src={v.photos[0]} alt="" />
                  ) : (
                    <div className={styles.placeholder}>{KIND_META[v.kind].emoji}</div>
                  )}
                  {v.partnered && (
                    <div className={styles.coverBadge}>
                      <Badge tone="gold" size="sm">제휴</Badge>
                    </div>
                  )}
                </div>
                <Card.Body>
                  <h3 className={styles.vName}>{v.name}</h3>
                  <div className={styles.vMeta}>
                    <span>{KIND_META[v.kind].emoji} {KIND_META[v.kind].label}</span>
                    <span>📍 {v.area}</span>
                    <span>👥 {v.capacity}명</span>
                    <span>⭐ {v.rating.toFixed(1)} ({v.reviewCount})</span>
                  </div>
                  <p className={styles.vDesc}>{v.description}</p>
                  <div className={styles.vFooter}>
                    <span className={styles.vPrice}>
                      시간당 <strong>{v.pricePerHourKRW.toLocaleString()}원</strong>
                    </span>
                    <Link
                      to={`/discover?area=${encodeURIComponent(v.area)}`}
                      className={styles.areaLink}
                    >
                      이 지역 모임 →
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
