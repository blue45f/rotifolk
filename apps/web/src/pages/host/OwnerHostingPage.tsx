import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { OffHoursSlot, VenueBooking } from '@rotifolk/shared'
import { formatKRW } from '@rotifolk/shared'
import {
  useDecideBooking,
  useMyVenueBookings,
  useMyVenues,
  useVenueAvailability,
  type OwnedVenue,
} from '@features/venueBooking/queries'
import { Button } from '@components/ui/Button/Button'
import { Badge } from '@components/ui/Badge/Badge'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import styles from './OwnerHosting.module.css'

export default function OwnerHostingPage() {
  const { data: venues, isLoading } = useMyVenues()
  const { data: requests } = useMyVenueBookings('owner')
  const pending = (requests ?? []).filter((r) => r.status === 'requested')

  if (isLoading) return <Loading />

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <div className={styles.headText}>
          <span className={styles.kicker}>OWNER HOSTING</span>
          <h1 className={styles.title}>내 가게로 호스팅</h1>
          <p className={styles.lead}>
            비어 있던 시간을, 사람으로 채우세요. 메뉴·가격은 가게 정보 그대로.
          </p>
        </div>
        <Link to="/host/venues/new" className={styles.headCta}>
          <Button variant="gold" size="lg">
            + 공간 등록
          </Button>
        </Link>
      </header>

      {pending.length > 0 && (
        <section className={`container ${styles.section}`}>
          <h2 className={styles.h2}>
            섭외 요청 <span className={styles.count}>{pending.length}건 대기</span>
          </h2>
          <div className={styles.inbox}>
            {pending.map((b) => (
              <RequestRow key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}

      <section className={`container ${styles.section}`}>
        <h2 className={styles.h2}>내 공간</h2>
        {!venues || venues.length === 0 ? (
          <EmptyState
            emoji="🏠"
            title="아직 등록한 공간이 없어요"
            description="카페·와인바·루프탑을 등록하면, 비는 시간에 직접 모임을 열거나 다른 호스트의 섭외를 받을 수 있어요."
            action={
              <Link to="/host/venues/new">
                <Button variant="primary" size="lg">
                  공간 등록하기
                </Button>
              </Link>
            }
          />
        ) : (
          <div className={styles.venues}>
            {venues.map((v) => (
              <OwnedVenueCard key={v.id} venue={v} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function RequestRow({ booking }: { booking: VenueBooking }) {
  const decide = useDecideBooking()
  const toast = useToast()
  const d = new Date(booking.startAt)
  const when = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}시`

  const act = async (action: 'confirm' | 'decline') => {
    try {
      await decide.mutateAsync({ id: booking.id, action })
      toast.show(action === 'confirm' ? '섭외를 확정했어요 🎉' : '요청을 거절했어요', 'info')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <article className={styles.req}>
      <div className={styles.reqInfo}>
        <div className={styles.reqTop}>
          <strong>{booking.requesterNickname ?? '호스트'}님의 섭외</strong>
          <span className={styles.reqNew}>NEW</span>
        </div>
        <p className={styles.reqMeta}>
          <span>{booking.venueName}</span>
          <span className={styles.dot}>·</span>
          <span>{when}</span>
          <span className={styles.dot}>·</span>
          <span>{booking.partySize}명</span>
          <span className={styles.dot}>·</span>
          <span className={styles.price}>{formatKRW(booking.totalKRW)}</span>
        </p>
        {booking.noteToOwner && <p className={styles.reqNote}>💬 {booking.noteToOwner}</p>}
      </div>
      <div className={styles.reqActions}>
        <Button
          size="sm"
          variant="primary"
          isLoading={decide.isPending}
          onClick={() => act('confirm')}
        >
          확정
        </Button>
        <Button size="sm" variant="ghost" onClick={() => act('decline')}>
          거절
        </Button>
      </div>
    </article>
  )
}

function OwnedVenueCard({ venue }: { venue: OwnedVenue }) {
  const [open, setOpen] = useState(false)
  return (
    <article className={styles.vCard}>
      <div className={styles.vMain}>
        <div className={styles.vThumb}>
          {venue.photos[0] ? <img src={venue.photos[0]} alt="" loading="lazy" /> : '🏛️'}
        </div>
        <div className={styles.vBody}>
          <div className={styles.vHead}>
            <strong>{venue.name}</strong>
            {venue.instantBook && (
              <Badge tone="gold" size="sm">
                즉시예약
              </Badge>
            )}
          </div>
          <p className={styles.vMeta}>
            {venue.area} · 최대 {venue.capacity}명 · 시간당 {formatKRW(venue.pricePerHourKRW)}
          </p>
          <div className={styles.vStats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>예정 파티</span>
              <span className={styles.statValue}>{venue.upcomingParties}</span>
            </div>
            <div className={`${styles.stat} ${venue.pendingRequests > 0 ? styles.statHot : ''}`}>
              <span className={styles.statLabel}>대기 요청</span>
              <span className={styles.statValue}>{venue.pendingRequests}</span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.vActions}>
        <Button size="sm" variant={open ? 'primary' : 'soft'} onClick={() => setOpen((o) => !o)}>
          {open ? '닫기' : '유휴 시간 → 파티'}
        </Button>
        <span className={styles.vSpacer} />
        <Link to={`/host/venues/new?edit=${venue.id}`}>
          <Button size="sm" variant="ghost">
            수정
          </Button>
        </Link>
      </div>
      {open && <OffHoursList venueId={venue.id} venueName={venue.name} cap={venue.capacity} />}
    </article>
  )
}

function OffHoursList({
  venueId,
  venueName,
  cap,
}: {
  venueId: string
  venueName: string
  cap: number
}) {
  const { data, isLoading } = useVenueAvailability(venueId)
  if (isLoading) return <p className={styles.loadingMini}>유휴 시간 분석 중…</p>
  const slots = data?.offHours ?? []
  if (slots.length === 0) return <p className={styles.loadingMini}>제안할 유휴 시간이 없어요.</p>
  return (
    <div className={styles.offHours}>
      <p className={styles.offHint}>
        ✨ 비는 시간을 원탭으로 파티로. 카테고리·정원·메뉴가 자동 채워져요.
      </p>
      {slots.slice(0, 4).map((s) => (
        <OffHoursRow key={s.startAt} slot={s} venueId={venueId} venueName={venueName} cap={cap} />
      ))}
    </div>
  )
}

function OffHoursRow({
  slot,
  venueId,
  cap,
}: {
  slot: OffHoursSlot
  venueId: string
  venueName: string
  cap: number
}) {
  const s = new Date(slot.startAt)
  const e = new Date(slot.endAt)
  const when = `${s.getMonth() + 1}/${s.getDate()} ${s.getHours()}:00–${e.getHours()}:00`
  const href = `/host/create?venueId=${venueId}&startAt=${encodeURIComponent(slot.startAt)}&endAt=${encodeURIComponent(slot.endAt)}&maxParticipants=${Math.min(cap, slot.suggestedCapacity)}`
  return (
    <div className={styles.ohRow}>
      <div className={styles.ohInfo}>
        <strong>{slot.label}</strong>
        <span className={styles.ohWhen}>
          {when} · 추천 {slot.suggestedCapacity}명 ·{' '}
          <span className={styles.ohPrice}>{formatKRW(slot.quote.totalKRW)}</span>
        </span>
      </div>
      <Link to={href}>
        <Button size="sm" variant="gold">
          파티 열기
        </Button>
      </Link>
    </div>
  )
}
