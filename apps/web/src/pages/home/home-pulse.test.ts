import { describe, expect, it } from 'vitest'

import { buildHomePulse } from './home-pulse'

import type { PartySummary } from '@rotifolk/shared'

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

  it('"다음 라운드"는 과거 파티를 건너뛰고 가장 이른 미래 파티를 고른다', () => {
    const now = Date.parse('2026-06-12T00:00:00.000Z')
    const past = { ...base, id: 'past', startAt: '2026-06-06T10:00:00.000Z' }
    const soon = { ...base, id: 'soon', startAt: '2026-06-13T10:00:00.000Z' }
    const later = { ...base, id: 'later', startAt: '2026-06-20T10:00:00.000Z' }

    const pulse = buildHomePulse({ openParties: [later, past, soon], liveParties: [] }, now)
    expect(pulse.nextParty?.id).toBe('soon')
  })

  it('미래 파티가 없으면 가장 이른 파티로 폴백한다', () => {
    const now = Date.parse('2026-06-12T00:00:00.000Z')
    const older = { ...base, id: 'older', startAt: '2026-06-01T10:00:00.000Z' }
    const newer = { ...base, id: 'newer', startAt: '2026-06-06T10:00:00.000Z' }

    const pulse = buildHomePulse({ openParties: [newer, older], liveParties: [] }, now)
    expect(pulse.nextParty?.id).toBe('older')
  })
})
