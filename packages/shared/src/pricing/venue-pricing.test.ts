import { describe, expect, it } from 'vitest'

import { lastMinuteDiscountRate, quoteVenueBooking, venueRefundRate } from './venue-pricing'

const baseVenue = {
  pricePerHourKRW: 100_000,
  cleaningFeeKRW: 20_000,
  weekendMultiplier: 1.3,
  peakMultiplier: 1.5,
}

describe('quoteVenueBooking', () => {
  it('computes hours, base and total for a weekday off-peak booking', () => {
    // 화요일 14:00~17:00 (3h), 평일 비피크
    const q = quoteVenueBooking(
      baseVenue,
      '2026-06-02T14:00:00+09:00',
      '2026-06-02T17:00:00+09:00',
      {
        now: '2026-05-01T00:00:00+09:00',
      }
    )
    expect(q.hours).toBe(3)
    expect(q.multiplier).toBe(1)
    expect(q.baseKRW).toBe(300_000)
    expect(q.discountKRW).toBe(0)
    expect(q.cleaningFeeKRW).toBe(20_000)
    expect(q.totalKRW).toBe(320_000)
  })

  it('applies the larger of weekend/peak multiplier, never both', () => {
    // 토요일 19:00~22:00 → 주말(1.3) & 피크(1.5) 동시 → 1.5만 적용
    const q = quoteVenueBooking(
      baseVenue,
      '2026-06-06T19:00:00+09:00',
      '2026-06-06T22:00:00+09:00',
      {
        now: '2026-05-01T00:00:00+09:00',
      }
    )
    expect(q.peakApplied).toBe(true)
    expect(q.weekendApplied).toBe(true)
    expect(q.multiplier).toBe(1.5)
    expect(q.baseKRW).toBe(450_000)
  })

  it('applies last-minute discount when within 3h', () => {
    const q = quoteVenueBooking(
      baseVenue,
      '2026-06-02T14:00:00+09:00',
      '2026-06-02T16:00:00+09:00',
      {
        now: '2026-06-02T11:30:00+09:00', // 2.5h 전 → 10%
      }
    )
    expect(q.lastMinuteRate).toBe(0.1)
    expect(q.discountKRW).toBe(20_000) // 200,000 * 0.1
  })
})

describe('lastMinuteDiscountRate', () => {
  it('tiers by hours-until-start', () => {
    const now = '2026-06-02T12:00:00+09:00'
    expect(lastMinuteDiscountRate('2026-06-02T12:30:00+09:00', now)).toBe(0.15)
    expect(lastMinuteDiscountRate('2026-06-02T14:30:00+09:00', now)).toBe(0.1)
    expect(lastMinuteDiscountRate('2026-06-02T17:00:00+09:00', now)).toBe(0.05)
    expect(lastMinuteDiscountRate('2026-06-03T12:00:00+09:00', now)).toBe(0)
  })
})

describe('venueRefundRate', () => {
  it('tiers by cancellation window', () => {
    const now = '2026-06-01T00:00:00+09:00'
    expect(venueRefundRate('2026-06-10T00:00:00+09:00', now)).toBe(1)
    expect(venueRefundRate('2026-06-04T00:00:00+09:00', now)).toBe(0.5)
    expect(venueRefundRate('2026-06-02T06:00:00+09:00', now)).toBe(0.2)
    expect(venueRefundRate('2026-06-01T06:00:00+09:00', now)).toBe(0)
  })
})
