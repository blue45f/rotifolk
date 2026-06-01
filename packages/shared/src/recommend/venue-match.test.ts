import { describe, expect, it } from 'vitest'
import type { Venue } from '../domain/venue'
import { recommendVenues } from './venue-match'
import type { VenueBrief } from '../domain/venue-booking'

const baseVenue: Venue = {
  id: 'v-base',
  name: '기준 공간',
  kind: 'wine-bar',
  area: '홍대',
  address: '서울 마포구',
  lat: null,
  lng: null,
  capacity: 10,
  pricePerHourKRW: 150_000,
  amenities: [],
  partnered: true,
  description: '',
  photos: [],
  contactPhone: null,
  rating: 4.6,
  reviewCount: 120,
  instantBook: true,
  cleaningFeeKRW: 20_000,
  minHours: 2,
  openMinute: 600,
  closeMinute: 1440,
  closedWeekdays: [],
  weekendMultiplier: 1.2,
  peakMultiplier: 1.5,
  arrivalGuide: null,
  vibeTags: [],
  useCases: [],
  hostBlurb: null,
  selfHostEnabled: true,
  ownerId: 'u-test',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function venue(id: string, overrides: Partial<Venue> = {}): Venue {
  return {
    ...baseVenue,
    id,
    name: `공간 ${id}`,
    ...overrides,
  }
}

describe('recommendVenues', () => {
  it('keeps explicit availability ahead of unspecified availability when scores match', () => {
    const brief: VenueBrief = { category: 'wine', partySize: 4 }
    const recs = recommendVenues(
      [
        venue('v-unknown', { lat: 37.0, lng: 127.0 }),
        venue('v-available', { lat: 37.0, lng: 127.0 }),
      ],
      brief,
      {
        availabilityByVenue: { 'v-available': true },
      },
    )

    expect(recs).toHaveLength(2)
    expect(recs[0].venue.id).toBe('v-available')
    expect(recs[0].available).toBe(true)
    expect(recs[1].venue.id).toBe('v-unknown')
    expect(recs[1].available).toBeUndefined()
  })

  it('attaches a computed quote only when time range is provided', () => {
    const briefWithTime: VenueBrief = {
      category: 'wine',
      partySize: 4,
      startAt: '2026-06-07T19:00:00+09:00',
      endAt: '2026-06-07T22:00:00+09:00',
    }
    const briefNoTime: VenueBrief = { category: 'wine', partySize: 4 }

    const withTime = recommendVenues([venue('with-time')], briefWithTime)
    const withoutTime = recommendVenues([venue('without-time')], briefNoTime)

    expect(withTime[0].quote).not.toBeNull()
    expect(withoutTime[0].quote).toBeNull()
  })

  it('adds distance-sensitive score and keeps it within 0~100', () => {
    const [near, far] = recommendVenues(
      [venue('near', { lat: 37.0, lng: 127.0 }), venue('far', { lat: 38.0, lng: 127.0 })],
      {
        category: 'wine',
        partySize: 4,
        lat: 37.001,
        lng: 127.001,
      },
    )

    expect(near.venue.id).toBe('near')
    expect(near.fit.score).toBeGreaterThan(far.fit.score)
    expect(near.fit.score).toBeGreaterThanOrEqual(0)
    expect(near.fit.score).toBeLessThanOrEqual(100)
  })
})
