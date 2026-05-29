/**
 * MSW 인메모리 데이터셋. 백엔드 시드와 비슷한 구성이지만 단순화된 mock.
 * VITE_USE_MSW=true 일 때만 활성화.
 */
import type { Party, PartySummary, Venue, MenuItem, QuestionCard, User } from '@rotifolk/shared'

const now = new Date()
const inDays = (d: number, h = 19) => {
  const t = new Date(now)
  t.setDate(t.getDate() + d)
  t.setHours(h, 30, 0, 0)
  return t.toISOString()
}

const defaultVenueFields = {
  instantBook: false,
  cleaningFeeKRW: 0,
  minHours: 2,
  openMinute: 660,
  closeMinute: 1380,
  closedWeekdays: [],
  weekendMultiplier: 1,
  peakMultiplier: 1,
  arrivalGuide: null,
  vibeTags: [],
  useCases: [],
  hostBlurb: null,
  selfHostEnabled: true,
  ownerId: null,
} satisfies Pick<
  Venue,
  | 'instantBook'
  | 'cleaningFeeKRW'
  | 'minHours'
  | 'openMinute'
  | 'closeMinute'
  | 'closedWeekdays'
  | 'weekendMultiplier'
  | 'peakMultiplier'
  | 'arrivalGuide'
  | 'vibeTags'
  | 'useCases'
  | 'hostBlurb'
  | 'selfHostEnabled'
  | 'ownerId'
>

const defaultPartyConfig = {
  format: 'rotation',
  rotationFormat: 'one-on-one',
  groupSize: 2,
  matchScope: 'mutual-only',
  maxMatchesPerPerson: 3,
  connectionMode: 'chat',
  groupAfterParty: false,
  enableNotes: true,
  noteDelivery: 'party-end',
  enableConversationKit: true,
} satisfies Pick<
  Party['config'],
  | 'format'
  | 'rotationFormat'
  | 'groupSize'
  | 'matchScope'
  | 'maxMatchesPerPerson'
  | 'connectionMode'
  | 'groupAfterParty'
  | 'enableNotes'
  | 'noteDelivery'
  | 'enableConversationKit'
>

