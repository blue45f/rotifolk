import { describe, expect, it } from 'vitest'

import { suggestOffHoursSlots } from './off-hours'

import type { Venue } from '../domain/venue'

const venue: Venue = {
  id: 'v1',
  name: '테스트 카페',
  kind: 'cafe',
  area: '연남동',
  address: '서울 마포구',
  lat: null,
  lng: null,
  capacity: 16,
  pricePerHourKRW: 80_000,
  amenities: [],
  partnered: false,
  description: null,
  photos: [],
  contactPhone: null,
  rating: 0,
  reviewCount: 0,
  instantBook: true,
  cleaningFeeKRW: 10_000,
  minHours: 3,
  openMinute: 11 * 60,
  closeMinute: 21 * 60, // 21:00 마감 → 마감 후 슬롯 생성 대상
  closedWeekdays: [1], // 월요일 휴무
  weekendMultiplier: 1.2,
  peakMultiplier: 1.4,
  arrivalGuide: null,
  vibeTags: [],
  useCases: [],
  hostBlurb: null,
  selfHostEnabled: true,
  ownerId: 'u1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('suggestOffHoursSlots', () => {
  it('월요일 휴무일에 통째 비는 슬롯을 제안한다', () => {
    const slots = suggestOffHoursSlots(venue, {
      fromDate: '2026-06-07T00:00:00+09:00', // 일요일
      now: '2026-06-01T00:00:00+09:00',
      days: 3, // 일/월/화
    })
    expect(slots.length).toBeGreaterThan(0)
    expect(slots.some((s) => s.kind === 'closed-day')).toBe(true)
    for (const s of slots) {
      expect(new Date(s.endAt).getTime()).toBeGreaterThan(new Date(s.startAt).getTime())
      expect(s.quote.totalKRW).toBeGreaterThan(0)
    }
  })

  it('busy 구간과 겹치는 후보는 제외한다', () => {
    const all = suggestOffHoursSlots(venue, {
      fromDate: '2026-06-08T00:00:00+09:00', // 월요일(휴무)
      now: '2026-06-01T00:00:00+09:00',
      days: 1,
    })
    expect(all.length).toBe(1)
    const filtered = suggestOffHoursSlots(venue, {
      fromDate: '2026-06-08T00:00:00+09:00',
      now: '2026-06-01T00:00:00+09:00',
      days: 1,
      busy: [{ startAt: '2026-06-08T10:00:00+09:00', endAt: '2026-06-08T23:00:00+09:00' }],
    })
    expect(filtered.length).toBe(0)
  })
})
