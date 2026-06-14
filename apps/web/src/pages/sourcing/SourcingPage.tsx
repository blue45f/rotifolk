import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/useToast'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import { Icon } from '@components/ui/Icon/Icon'
import { ALL_CATEGORIES, CATEGORY_META } from '@domains/categories/meta'
import { useGeolocation } from '@domains/geo/useGeolocation'
import {
  useCancelBooking,
  useCreateVenueBooking,
  useMyVenueBookings,
  useRecommendVenues,
  type VenueBrief,
} from '@domains/venueBooking/queries'
import { useVenueAreas } from '@domains/venues/queries'
import { formatKRW, VENUE_BOOKING_STATUS_LABEL } from '@rotifolk/shared'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import styles from './Sourcing.module.css'

import type { PartyCategory, VenueBooking, VenueRecommendation } from '@rotifolk/shared'

function isoAt(date: string, time: string): string | undefined {
  if (!date || !time) return undefined
  const d = new Date(`${date}T${time}:00`)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

export default function SourcingPage() {
  const reduce = useReducedMotion() ?? false
  const toast = useToast()
  const geo = useGeolocation()
  const { data: venueAreas } = useVenueAreas()

  const [tab, setTab] = useState<'find' | 'mine'>('find')
  const [category, setCategory] = useState<PartyCategory>('wine')
  const [area, setArea] = useState('전체')
  const [partySize, setPartySize] = useState(8)
  const [date, setDate] = useState('')
  const [start, setStart] = useState('19:00')
  const [end, setEnd] = useState('22:00')
  const [maxBudgetKRW, setMaxBudgetKRW] = useState('')
  const [selected, setSelected] = useState<VenueRecommendation | null>(null)
  const areaOptions = useMemo(() => ['전체', ...(venueAreas ?? [])], [venueAreas])

  const startAt = isoAt(date, start)
  const endAt = isoAt(date, end)
  const parsedMaxBudget = maxBudgetKRW.trim() === '' ? undefined : Number.parseInt(maxBudgetKRW, 10)
  const hasValidTimeRange =
    !startAt || !endAt || new Date(endAt).getTime() > new Date(startAt).getTime()

  const budgetFilter =
    parsedMaxBudget == null || Number.isNaN(parsedMaxBudget) || parsedMaxBudget < 0
      ? undefined
      : Math.round(parsedMaxBudget)

  const brief: VenueBrief = useMemo(
    () => ({
      category,
      area: area === '전체' ? undefined : area,
      partySize,
      startAt,
      endAt,
      lat: geo.coords?.lat ?? null,
      lng: geo.coords?.lng ?? null,
      maxBudgetKRW: budgetFilter,
    }),
    [category, area, partySize, startAt, endAt, geo.coords, budgetFilter]
  )

  const { data: recs, isLoading } = useRecommendVenues(
    tab === 'find' && hasValidTimeRange ? brief : null
  )

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <div className={styles.headVeil} aria-hidden="true" />
        <span className={styles.kicker}>
          <span className={styles.kickerTick} aria-hidden="true" />
          VENUE SOURCING
        </span>
        <h1 className={styles.title}>모임 공간 섭외</h1>
        <p className={styles.lead}>
          카테고리·인원·시간만 정하면 위치까지 따져 잘 맞는 공간을 점수로 추천해요. 마음에 들면 바로
          섭외를 요청하고, 진행 상황은 한자리에서 추적하세요.
        </p>
        <div className={styles.tabs} role="tablist" aria-label="섭외 보기 전환">
          <button
            type="button"
            role="tab"
            id="tab-find"
            aria-selected={tab === 'find'}
            aria-controls="panel-find"
            className={`${styles.tab} ${tab === 'find' ? styles.tabOn : ''}`}
            onClick={() => setTab('find')}
          >
            <Icon name="search" size={1} aria-hidden />
            공간 찾기
          </button>
          <button
            type="button"
            role="tab"
            id="tab-mine"
            aria-selected={tab === 'mine'}
            aria-controls="panel-mine"
            className={`${styles.tab} ${tab === 'mine' ? styles.tabOn : ''}`}
            onClick={() => setTab('mine')}
          >
            <Icon name="bookmark" size={1} aria-hidden />내 섭외
          </button>
        </div>
      </header>

      {tab === 'find' ? (
        <div id="panel-find" role="tabpanel" aria-labelledby="tab-find">
          <section className={`container ${styles.brief}`} aria-label="섭외 조건">
            <div className={styles.briefRow}>
              <span className={styles.briefLabel} id="brief-cat">
                무엇으로
              </span>
              <div className={styles.chipRow} role="group" aria-labelledby="brief-cat">
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
              <span className={styles.briefLabel} id="brief-area">
                어디서
              </span>
              <div className={styles.chipRow} role="group" aria-labelledby="brief-area">
                {areaOptions.map((a) => (
                  <Chip key={a} selected={area === a} onClick={() => setArea(a)}>
                    {a}
                  </Chip>
                ))}
                <button
                  type="button"
                  className={`${styles.geoBtn} ${geo.status === 'granted' ? styles.geoOn : ''}`}
                  onClick={() => geo.request()}
                  aria-pressed={geo.status === 'granted'}
                >
                  <span className={styles.geoPin} aria-hidden="true">
                    <Icon name="pin" size={1} />
                  </span>
                  {geo.status === 'granted' ? '내 주변 정렬됨' : '내 주변'}
                </button>
              </div>
            </div>

            <div className={styles.briefGrid}>
              <div className={styles.field}>
                <span id="field-size">인원</span>
                <div className={styles.stepper} role="group" aria-labelledby="field-size">
                  <button
                    type="button"
                    aria-label="인원 줄이기"
                    onClick={() => setPartySize((n) => Math.max(2, n - 2))}
                  >
                    <Icon name="close" size={0.7} aria-hidden />
                  </button>
                  <strong aria-live="polite">{partySize}명</strong>
                  <button
                    type="button"
                    aria-label="인원 늘리기"
                    onClick={() => setPartySize((n) => Math.min(40, n + 2))}
                  >
                    <Icon name="plus" size={0.8} aria-hidden />
                  </button>
                </div>
              </div>
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
              <label className={styles.field}>
                <span>최대 예산(시간당)</span>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  placeholder="제한 없음"
                  value={maxBudgetKRW}
                  onChange={(e) => setMaxBudgetKRW(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>
            </div>

            {!hasValidTimeRange && (
              <p className={styles.validationError} role="alert">
                종료 시간이 시작 시간보다 빠르거나 같아요. 시간 설정을 수정해 주세요.
              </p>
            )}
          </section>

          <section
            className={`container ${styles.results}`}
            aria-label="추천 공간"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <Loading />
            ) : !recs || recs.length === 0 ? (
              <EmptyState
                emoji="🔍"
                title="조건에 맞는 공간이 없어요"
                description="인원이나 동네를 바꿔보세요."
              />
            ) : (
              <>
                <p className={styles.resultsCount}>{recs.length}곳을 적합도 순으로 추천했어요</p>
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
              </>
            )}
          </section>
        </div>
      ) : (
        <div id="panel-mine" role="tabpanel" aria-labelledby="tab-mine">
          <BookingTracker />
        </div>
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
      role="img"
      aria-label={`적합도 ${score}점, ${gradeLabel(grade)}`}
    >
      <div className={styles.ringInner}>
        <strong>{score}</strong>
        <small>FIT</small>
      </div>
    </div>
  )
}

function bestMatchLabel(grade: VenueRecommendation['fit']['grade']): string {
  return grade === 'perfect' || grade === 'great' ? '추천 1순위' : '가장 가까운 후보'
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
  const isBest = index === 0
  return (
    <motion.article
      className={`${styles.recCard} ${isBest ? styles.recCardBest : ''}`}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.42,
        delay: reduce ? 0 : Math.min(index * 0.05, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {isBest && (
        <div className={styles.bestRibbon}>
          <Icon name="sparkle" size={0.85} aria-hidden />
          {bestMatchLabel(fit.grade)}
        </div>
      )}
      <div className={styles.recCover}>
        {venue.photos[0] ? (
          <img src={venue.photos[0]} alt="" loading="lazy" />
        ) : (
          <div className={styles.recCoverPh} aria-hidden="true">
            <Icon name="home" size={2} />
          </div>
        )}
        <div className={styles.recCoverScrim} aria-hidden="true" />
        <div className={styles.recCoverTop}>
          {venue.instantBook && (
            <Badge tone="gold" size="sm">
              <Icon name="bolt" size={0.85} aria-hidden /> 즉시확정
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
          <span className={`${styles.recGrade} ${styles[`grade_${fit.grade}`]}`}>
            {gradeLabel(fit.grade)} 매치
          </span>
        </div>
        <p className={styles.recMeta}>
          {venue.area}
          {distanceKm != null && (
            <span className={styles.dist}>
              {' · '}
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
            </span>
          )}
          <span> · 최대 {venue.capacity}명</span>
        </p>

        <ul className={styles.reasons}>
          {fit.reasons.slice(0, 3).map((r, i) => (
            <li key={i} className={`${styles.reason} ${styles[`tone_${r.tone}`]}`}>
              <span className={styles.reasonIcon} aria-hidden="true">
                {r.icon}
              </span>
              <span className={styles.reasonText}>{r.text}</span>
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
    <div className={styles.sheetWrap} role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button className={styles.sheetScrim} aria-label="닫기" onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.sheetHandle} aria-hidden="true" />
        {venue.instantBook && (
          <span className={styles.sheetKicker}>
            <Icon name="bolt" size={0.85} aria-hidden /> INSTANT BOOK
          </span>
        )}
        <h2 className={styles.sheetTitle} id="sheet-title">
          {venue.name} 섭외
        </h2>
        <p className={styles.sheetMeta}>
          {venue.area} · {partySize}명 · {CATEGORY_META[category]?.label}
        </p>

        {quote && (
          <div className={styles.quote}>
            <span className={styles.quoteCap}>견적 내역</span>
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
                <span className={styles.qDiscountLabel}>
                  <Icon name="bolt" size={0.85} aria-hidden /> 막판 할인{' '}
                  {Math.round(quote.lastMinuteRate * 100)}%
                </span>
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

        <label className={styles.noteLabel}>
          <span>사장님께 한마디</span>
          <textarea
            className={styles.noteInput}
            rows={2}
            placeholder="예: 루프탑 자리 우선 부탁드려요"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <p className={styles.sheetHint}>
          {venue.instantBook
            ? '즉시 확정되는 공간이에요. 누르면 바로 잡혀요.'
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
    <section className={`container ${styles.tracker}`} aria-label="내 섭외 목록">
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
      <div className={styles.bThumb} aria-hidden="true">
        {booking.venuePhoto ? (
          <img src={booking.venuePhoto} alt="" loading="lazy" />
        ) : (
          <Icon name="home" size={1.4} />
        )}
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
        {booking.ownerMessage && (
          <p className={styles.bMsg}>
            <Icon name="chat" size={0.95} aria-hidden /> {booking.ownerMessage}
          </p>
        )}
        {booking.status === 'confirmed' && booking.arrivalGuide && (
          <div className={styles.arrival}>
            <strong>
              <Icon name="pin" size={0.95} aria-hidden /> 도착 가이드
            </strong>
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
