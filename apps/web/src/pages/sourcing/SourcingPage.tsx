import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import type { PartyCategory, VenueBooking, VenueRecommendation } from '@rotifolk/shared'
import { formatKRW, VENUE_BOOKING_STATUS_LABEL } from '@rotifolk/shared'
import { ALL_CATEGORIES, CATEGORY_META } from '@features/categories/meta'
import { useGeolocation } from '@features/geo/useGeolocation'
import {
  useCancelBooking,
  useCreateVenueBooking,
  useMyVenueBookings,
  useRecommendVenues,
  type VenueBrief,
} from '@features/venueBooking/queries'
import { Button } from '@components/ui/Button/Button'
import { Badge } from '@components/ui/Badge/Badge'
import { Chip } from '@components/ui/Chip/Chip'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import styles from './Sourcing.module.css'

const AREAS = ['전체', '한남동', '연남동', '강남', '성수', '북촌', '망원', '이태원', '홍대']

function isoAt(date: string, time: string): string | undefined {
  if (!date || !time) return undefined
  const d = new Date(`${date}T${time}:00`)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

export default function SourcingPage() {
  const reduce = useReducedMotion() ?? false
  const toast = useToast()
  const geo = useGeolocation()

  const [tab, setTab] = useState<'find' | 'mine'>('find')
  const [category, setCategory] = useState<PartyCategory>('wine')
  const [area, setArea] = useState('전체')
  const [partySize, setPartySize] = useState(8)
  const [date, setDate] = useState('')
  const [start, setStart] = useState('19:00')
  const [end, setEnd] = useState('22:00')
  const [selected, setSelected] = useState<VenueRecommendation | null>(null)

  const startAt = isoAt(date, start)
  const endAt = isoAt(date, end)

  const brief: VenueBrief = useMemo(
    () => ({
      category,
      area: area === '전체' ? undefined : area,
      partySize,
      startAt,
      endAt,
      lat: geo.coords?.lat ?? null,
      lng: geo.coords?.lng ?? null,
    }),
    [category, area, partySize, startAt, endAt, geo.coords],
  )

  const { data: recs, isLoading } = useRecommendVenues(tab === 'find' ? brief : null)

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <span className={styles.kicker}>VENUE SOURCING STUDIO</span>
        <h1 className={styles.title}>
          동네에서 3탭,
          <br />딱 맞는 공간을 섭외하세요
        </h1>
        <p className={styles.lead}>
          카테고리·인원·시간만 정하면, 위치까지 따져 가장 잘 맞는 공간을 점수로 추천해요.
        </p>
        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'find'}
            className={`${styles.tab} ${tab === 'find' ? styles.tabOn : ''}`}
            onClick={() => setTab('find')}
          >
            공간 찾기
          </button>
          <button
            role="tab"
            aria-selected={tab === 'mine'}
            className={`${styles.tab} ${tab === 'mine' ? styles.tabOn : ''}`}
            onClick={() => setTab('mine')}
          >
            내 섭외
          </button>
        </div>
      </header>

      {tab === 'find' ? (
        <>
          <section className={`container ${styles.brief}`} aria-label="섭외 브리프">
            <div className={styles.briefRow}>
              <span className={styles.briefLabel}>무엇으로</span>
              <div className={styles.chipRow}>
                {ALL_CATEGORIES.filter((c) => c.value !== 'custom').map((c) => (
                  <Chip
                    key={c.value}
                    selected={category === c.value}
                    leadingEmoji={c.emoji}
                    onClick={() => setCategory(c.value as PartyCategory)}
                  >
                    {c.shortLabel}
                  </Chip>
                ))}
              </div>
            </div>

            <div className={styles.briefRow}>
              <span className={styles.briefLabel}>어디서</span>
              <div className={styles.chipRow}>
                {AREAS.map((a) => (
                  <Chip key={a} selected={area === a} onClick={() => setArea(a)}>
                    {a}
                  </Chip>
                ))}
                <button
                  type="button"
                  className={`${styles.geoBtn} ${geo.status === 'granted' ? styles.geoOn : ''}`}
                  onClick={() => geo.request()}
                >
                  📍 {geo.status === 'granted' ? '내 주변 정렬됨' : '내 주변'}
                </button>
              </div>
            </div>

            <div className={styles.briefGrid}>
              <label className={styles.field}>
                <span>인원</span>
                <div className={styles.stepper}>
                  <button type="button" onClick={() => setPartySize((n) => Math.max(2, n - 2))}>
                    −
                  </button>
                  <strong>{partySize}명</strong>
                  <button type="button" onClick={() => setPartySize((n) => Math.min(40, n + 2))}>
                    ＋
                  </button>
                </div>
              </label>
              <label className={styles.field}>
                <span>날짜</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>시작</span>
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>종료</span>
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </label>
            </div>
          </section>

          <section className={`container ${styles.results}`}>
            {isLoading ? (
              <Loading />
            ) : !recs || recs.length === 0 ? (
              <EmptyState
                emoji="🔍"
                title="조건에 맞는 공간이 없어요"
                description="인원이나 동네를 바꿔보세요."
              />
            ) : (
              <div className={styles.recList}>
                {recs.map((r, i) => (
                  <VenueRecCard
                    key={r.venue.id}
                    rec={r}
                    index={i}
                    reduce={reduce}
                    hasTime={!!startAt && !!endAt}
                    onPick={() => setSelected(r)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <BookingTracker />
      )}

      {selected && (
        <BookingConfirm
          rec={selected}
          category={category}
          partySize={partySize}
          startAt={startAt}
          endAt={endAt}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null)
            setTab('mine')
            toast.show('섭외 요청을 보냈어요 ✨', 'success')
          }}
        />
      )}
    </div>
  )
}

function gradeLabel(grade: VenueRecommendation['fit']['grade']): string {
  return { perfect: '완벽', great: '아주 좋음', good: '좋음', fair: '보통' }[grade]
}

function FitRing({ score, grade }: { score: number; grade: VenueRecommendation['fit']['grade'] }) {
  const deg = Math.round((score / 100) * 360)
  return (
    <div
      className={`${styles.ring} ${styles[`ring_${grade}`]}`}
      style={{ ['--deg' as never]: `${deg}deg` }}
    >
      <div className={styles.ringInner}>
        <strong>{score}</strong>
        <small>FIT</small>
      </div>
    </div>
  )
}

function VenueRecCard({
  rec,
  index,
  reduce,
  hasTime,
  onPick,
}: {
  rec: VenueRecommendation
  index: number
  reduce: boolean
  hasTime: boolean
  onPick: () => void
}) {
  const { venue, fit, quote, distanceKm, available } = rec
  return (
    <motion.article
      className={styles.recCard}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
    >
      <div className={styles.recCover}>
        {venue.photos[0] ? (
          <img src={venue.photos[0]} alt="" loading="lazy" />
        ) : (
          <div className={styles.recCoverPh}>🏛️</div>
        )}
        <div className={styles.recCoverTop}>
          {venue.instantBook && (
            <Badge tone="gold" size="sm">
              ⚡ 즉시확정
            </Badge>
          )}
          {available === false && (
            <Badge tone="danger" size="sm">
              예약 불가
            </Badge>
          )}
        </div>
        <FitRing score={fit.score} grade={fit.grade} />
      </div>

      <div className={styles.recBody}>
        <div className={styles.recHead}>
          <h3>{venue.name}</h3>
          <span className={styles.recGrade}>{gradeLabel(fit.grade)} 매치</span>
        </div>
        <p className={styles.recMeta}>
          {venue.area}
          {distanceKm != null && (
            <span className={styles.dist}>
              ·{' '}
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
            </span>
          )}
          <span> · 최대 {venue.capacity}명</span>
        </p>

        <ul className={styles.reasons}>
          {fit.reasons.slice(0, 3).map((r, i) => (
            <li key={i} className={styles[`tone_${r.tone}`]}>
              <span aria-hidden="true">{r.icon}</span> {r.text}
            </li>
          ))}
        </ul>

        <div className={styles.recFoot}>
          <div className={styles.recPrice}>
            {quote && hasTime ? (
              <>
                <strong>{formatKRW(quote.totalKRW)}</strong>
                <small>{quote.hours}시간 · 청소비 포함</small>
              </>
            ) : (
              <>
                <strong>{formatKRW(venue.pricePerHourKRW)}</strong>
                <small>시간당</small>
              </>
            )}
          </div>
          <Button size="sm" variant={venue.instantBook ? 'gold' : 'primary'} onClick={onPick}>
            {venue.instantBook ? '바로 섭외' : '섭외 요청'}
          </Button>
        </div>
      </div>
    </motion.article>
  )
}

function BookingConfirm({
  rec,
  category,
  partySize,
  startAt,
  endAt,
  onClose,
  onDone,
}: {
  rec: VenueRecommendation
  category: PartyCategory
  partySize: number
  startAt?: string
  endAt?: string
  onClose: () => void
  onDone: () => void
}) {
  const toast = useToast()
  const create = useCreateVenueBooking()
  const [note, setNote] = useState('')
  const { venue, quote } = rec

  const submit = async () => {
    if (!startAt || !endAt) {
      toast.show('날짜와 시간을 먼저 정해주세요', 'error')
      return
    }
    try {
      await create.mutateAsync({
        venueId: venue.id,
        startAt,
        endAt,
        partySize,
        category,
        noteToOwner: note || undefined,
      })
      onDone()
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <div className={styles.sheetWrap} role="dialog" aria-modal="true">
      <button className={styles.sheetScrim} aria-label="닫기" onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.sheetHandle} />
        <h2 className={styles.sheetTitle}>{venue.name} 섭외</h2>
        <p className={styles.sheetMeta}>
          {venue.area} · {partySize}명 · {CATEGORY_META[category]?.label}
        </p>

        {quote && (
          <div className={styles.quote}>
            <div className={styles.qRow}>
              <span>
                {formatKRW(venue.pricePerHourKRW)} × {quote.hours}시간
              </span>
              <span>{formatKRW(venue.pricePerHourKRW * quote.hours)}</span>
            </div>
            {quote.multiplier > 1 && (
              <div className={styles.qRow}>
                <span>
                  {quote.weekendApplied ? '주말' : '피크'} 할증 ×{quote.multiplier}
                </span>
                <span>+{formatKRW(quote.baseKRW - venue.pricePerHourKRW * quote.hours)}</span>
              </div>
            )}
            {quote.discountKRW > 0 && (
              <div className={`${styles.qRow} ${styles.qDiscount}`}>
                <span>⚡ 막판 할인 {Math.round(quote.lastMinuteRate * 100)}%</span>
                <span>−{formatKRW(quote.discountKRW)}</span>
              </div>
            )}
            {quote.cleaningFeeKRW > 0 && (
              <div className={styles.qRow}>
                <span>청소비</span>
                <span>{formatKRW(quote.cleaningFeeKRW)}</span>
              </div>
            )}
            <div className={styles.qTotal}>
              <span>합계</span>
              <strong>{formatKRW(quote.totalKRW)}</strong>
            </div>
          </div>
        )}

        <textarea
          className={styles.noteInput}
          rows={2}
          placeholder="사장님께 한마디 (예: 루프탑 자리 우선 부탁드려요)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <p className={styles.sheetHint}>
          {venue.instantBook
            ? '⚡ 즉시 확정되는 공간이에요. 누르면 바로 잡혀요.'
            : '사장님이 확인 후 확정하면 알림으로 알려드려요.'}
        </p>

        <Button
          fullWidth
          size="lg"
          variant={venue.instantBook ? 'gold' : 'primary'}
          isLoading={create.isPending}
          onClick={submit}
        >
          {venue.instantBook ? '바로 섭외 확정' : '섭외 요청 보내기'}
        </Button>
      </div>
    </div>
  )
}

function BookingTracker() {
  const { data, isLoading } = useMyVenueBookings('requester')
  const cancel = useCancelBooking()
  const toast = useToast()

  if (isLoading) return <Loading />
  if (!data || data.length === 0)
    return (
      <div className="container">
        <EmptyState
          emoji="📍"
          title="아직 섭외한 공간이 없어요"
          description="마음에 드는 공간을 찾아 첫 섭외를 보내보세요."
        />
      </div>
    )

  return (
    <section className={`container ${styles.tracker}`}>
      {data.map((b) => (
        <BookingRow
          key={b.id}
          booking={b}
          onCancel={async () => {
            try {
              await cancel.mutateAsync(b.id)
              toast.show('섭외를 취소했어요', 'info')
            } catch (e) {
              toast.show((e as Error).message, 'error')
            }
          }}
        />
      ))}
    </section>
  )
}

const STATUS_TONE: Record<VenueBooking['status'], 'neutral' | 'gold' | 'success' | 'danger'> = {
  requested: 'gold',
  confirmed: 'success',
  declined: 'danger',
  cancelled: 'neutral',
  completed: 'neutral',
}

function BookingRow({ booking, onCancel }: { booking: VenueBooking; onCancel: () => void }) {
  const d = new Date(booking.startAt)
  const when = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  return (
    <article className={styles.bRow}>
      <div className={styles.bThumb}>
        {booking.venuePhoto ? <img src={booking.venuePhoto} alt="" loading="lazy" /> : '🏛️'}
      </div>
      <div className={styles.bMain}>
        <div className={styles.bTop}>
          <strong>{booking.venueName}</strong>
          <Badge tone={STATUS_TONE[booking.status]} size="sm">
            {VENUE_BOOKING_STATUS_LABEL[booking.status]}
          </Badge>
        </div>
        <p className={styles.bMeta}>
          {booking.venueArea} · {when} · {booking.partySize}명 · {formatKRW(booking.totalKRW)}
        </p>
        {booking.ownerMessage && <p className={styles.bMsg}>💬 {booking.ownerMessage}</p>}
        {booking.status === 'confirmed' && booking.arrivalGuide && (
          <div className={styles.arrival}>
            <strong>🗝️ 도착 가이드</strong>
            {booking.arrivalGuide.parkingNote && <span>🅿️ {booking.arrivalGuide.parkingNote}</span>}
            {booking.arrivalGuide.entryInfo && <span>🚪 {booking.arrivalGuide.entryInfo}</span>}
            {booking.arrivalGuide.wifiSsid && (
              <span>
                📶 {booking.arrivalGuide.wifiSsid} / {booking.arrivalGuide.wifiPassword}
              </span>
            )}
          </div>
        )}
        {(booking.status === 'requested' || booking.status === 'confirmed') && (
          <div className={styles.bActions}>
            {booking.status === 'confirmed' && booking.partyId == null && (
              <Link to={`/host/create?venueId=${booking.venueId}`}>
                <Button size="sm" variant="gold">
                  이 공간으로 파티 열기
                </Button>
              </Link>
            )}
            <Button size="sm" variant="ghost" onClick={onCancel}>
              취소
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}
