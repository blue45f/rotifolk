import { describe, expect, it } from 'vitest'
import { VenueRecommendQuerySchema } from './venue-booking.schema'

describe('VenueRecommendQuerySchema', () => {
  it('rejects reversed time ranges', () => {
    const result = VenueRecommendQuerySchema.safeParse({
      category: 'wine',
      partySize: 4,
      startAt: '2026-06-05T20:00:00+09:00',
      endAt: '2026-06-05T19:00:00+09:00',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'endAt')).toBe(true)
    }
  })

  it('requires both lat and lng together', () => {
    const result = VenueRecommendQuerySchema.safeParse({
      category: 'wine',
      partySize: 4,
      lat: '37.5',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'lng')).toBe(true)
    }
  })

  it('accepts valid bounds and query payload', () => {
    const result = VenueRecommendQuerySchema.safeParse({
      category: 'coffee',
      partySize: 12,
      lat: '37.5',
      lng: '127.0',
      maxBudgetKRW: '50000',
      area: '연남동',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.lat).toBe(37.5)
      expect(result.data.lng).toBe(127)
      expect(result.data.maxBudgetKRW).toBe(50_000)
    }
  })
})
