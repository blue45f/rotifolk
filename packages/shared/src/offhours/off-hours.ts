import type { Venue } from '../domain/venue'
import type { OffHoursKind, OffHoursSlot, VenueBusyRange } from '../domain/venue-booking'
import { quoteVenueBooking } from '../pricing/venue-pricing'

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']
const MS_PER_HOUR = 3_600_000

function atMinuteOfDay(day: Date, minute: number): Date {
  const d = new Date(day)
  d.setHours(0, 0, 0, 0)
  return new Date(d.getTime() + minute * 60_000)
}

function overlapsBusy(start: Date, end: Date, busy: VenueBusyRange[]): boolean {
  return busy.some(
    (b) =>
      new Date(b.startAt).getTime() < end.getTime() &&
      new Date(b.endAt).getTime() > start.getTime(),
  )
}

export interface OffHoursOptions {
  fromDate?: Date | string
  days?: number
  now?: Date | string
  busy?: VenueBusyRange[]
  durationHours?: number
  limit?: number
}

/**
 * 사장님 공간의 "유휴 시간 → 파티" 후보 슬롯을 만든다 (offhours 참고).
 * - 정기 휴무일: 통째로 비어있는 오후
 * - 마감 후: 영업 종료 직후 야간 (22시 이전 마감 매장)
 * - 주말 한가한 오후
 * 이미 잡힌 파티/예약(busy)과 겹치면 제외한다.
 */
export function suggestOffHoursSlots(venue: Venue, opts: OffHoursOptions = {}): OffHoursSlot[] {
  const days = opts.days ?? 12
  const durationHours = opts.durationHours ?? Math.max(2, venue.minHours)
  const now = opts.now ? new Date(opts.now) : new Date()
  const from = opts.fromDate ? new Date(opts.fromDate) : now
  const busy = opts.busy ?? []
  const suggestedCapacity = Math.max(4, Math.round(venue.capacity * 0.8))
  const out: OffHoursSlot[] = []

  for (let i = 0; i < days; i++) {
    const day = new Date(from)
    day.setDate(from.getDate() + i)
    day.setHours(0, 0, 0, 0)
    const dow = day.getDay()
    const closed = venue.closedWeekdays.includes(dow)
    const weekend = dow === 0 || dow === 6

    const candidates: Array<{ kind: OffHoursKind; startMin: number; label: string }> = []
    if (closed) {
      candidates.push({
        kind: 'closed-day',
        startMin: 13 * 60,
        label: `${WEEKDAY_KO[dow]}요일 정기휴무 · 통째로 비어요`,
      })
    } else {
      if (venue.closeMinute <= 22 * 60) {
        const hh = Math.floor(venue.closeMinute / 60)
        candidates.push({
          kind: 'after-close',
          startMin: venue.closeMinute,
          label: `${WEEKDAY_KO[dow]}요일 마감 후 (${hh}시~)`,
        })
      }
      if (weekend) {
        candidates.push({
          kind: 'daytime-gap',
          startMin: 14 * 60,
          label: `${WEEKDAY_KO[dow]}요일 한가한 오후`,
        })
      }
    }

    for (const c of candidates) {
      const start = atMinuteOfDay(day, c.startMin)
      const end = new Date(start.getTime() + durationHours * MS_PER_HOUR)
      if (start.getTime() <= now.getTime()) continue
      if (overlapsBusy(start, end, busy)) continue
      out.push({
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        kind: c.kind,
        label: c.label,
        suggestedCapacity,
        quote: quoteVenueBooking(venue, start, end, { now }),
      })
    }
  }

  out.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  return typeof opts.limit === 'number' ? out.slice(0, opts.limit) : out.slice(0, 8)
}
