import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  }),
})

async function createUserWithAvatar(
  data: Parameters<typeof prisma.user.create>[0]['data'],
  avatar: {
    mood: string
    hue: string
    pattern: string
    emojiBadge: string
    faceSeed: string
  },
) {
  const user = await prisma.user.create({ data })
  const av = await prisma.avatar.create({
    data: { ...avatar, ownerId: user.id },
  })
  return prisma.user.update({
    where: { id: user.id },
    data: { avatarId: av.id },
    include: { avatar: true },
  })
}

async function main() {
  await prisma.questionCardDraw.deleteMany()
  await prisma.questionCard.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.quizAnswer.deleteMany()
  await prisma.quizQuestion.deleteMany()
  await prisma.finalMatch.deleteMany()
  await prisma.finalMatchVote.deleteMany()
  await prisma.midMatchVote.deleteMany()
  await prisma.pair.deleteMany()
  await prisma.round.deleteMany()
  await prisma.liveEvent.deleteMany()
  await prisma.participation.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.party.deleteMany()
  await prisma.venue.deleteMany()
  await prisma.avatar.deleteMany()
  await prisma.user.deleteMany()

  const pw = await argon2.hash('rotifolk1234!')

  // ============ Users (5W + 5M + host) ============
  const host = await createUserWithAvatar(
    {
      email: 'host@rotifolk.dev',
      passwordHash: pw,
      nickname: '소믈리에 도이',
      role: 'host',
      gender: 'female',
      bio: '와인과 사람을 잇는 호스트. 5분이면 충분해요.',
      birthYear: 1992,
      interestsJson: JSON.stringify(['wine', 'travel', 'art']),
      mbti: 'ENFP',
      isVerified: true,
      trustScore: 92,
      hostedCount: 14,
    },
    {
      mood: 'sparkling',
      hue: '#7A1F3D',
      pattern: 'gradient',
      emojiBadge: '🍷',
      faceSeed: 'host-doi',
    },
  )

  const femaleSpecs = [
    {
      email: 'w1@rotifolk.dev',
      nickname: '윤슬',
      year: 1995,
      mbti: 'INFJ',
      interests: ['wine', 'art'],
      hue: '#C9627F',
      emoji: '✨',
      mood: 'curious',
    },
    {
      email: 'w2@rotifolk.dev',
      nickname: '안개',
      year: 1994,
      mbti: 'ISFP',
      interests: ['tea', 'books'],
      hue: '#6B8E5A',
      emoji: '🍵',
      mood: 'cozy',
    },
    {
      email: 'w3@rotifolk.dev',
      nickname: '비올라',
      year: 1991,
      mbti: 'INTP',
      interests: ['music', 'jazz'],
      hue: '#6E5BB3',
      emoji: '🎻',
      mood: 'mystery',
    },
    {
      email: 'w4@rotifolk.dev',
      nickname: '버건디',
      year: 1989,
      mbti: 'ENFJ',
      interests: ['wine', 'travel'],
      hue: '#4A0E25',
      emoji: '🌹',
      mood: 'sparkling',
    },
    {
      email: 'w5@rotifolk.dev',
      nickname: '한입',
      year: 1996,
      mbti: 'ESFP',
      interests: ['dessert', 'coffee'],
      hue: '#D4A24C',
      emoji: '🍯',
      mood: 'witty',
    },
  ] as const
  const maleSpecs = [
    {
      email: 'm1@rotifolk.dev',
      nickname: '재즈',
      year: 1990,
      mbti: 'ENTP',
      interests: ['music', 'jazz', 'wine'],
      hue: '#2F7884',
      emoji: '🎷',
      mood: 'witty',
    },
    {
      email: 'm2@rotifolk.dev',
      nickname: '모카',
      year: 1993,
      mbti: 'ISTP',
      interests: ['coffee', 'design'],
      hue: '#6B4226',
      emoji: '☕️',
      mood: 'chill',
    },
    {
      email: 'm3@rotifolk.dev',
      nickname: '오크',
      year: 1988,
      mbti: 'INTJ',
      interests: ['whisky', 'cinema'],
      hue: '#B47433',
      emoji: '🥃',
      mood: 'mystery',
    },
    {
      email: 'm4@rotifolk.dev',
      nickname: '소나기',
      year: 1992,
      mbti: 'ENFP',
      interests: ['wine', 'running'],
      hue: '#7A1F3D',
      emoji: '🌧️',
      mood: 'sparkling',
    },
    {
      email: 'm5@rotifolk.dev',
      nickname: '청량',
      year: 1997,
      mbti: 'ESFJ',
      interests: ['beer', 'board-games'],
      hue: '#C89E2A',
      emoji: '🍺',
      mood: 'cozy',
    },
  ] as const

  const buildUser = async (
    s: (typeof femaleSpecs)[number] | (typeof maleSpecs)[number],
    gender: 'male' | 'female',
  ) =>
    createUserWithAvatar(
      {
        email: s.email,
        passwordHash: pw,
        nickname: s.nickname,
        gender,
        birthYear: s.year,
        mbti: s.mbti,
        interestsJson: JSON.stringify(s.interests),
        joinedCount: 3,
      },
      { mood: s.mood, hue: s.hue, pattern: 'gradient', emojiBadge: s.emoji, faceSeed: s.nickname },
    )
  const W = await Promise.all(femaleSpecs.map((s) => buildUser(s, 'female')))
  const M = await Promise.all(maleSpecs.map((s) => buildUser(s, 'male')))

  // ============ Venues ============
  const venues = await Promise.all([
    prisma.venue.create({
      data: {
        name: '루즈 셀러',
        kind: 'wine-bar',
        area: '한남동',
        address: '서울 용산구 한남대로 1',
        capacity: 18,
        pricePerHourKRW: 120_000,
        partnered: true,
        rating: 4.7,
        reviewCount: 32,
        description: '루프탑 와인바. 6테이블, 라운드 매칭 운영 최적.',
        amenitiesJson: JSON.stringify(['글래스 무료', '주차 가능', '루프탑']),
        photosJson: JSON.stringify([
          'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=900',
        ]),
      },
    }),
    prisma.venue.create({
      data: {
        name: '오후의 카페 5510',
        kind: 'cafe',
        area: '연남동',
        address: '서울 마포구 동교로 22',
        capacity: 12,
        pricePerHourKRW: 60_000,
        partnered: true,
        rating: 4.6,
        reviewCount: 18,
        description: '에스프레소 머신 두 대, 빈 노트 6종 시음 가능.',
        amenitiesJson: JSON.stringify(['스페셜티 커피', '식물 가득', '음악 신청']),
        photosJson: JSON.stringify([
          'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=900',
        ]),
      },
    }),
    prisma.venue.create({
      data: {
        name: '청차원',
        kind: 'tea-house',
        area: '북촌',
        address: '서울 종로구 가회동 12',
        capacity: 10,
        pricePerHourKRW: 80_000,
        partnered: true,
        rating: 4.8,
        reviewCount: 22,
        description: '한옥 다실, 6종 차 비교 시음 패키지.',
        amenitiesJson: JSON.stringify(['좌식', '다도 도구', '한옥']),
        photosJson: JSON.stringify([
          'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=900',
        ]),
      },
    }),
    prisma.venue.create({
      data: {
        name: '미드나잇 위스키 라운지',
        kind: 'whisky-bar',
        area: '강남',
        address: '서울 강남구 신사동 100',
        capacity: 20,
        pricePerHourKRW: 180_000,
        partnered: true,
        rating: 4.9,
        reviewCount: 51,
        description: '한 모금 정원. 위스키 페어링 가이드 동반.',
        amenitiesJson: JSON.stringify(['위스키 50종', '시가룸', '프라이빗']),
        photosJson: JSON.stringify([
          'https://images.unsplash.com/photo-1582819509237-d6b13f681c25?w=900',
        ]),
      },
    }),
  ])

  // ============ Menus — paid / unlimited / course 혼합 ============
  await prisma.menuItem.createMany({
    data: [
      // 루즈 셀러 — 잔당
      {
        venueId: venues[0].id,
        kind: 'drink',
        name: '나파 카베르네',
        priceKRW: 16_000,
        availability: 'paid',
      },
      {
        venueId: venues[0].id,
        kind: 'drink',
        name: '루아르 슈냉블랑',
        priceKRW: 14_000,
        availability: 'paid',
      },
      {
        venueId: venues[0].id,
        kind: 'drink',
        name: '하우스 스파클링',
        priceKRW: 12_000,
        availability: 'paid',
      },
      {
        venueId: venues[0].id,
        kind: 'snack',
        name: '하몽 플레이트',
        priceKRW: 22_000,
        availability: 'paid',
      },
      {
        venueId: venues[0].id,
        kind: 'snack',
        name: '치즈 보드',
        priceKRW: 26_000,
        availability: 'paid',
      },
      {
        venueId: venues[0].id,
        kind: 'drink',
        name: '환영 한 잔 (탄산)',
        priceKRW: 0,
        availability: 'included',
      },
      // 오후의 카페 — 6종 코스 + 추가 잔당
      {
        venueId: venues[1].id,
        kind: 'drink',
        name: '에티오피아 코케',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 1,
      },
      {
        venueId: venues[1].id,
        kind: 'drink',
        name: '콜롬비아 게이샤',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 2,
      },
      {
        venueId: venues[1].id,
        kind: 'drink',
        name: '코스타리카 타라주',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 3,
      },
      {
        venueId: venues[1].id,
        kind: 'drink',
        name: '케냐 AA',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 4,
      },
      {
        venueId: venues[1].id,
        kind: 'drink',
        name: '인도네시아 만델링',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 5,
      },
      {
        venueId: venues[1].id,
        kind: 'drink',
        name: '브라질 세하도',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 6,
      },
      {
        venueId: venues[1].id,
        kind: 'dessert',
        name: '카눌레',
        priceKRW: 5_500,
        availability: 'paid',
      },
      {
        venueId: venues[1].id,
        kind: 'drink',
        name: '에스프레소 토닉',
        priceKRW: 7_500,
        availability: 'paid',
      },
      // 청차원 — 6종 코스
      {
        venueId: venues[2].id,
        kind: 'drink',
        name: '아리산 우롱',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 1,
      },
      {
        venueId: venues[2].id,
        kind: 'drink',
        name: '교쿠로',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 2,
      },
      {
        venueId: venues[2].id,
        kind: 'drink',
        name: '백호 백차',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 3,
      },
      {
        venueId: venues[2].id,
        kind: 'drink',
        name: '봉황단총',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 4,
      },
      {
        venueId: venues[2].id,
        kind: 'snack',
        name: '말차 양갱',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 5,
      },
      {
        venueId: venues[2].id,
        kind: 'snack',
        name: '청차 다식',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 6,
      },
      {
        venueId: venues[2].id,
        kind: 'snack',
        name: '계절 한과',
        priceKRW: 8_000,
        availability: 'paid',
      },
      // 미드나잇 위스키 — 무제한 + 다크초콜릿 코스
      {
        venueId: venues[3].id,
        kind: 'drink',
        name: '글렌피딕 12',
        priceKRW: 0,
        availability: 'unlimited',
      },
      {
        venueId: venues[3].id,
        kind: 'drink',
        name: '오반 14',
        priceKRW: 0,
        availability: 'unlimited',
      },
      {
        venueId: venues[3].id,
        kind: 'drink',
        name: '라프로익 10',
        priceKRW: 0,
        availability: 'unlimited',
      },
      {
        venueId: venues[3].id,
        kind: 'drink',
        name: '글렌리벳 12',
        priceKRW: 0,
        availability: 'unlimited',
      },
      {
        venueId: venues[3].id,
        kind: 'snack',
        name: '다크초콜릿 페어링',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 1,
      },
      {
        venueId: venues[3].id,
        kind: 'snack',
        name: '치즈·올리브 보드',
        priceKRW: 0,
        availability: 'course',
        coursePosition: 2,
      },
      {
        venueId: venues[3].id,
        kind: 'drink',
        name: '프리미엄 추가잔',
        priceKRW: 18_000,
        availability: 'paid',
      },
    ],
  })

  // ============ Parties ============
  const inDays = (d: number) => {
    const t = new Date()
    t.setDate(t.getDate() + d)
    t.setHours(19, 30, 0, 0)
    return t
  }
  const afterHours = (s: Date, h: number) => new Date(s.getTime() + h * 3600 * 1000)

  const wineStart = inDays(5)
  const wineParty = await prisma.party.create({
    data: {
      title: '한남 루프탑 와인 로테이션 vol.12',
      description:
        '5:5 이성 매칭. 6라운드 × 5분. 잔당 결제 — 마음에 드는 와인은 그 자리에서 추가 주문하세요.',
      hostId: host.id,
      venueId: venues[0].id,
      coverImageUrl: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=1200',
      startAt: wineStart,
      endAt: afterHours(wineStart, 2),
      minParticipants: 6,
      maxParticipants: 12,
      status: 'open',
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
      basePriceKRW: 18_000,
      drinkPackage: 'per-glass',
      snackPackage: 'per-plate',
      tagsJson: JSON.stringify(['#와인', '#한남', '#5:5', '#이성매칭']),
      genderRatio: '5:5',
    },
  })

  const coffeeStart = inDays(8)
  const coffeeParty = await prisma.party.create({
    data: {
      title: '연남 스페셜티 6종 블라인드 코스',
      description: '6종 빈 코스 패키지. 호스트가 한 잔씩 따라드려요. 디저트만 추가 결제.',
      hostId: host.id,
      venueId: venues[1].id,
      coverImageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200',
      startAt: coffeeStart,
      endAt: afterHours(coffeeStart, 2),
      minParticipants: 6,
      maxParticipants: 9,
      status: 'open',
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
      basePriceKRW: 32_000,
      drinkPackage: 'paired',
      snackPackage: 'pairing-bites',
      tagsJson: JSON.stringify(['#커피', '#블라인드', '#코스', '#아바타모드']),
    },
  })

  const teaStart = inDays(12)
  const teaParty = await prisma.party.create({
    data: {
      title: '북촌 다실, 차 한 잔의 깊은 대화',
      description: '한옥 다실 6종 차 코스. 다과까지 포함된 풀패키지.',
      hostId: host.id,
      venueId: venues[2].id,
      coverImageUrl: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=1200',
      startAt: teaStart,
      endAt: afterHours(teaStart, 2),
      minParticipants: 4,
      maxParticipants: 8,
      status: 'open',
      category: 'tea',
      rotationMode: 'round-robin-pair',
      roundDurationSec: 480,
      totalRounds: 4,
      breakBetweenRoundsSec: 120,
      enableMidMatching: true,
      enableFinalMatching: true,
      enableQuiz: false,
      enableQuestionCards: true,
      enableLiveOrders: true,
      enableAvatarOnly: false,
      basePriceKRW: 42_000,
      drinkPackage: 'paired',
      snackPackage: 'course',
      tagsJson: JSON.stringify(['#차', '#한옥', '#코스']),
    },
  })

  const whiskyStart = inDays(15)
  await prisma.party.create({
    data: {
      title: '미드나잇 위스키 무제한 페어링',
      description: '6종 싱글몰트 무제한 + 다크초콜릿/치즈 코스. 5:5 이성 매칭.',
      hostId: host.id,
      venueId: venues[3].id,
      coverImageUrl: 'https://images.unsplash.com/photo-1582819509237-d6b13f681c25?w=1200',
      startAt: whiskyStart,
      endAt: afterHours(whiskyStart, 2),
      minParticipants: 6,
      maxParticipants: 10,
      status: 'open',
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
      basePriceKRW: 88_000,
      drinkPackage: 'unlimited',
      snackPackage: 'course',
      tagsJson: JSON.stringify(['#위스키', '#무제한', '#강남', '#5:5']),
      genderRatio: '5:5',
    },
  })

  // 자유 무료 모임 — 일반 사용자가 직접 호스트
  const meetupStart = inDays(3)
  await prisma.party.create({
    data: {
      title: '연남 보드게임 + 커피 첫 모임 (무료)',
      description: '제가 처음 여는 모임이에요. 커피 한 잔 사면서 자유롭게 모여요. 부담 ZERO!',
      hostId: M[4].id,
      venueId: venues[1].id,
      startAt: meetupStart,
      endAt: afterHours(meetupStart, 3),
      minParticipants: 4,
      maxParticipants: 8,
      status: 'open',
      category: 'custom',
      rotationMode: 'random-shuffle',
      roundDurationSec: 600,
      totalRounds: 3,
      breakBetweenRoundsSec: 120,
      enableMidMatching: false,
      enableFinalMatching: false,
      enableQuiz: false,
      enableQuestionCards: true,
      enableLiveOrders: false,
      enableAvatarOnly: false,
      basePriceKRW: 0,
      drinkPackage: 'none',
      snackPackage: 'none',
      tagsJson: JSON.stringify(['#무료', '#보드게임', '#캐주얼']),
    },
  })

  // ============ Participations — wine party는 5:5 풀세팅 ============
  for (let i = 0; i < 5; i++) {
    await prisma.participation.create({
      data: { partyId: wineParty.id, userId: W[i].id, status: 'confirmed', seatNumber: i + 1 },
    })
    await prisma.participation.create({
      data: { partyId: wineParty.id, userId: M[i].id, status: 'confirmed', seatNumber: i + 6 },
    })
  }
  for (let i = 0; i < 3; i++) {
    await prisma.participation.create({
      data: { partyId: coffeeParty.id, userId: W[i].id, status: 'confirmed' },
    })
    await prisma.participation.create({
      data: { partyId: coffeeParty.id, userId: M[i].id, status: 'confirmed' },
    })
  }
  for (let i = 0; i < 4; i++) {
    await prisma.participation.create({
      data: { partyId: teaParty.id, userId: i % 2 === 0 ? W[i].id : M[i].id, status: 'confirmed' },
    })
  }

  // ============ Question Cards ============
  const cards = [
    { depth: 'icebreaker', prompt: '오늘 첫 잔을 들기 직전, 어떤 기분이에요?' },
    { depth: 'icebreaker', prompt: '나를 한 단어로 설명한다면 어떤 단어인가요?' },
    { depth: 'icebreaker', prompt: '최근에 새로 시도한 사소한 변화가 있나요?' },
    { depth: 'icebreaker', prompt: '오늘 가장 좋았던 5분은 언제였어요?' },
    { depth: 'casual', prompt: '내가 의외로 잘 하는 것 한 가지는?' },
    { depth: 'casual', prompt: '여행지에서 꼭 하는 의식이 있다면?' },
    { depth: 'casual', prompt: '나만의 회복 루틴은?' },
    { depth: 'casual', prompt: '오랜 친구가 나를 한 단어로 부른다면?' },
    { depth: 'casual', prompt: '인생 영화 한 편 추천한다면?' },
    { depth: 'casual', prompt: '최근에 받은 가장 좋은 칭찬은?' },
    { depth: 'casual', prompt: '나에게 와인/커피/차 한 모금이 주는 감정은?' },
    { depth: 'deeper', prompt: '최근에 마음이 흔들렸던 작은 순간은?' },
    { depth: 'deeper', prompt: '20대의 나에게 한 문장 편지를 쓴다면?' },
    { depth: 'deeper', prompt: '용기 내어 시작한 일 중 가장 자랑스러운 건?' },
    { depth: 'deeper', prompt: '내가 사랑받는다고 느끼는 순간은 어떤 때인가요?' },
    { depth: 'deeper', prompt: '오래 두고 싶은 관계의 조건은?' },
    { depth: 'deeper', prompt: '실패라고 부르고 싶지 않은 실패가 있나요?' },
    { depth: 'spicy', prompt: '오늘 처음 만났는데 한 사람을 또 보고 싶다면, 어떤 점 때문일까요?' },
    { depth: 'spicy', prompt: '연인에게 절대 양보 못하는 한 가지는?' },
    { depth: 'spicy', prompt: '나는 어떤 종류의 호감을 받을 때 가장 쉽게 흔들려요?' },
    { depth: 'spicy', prompt: '비밀 하나만 풀자면 어떤 비밀을 풀고 싶어요?' },
  ] as const
  await Promise.all(
    cards.map((c) => prisma.questionCard.create({ data: { ...c, language: 'ko', partyId: null } })),
  )

  await prisma.quizQuestion.create({
    data: {
      partyId: wineParty.id,
      kind: 'multiple-choice',
      prompt: '오늘 첫 잔의 품종을 맞춰보세요',
      optionsJson: JSON.stringify(['카베르네 소비뇽', '메를로', '피노 누아', '시라']),
      correctOptionIndex: 0,
      durationSec: 30,
    },
  })

  console.log('✔ Seed complete')
  console.log('   호스트:   host@rotifolk.dev')
  console.log('   여성 5명: w1~w5@rotifolk.dev')
  console.log('   남성 5명: m1~m5@rotifolk.dev')
  console.log('   비밀번호: rotifolk1234!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
