import { describe, expect, it } from 'vitest'
import type { PartySummary } from '@rotifolk/shared'
import { buildHomePulse } from './home-pulse'

const base: PartySummary = {
  id: 'p1',
  title: '한남 와인 로테이션',
  coverImageUrl: null,
  startAt: '2026-06-01T10:00:00.000Z',
  currentParticipants: 6,
  maxParticipants: 10,
  status: 'open',
  tags: ['와인'],
  maritalRequirement: [],
  childrenPolicy: 'any',
  category: 'wine',
  format: 'rotation',
  venueName: '루즈 셀러',
  venueArea: '한남',
  basePriceKRW: 49000,
  drinkPackage: 'paired',
  snackPackage: 'pairing-bites',
  hostId: 'u_host',
  hostNickname: '로티',
}

describe('buildHomePulse', () => {
  it('summarizes live and open parties from API data', () => {
    const pulse = buildHomePulse({
      openParties: [base, { ...base, id: 'p2', category: 'coffee', currentParticipants: 8 }],
      liveParties: [{ ...base, id: 'live_1', status: 'live', currentParticipants: 10 }],
    })

    expect(pulse.liveCount).toBe(1)
    expect(pulse.openCount).toBe(2)
    expect(pulse.averageFillRate).toBe(80)
    expect(pulse.leadingCategory?.category).toBe('wine')
  })

  it('keeps empty states deterministic', () => {
    const pulse = buildHomePulse({ openParties: [], liveParties: [] })

    expect(pulse.liveCount).toBe(0)
    expect(pulse.openCount).toBe(0)
    expect(pulse.averageFillRate).toBe(0)
    expect(pulse.nextParty).toBeNull()
    expect(pulse.leadingCategory).toBeNull()
  })
})
