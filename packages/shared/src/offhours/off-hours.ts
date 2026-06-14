import { quoteVenueBooking } from '../pricing/venue-pricing'

import type { Venue } from '../domain/venue'
import type { OffHoursKind, OffHoursSlot, VenueBusyRange } from '../domain/venue-booking'

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']
const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 86_400_000
// 공간의 영업시간/휴무/라벨은 모두 한국 현지(KST, UTC+9) 기준이므로
// 슬롯 생성도 KST에 고정해야 실행 환경(TZ)과 무관하게 결정적이다.
const KST_OFFSET_MS = 9 * MS_PER_HOUR

/** 주어진 instant가 속한 KST 캘린더 날짜의 자정(00:00 KST)을 UTC instant로 반환. */
function kstMidnight(instant: Date): Date {
  const shifted = instant.getTime() + KST_OFFSET_MS
  const dayStart = Math.floor(shifted / MS_PER_DAY) * MS_PER_DAY
  return new Date(dayStart - KST_OFFSET_MS)
}

/** KST 기준 요일(0=일 ~ 6=토). */
function kstWeekday(kstMidnightInstant: Date): number {
  return new Date(kstMidnightInstant.getTime() + KST_OFFSET_MS).getUTCDay()
}

/** KST 자정 instant에서 그 날 minute(분)에 해당하는 instant. */
function atMinuteOfDay(kstMidnightInstant: Date, minute: number): Date {
  return new Date(kstMidnightInstant.getTime() + minute * 60_000)
}

function overlapsBusy(start: Date, end: Date, busy: VenueBusyRange[]): boolean {
  return busy.some(
    (b) =>
      new Date(b.startAt).getTime() < end.getTime() && new Date(b.endAt).getTime() > start.getTime()
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

  const firstDay = kstMidnight(from)
  for (let i = 0; i < days; i++) {
    const day = new Date(firstDay.getTime() + i * MS_PER_DAY)
    const dow = kstWeekday(day)
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