export const mockUsers: User[] = [
  {
    id: 'u_host',
    email: 'host@rotifolk.dev',
    nickname: '소믈리에 도이',
    role: 'host',
    avatarId: 'a_host',
    bio: '와인과 사람을 잇는 호스트.',
    gender: 'female',
    birthYear: 1992,
    interests: ['wine', 'travel'],
    mbti: 'ENFP',
    trustScore: 92,
    hostedCount: 14,
    joinedCount: 0,
    isVerified: true,
    shareContact: false,
    verifiedFields: [],
    visibility: {},
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'u_w1',
    email: 'w1@rotifolk.dev',
    nickname: '윤슬',
    role: 'host',
    avatarId: 'a_w1',
    bio: null,
    gender: 'female',
    birthYear: 1995,
    interests: ['wine', 'art'],
    mbti: 'INFJ',
    trustScore: 60,
    hostedCount: 0,
    joinedCount: 3,
    isVerified: false,
    shareContact: false,
    verifiedFields: [],
    visibility: {},
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
]

export const mockVenues: Venue[] = [
  {
    id: 'v_wine',
    name: '루즈 셀러 (MOCK)',
    kind: 'wine-bar',
    area: '한남동',
    address: '서울 용산구 한남대로 1',
    lat: null,
    lng: null,
    capacity: 18,
    pricePerHourKRW: 120_000,
    amenities: ['글래스 무료', '루프탑'],
    partnered: true,
    description: 'MSW 데이터로 동작하는 와인바.',
    photos: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=900'],
    contactPhone: null,
    rating: 4.7,
    reviewCount: 32,
    ...defaultVenueFields,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'v_cafe',
    name: '오후의 카페 5510 (MOCK)',
    kind: 'cafe',
    area: '연남동',
    address: '서울 마포구 동교로 22',
    lat: null,
    lng: null,
    capacity: 12,
    pricePerHourKRW: 60_000,
    amenities: ['스페셜티 커피'],
    partnered: true,
    description: '6종 시음 코스.',
    photos: ['https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=900'],
    contactPhone: null,
    rating: 4.6,
    reviewCount: 18,
    ...defaultVenueFields,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'v_whisky',
    name: '미드나잇 위스키 라운지 (MOCK)',
    kind: 'whisky-bar',
    area: '강남',
    address: '서울 강남구 신사동 100',
    lat: null,
    lng: null,
    capacity: 20,
    pricePerHourKRW: 180_000,
    amenities: ['위스키 50종', '프라이빗'],
    partnered: true,
    description: '무제한 페어링 데모.',
    photos: ['https://images.unsplash.com/photo-1582819509237-d6b13f681c25?w=900'],
    contactPhone: null,
    rating: 4.9,
    reviewCount: 51,
    ...defaultVenueFields,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
]

export const mockMenus: Record<string, MenuItem[]> = {
  v_wine: [
    {
      id: 'm_w1',
      venueId: 'v_wine',
      kind: 'drink',
      name: '나파 카베르네',
      description: null,
      priceKRW: 16_000,
      availability: 'paid',
      coursePosition: null,
      perPersonLimit: null,
      imageUrl: null,
      isAvailable: true,
    },
    {
      id: 'm_w2',
      venueId: 'v_wine',
      kind: 'drink',
      name: '루아르 슈냉블랑',
      description: null,
      priceKRW: 14_000,
      availability: 'paid',
      coursePosition: null,
      perPersonLimit: null,
      imageUrl: null,
      isAvailable: true,
    },
    {
      id: 'm_w3',
      venueId: 'v_wine',
      kind: 'snack',
      name: '치즈 보드',
      description: null,
      priceKRW: 26_000,
      availability: 'paid',
      coursePosition: null,
      perPersonLimit: null,
      imageUrl: null,
      isAvailable: true,
    },
  ],
  v_cafe: [
    {
      id: 'm_c1',
      venueId: 'v_cafe',
      kind: 'drink',
      name: '에티오피아 코케',
      description: null,
      priceKRW: 0,
      availability: 'course',
      coursePosition: 1,
      perPersonLimit: null,
      imageUrl: null,
      isAvailable: true,
    },
    {
      id: 'm_c2',
      venueId: 'v_cafe',
      kind: 'drink',
      name: '콜롬비아 게이샤',
      description: null,
      priceKRW: 0,
      availability: 'course',
      coursePosition: 2,
      perPersonLimit: null,
      imageUrl: null,
      isAvailable: true,
    },
    {
      id: 'm_c3',
      venueId: 'v_cafe',
      kind: 'dessert',
      name: '카눌레',
      description: null,
      priceKRW: 5_500,
      availability: 'paid',
      coursePosition: null,
      perPersonLimit: null,
      imageUrl: null,
      isAvailable: true,
    },
  ],
  v_whisky: [
    {
      id: 'm_k1',
      venueId: 'v_whisky',
      kind: 'drink',
      name: '글렌피딕 12',
      description: null,
      priceKRW: 0,
      availability: 'unlimited',
      coursePosition: null,
      perPersonLimit: null,
      imageUrl: null,
      isAvailable: true,
    },
    {
      id: 'm_k2',
      venueId: 'v_whisky',
      kind: 'drink',
      name: '오반 14',
      description: null,
      priceKRW: 0,
      availability: 'unlimited',
      coursePosition: null,
      perPersonLimit: null,
      imageUrl: null,
      isAvailable: true,
    },
    {
      id: 'm_k3',
      venueId: 'v_whisky',
      kind: 'snack',
      name: '다크초콜릿',
      description: null,
      priceKRW: 0,
      availability: 'course',
      coursePosition: 1,
      perPersonLimit: null,
      imageUrl: null,
      isAvailable: true,
    },
  ],
}

function partyFrom(
  overrides: Partial<Party> & Pick<Party, 'id' | 'title' | 'venueId' | 'config' | 'pricing'>,
): Party {
  return {
    description: '',
    hostId: 'u_host',
    coverImageUrl: null,
    startAt: inDays(5),
    endAt: inDays(5, 21),
    minParticipants: 6,
    maxParticipants: 12,
    currentParticipants: 0,
    status: 'open',
    tags: [],
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
    ageMin: null,
    ageMax: null,
    genderRatio: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  } as Party
}

export const mockParties: Party[] = [
  partyFrom({
    id: 'p_wine',
    title: '[MOCK] 한남 루프탑 와인 5:5 로테이션',
    description: 'MSW 모드로 동작하는 데모 파티. 백엔드 없이 실제 시나리오 검증.',
    venueId: 'v_wine',
    coverImageUrl: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=1200',
    currentParticipants: 8,
    genderRatio: '5:5',
    tags: ['#MOCK', '#와인', '#5:5'],
    config: {
      category: 'wine',
      rotationMode: 'round-robin-pair',
      roundDurationSec: 300,
      totalRounds: 5,
      breakBetweenRoundsSec: 30,
      enableMidMatching: true,
      enableFinalMatching: true,
      enableQuiz: true,
      enableQuestionCards: true,
      enableLiveOrders: true,
      enableAvatarOnly: false,
      ...defaultPartyConfig,
    },
    pricing: {
      basePriceKRW: 18_000,
      drinkPackage: 'per-glass',
      snackPackage: 'per-plate',
      refundDeadlineHours: 24,
    },
  }),
  partyFrom({
    id: 'p_coffee',
    title: '[MOCK] 연남 스페셜티 6종 코스',
    description: '커피는 코스 패키지에 포함. 디저트만 별도 결제.',
    venueId: 'v_cafe',
    coverImageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200',
    currentParticipants: 5,
    tags: ['#MOCK', '#커피', '#코스'],
    config: {
      category: 'coffee',
      rotationMode: 'round-robin-trio',
      roundDurationSec: 360,
      totalRounds: 5,
      breakBetweenRoundsSec: 60,
      enableMidMatching: true,
      enableFinalMatching: true,
      enableQuiz: true,
      enableQuestionCards: true,
      enableLiveOrders: true,
      enableAvatarOnly: true,
      ...defaultPartyConfig,
    },
    pricing: {
      basePriceKRW: 32_000,
      drinkPackage: 'paired',
      snackPackage: 'pairing-bites',
      refundDeadlineHours: 24,
    },
  }),
  partyFrom({
    id: 'p_whisky',
    title: '[MOCK] 미드나잇 위스키 무제한',
    description: '6종 위스키 무제한 + 다크초콜릿 코스. 5:5 이성 매칭.',
    venueId: 'v_whisky',
    coverImageUrl: 'https://images.unsplash.com/photo-1582819509237-d6b13f681c25?w=1200',
    currentParticipants: 6,
    genderRatio: '5:5',
    tags: ['#MOCK', '#위스키', '#무제한'],
    config: {
      category: 'whisky',
      rotationMode: 'speed-circle',
      roundDurationSec: 420,
      totalRounds: 5,
      breakBetweenRoundsSec: 90,
      enableMidMatching: true,
      enableFinalMatching: true,
      enableQuiz: true,
      enableQuestionCards: true,
      enableLiveOrders: true,
      enableAvatarOnly: false,
      ...defaultPartyConfig,
    },
    pricing: {
      basePriceKRW: 88_000,
      drinkPackage: 'unlimited',
      snackPackage: 'course',
      refundDeadlineHours: 24,
    },
  }),
]

export function toSummary(p: Party): PartySummary {
  const v = mockVenues.find((vv) => vv.id === p.venueId)
  return {
    id: p.id,
    title: p.title,
    coverImageUrl: p.coverImageUrl,
    startAt: p.startAt,
    currentParticipants: p.currentParticipants,
    maxParticipants: p.maxParticipants,
    status: p.status,
    tags: p.tags,
    category: p.config.category,
    format: p.config.format,
    venueName: v?.name ?? '',
    venueArea: v?.area ?? '',
    basePriceKRW: p.pricing.basePriceKRW,
    drinkPackage: p.pricing.drinkPackage,
    snackPackage: p.pricing.snackPackage,
    hostId: p.hostId,
    hostNickname: '',
  }
}

export const mockCards: QuestionCard[] = [
  {
    id: 'qc1',
    partyId: null,
    depth: 'icebreaker',
    prompt: '오늘 첫 잔을 들기 직전, 어떤 기분이에요?',
    category: null,
    language: 'ko',
    usedCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'qc2',
    partyId: null,
    depth: 'casual',
    prompt: '나만의 회복 루틴은?',
    category: null,
    language: 'ko',
    usedCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'qc3',
    partyId: null,
    depth: 'deeper',
    prompt: '오래 두고 싶은 관계의 조건은?',
    category: null,
    language: 'ko',
    usedCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
]

export const MOCK_TOKEN = 'msw-mock-jwt-token'
