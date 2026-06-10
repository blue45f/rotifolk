import { describe, expect, it } from 'vitest'
import type { Party } from '@rotifolk/shared'
import { buildPartyEventJsonLd } from './partyEventJsonLd'

const PAGE_URL = 'https://rotifolk.vercel.app/parties/p1'

const baseParty: Party = {
  id: 'p1',
  title: '한남 내추럴 와인 로테이션',
  description: '모르는 사람들이 5분 라운드로 친해지는 와인 모임',
  hostId: 'u_host',
  host: {
    id: 'u_host',
    nickname: '로티',
    avatarId: null,
    bio: null,
    mbti: null,
    interests: [],
    trustScore: 90,
    isVerified: true,
    verifiedFields: [],
  },
  venueId: 'v1',
  coverImageUrl: null,
  startAt: '2026-07-01T10:00:00.000Z',
  endAt: '2026-07-01T13:00:00.000Z',
  minParticipants: 6,
  maxParticipants: 12,
  currentParticipants: 6,
  status: 'open',
  config: {
    category: 'natural-wine',
    rotationMode: 'round-robin-pair',
    roundDurationSec: 300,
    totalRounds: 5,
    breakBetweenRoundsSec: 30,
    enableMidMatching: true,
    enableFinalMatching: true,
    enableQuiz: false,
    enableQuestionCards: true,
    enableLiveOrders: false,
    enableAvatarOnly: false,
    format: 'rotation',
    rotationFormat: 'one-on-one',
    groupSize: 2,
    matchScope: 'mutual-only',
    maxMatchesPerPerson: 3,
    contactExchangePolicy: 'mutual-consent',
    connectionMode: 'chat',
    connectionChannels: ['chat'],
    groupAfterParty: false,
    enableNotes: true,
    noteDelivery: 'party-end',
    enableConversationKit: true,
  },
  pricing: {
    basePriceKRW: 49_000,
    drinkPackage: 'paired',
    snackPackage: 'pairing-bites',
    refundDeadlineHours: 24,
  },
  recruitment: {
    genderRatioTarget: 'any',
    ratioTolerance: 1,
    maleCap: null,
    femaleCap: null,
    minMale: null,
    minFemale: null,
    autoCancelAt: null,
    autoCancelReason: null,
  },
  tags: ['#와인'],
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
}

describe('buildPartyEventJsonLd', () => {
  it('파티 핵심 필드를 schema.org Event(오프라인)로 매핑한다', () => {
    const ld = buildPartyEventJsonLd(baseParty, PAGE_URL)

    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Event')
    expect(ld.name).toBe(baseParty.title)
    expect(ld.url).toBe(PAGE_URL)
    expect(ld.startDate).toBe('2026-07-01T10:00:00.000Z')
    expect(ld.endDate).toBe('2026-07-01T13:00:00.000Z')
    expect(ld.eventAttendanceMode).toBe('https://schema.org/OfflineEventAttendanceMode')
    expect(ld.eventStatus).toBe('https://schema.org/EventScheduled')
    expect(ld.organizer).toEqual({ '@type': 'Person', name: '로티' })
    expect(ld.offers).toEqual({
      '@type': 'Offer',
      price: 49_000,
      priceCurrency: 'KRW',
      url: PAGE_URL,
      availability: 'https://schema.org/InStock',
    })
  })

  it('venue가 있으면 location(Place)을 싣고, 없으면 키 자체를 생략한다', () => {
    const withVenue = buildPartyEventJsonLd(baseParty, PAGE_URL, {
      name: '루즈 셀러',
      address: '서울 용산구 한남동 12-3',
    })
    expect(withVenue.location).toEqual({
      '@type': 'Place',
      name: '루즈 셀러',
      address: '서울 용산구 한남동 12-3',
    })

    const withoutVenue = buildPartyEventJsonLd(baseParty, PAGE_URL)
    expect('location' in withoutVenue).toBe(false)
  })

  it('취소된 파티는 EventCancelled, 정원이 차면 SoldOut으로 표시한다', () => {
    const cancelled = buildPartyEventJsonLd({ ...baseParty, status: 'cancelled' }, PAGE_URL)
    expect(cancelled.eventStatus).toBe('https://schema.org/EventCancelled')

    const full = buildPartyEventJsonLd({ ...baseParty, currentParticipants: 12 }, PAGE_URL)
    expect((full.offers as Record<string, unknown>).availability).toBe('https://schema.org/SoldOut')
  })

  it('커버 이미지가 없으면 같은 origin의 공용 OG 이미지로 폴백한다', () => {
    const fallback = buildPartyEventJsonLd(baseParty, PAGE_URL)
    expect(fallback.image).toBe('https://rotifolk.vercel.app/og.png')

    const cover = buildPartyEventJsonLd(
      { ...baseParty, coverImageUrl: 'https://images.example.com/cover.jpg' },
      PAGE_URL,
    )
    expect(cover.image).toBe('https://images.example.com/cover.jpg')
  })

  it('호스트 닉네임이 없으면 organizer를 생략한다', () => {
    const ld = buildPartyEventJsonLd({ ...baseParty, host: undefined }, PAGE_URL)
    expect('organizer' in ld).toBe(false)
  })
})
