import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/rotifolk',
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
  }
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
  await prisma.reportAuditLog.deleteMany()
  await prisma.questionCardDraw.deleteMany()
  await prisma.questionCard.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.quizAnswer.deleteMany()
  await prisma.quizQuestion.deleteMany()
  await prisma.finalMatch.deleteMany()
  await prisma.contactExchangeRequest.deleteMany()
  await prisma.communityComment.deleteMany()
  await prisma.communityPost.deleteMany()
  await prisma.finalMatchVote.deleteMany()
  await prisma.midMatchVote.deleteMany()
  await prisma.pair.deleteMany()
  await prisma.round.deleteMany()
  await prisma.liveEvent.deleteMany()
  await prisma.participation.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.party.deleteMany()
  await prisma.venue.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.avatar.deleteMany()
  await prisma.revenueRuleHistory.deleteMany()
  await prisma.monitoringPolicyHistory.deleteMany()
  await prisma.revenueRuleConfig.deleteMany()
  await prisma.monitoringPolicyConfig.deleteMany()
  await prisma.user.deleteMany()

  const pw = await argon2.hash('rotifolk1234!')

  // ============ Users (admin + 5W + 5M + host) ============
  const admin = await createUserWithAvatar(
    {
      email: 'admin@rotifolk.dev',
      passwordHash: pw,
      nickname: '운영자',
      role: 'admin',
      gender: 'female',
      bio: '서비스 운영 및 정산 테스트용 관리자 계정.',
      birthYear: 1990,
      interestsJson: JSON.stringify(['운영', '정산']),
      mbti: 'INTJ',
      isVerified: true,
      trustScore: 100,
      hostedCount: 0,
      joinedCount: 0,
    },
    {
      mood: 'mystery',
      hue: '#1F2A44',
      pattern: 'gradient',
      emojiBadge: '🛡️',
      faceSeed: 'admin-rotifolk',
    }
  )
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
    }
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
    gender: 'male' | 'female'
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
      { mood: s.mood, hue: s.hue, pattern: 'gradient', emojiBadge: s.emoji, faceSeed: s.nickname }
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
      matchScope: 'mutual-only',
      maxMatchesPerPerson: 3,
      contactExchangePolicy: 'mutual-consent',
      connectionMode: 'both',
      connectionChannelsJson: JSON.stringify(['chat', 'instagram', 'kakao', 'phone']),
      groupAfterParty: false,
      revealPopular: true,
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
      matchScope: 'top-n',
      maxMatchesPerPerson: 5,
      contactExchangePolicy: 'open-after-match',
      connectionMode: 'both',
      connectionChannelsJson: JSON.stringify(['chat', 'instagram', 'phone']),
      groupAfterParty: true,
      revealPopular: false,
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
      matchScope: 'mutual-plus-top-n',
      maxMatchesPerPerson: 4,
      contactExchangePolicy: 'mutual-consent',
      connectionMode: 'both',
      connectionChannelsJson: JSON.stringify(['chat', 'instagram', 'kakao']),
      groupAfterParty: true,
      revealPopular: true,
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

  const approvalStart = inDays(-1)
  const approvalParty = await prisma.party.create({
    data: {
      id: 'p_request',
      title: '요청 승인형 연락처 교환 데모',
      description:
        '매칭 후 채팅은 바로 시작하고, 인스타·카톡·번호는 상대가 승인할 때만 공개되는 안전형 데모 파티.',
      hostId: host.id,
      venueId: venues[2].id,
      coverImageUrl: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=1200',
      startAt: approvalStart,
      endAt: afterHours(approvalStart, 2),
      minParticipants: 4,
      maxParticipants: 8,
      status: 'ended',
      category: 'tea',
      rotationMode: 'round-robin-pair',
      roundDurationSec: 360,
      totalRounds: 4,
      breakBetweenRoundsSec: 60,
      matchScope: 'mutual-only',
      maxMatchesPerPerson: 3,
      contactExchangePolicy: 'request-approval',
      connectionMode: 'both',
      connectionChannelsJson: JSON.stringify(['chat', 'instagram', 'kakao', 'phone']),
      groupAfterParty: false,
      revealPopular: true,
      enableMidMatching: true,
      enableFinalMatching: true,
      enableQuiz: false,
      enableQuestionCards: true,
      enableLiveOrders: true,
      enableAvatarOnly: true,
      basePriceKRW: 28_000,
      drinkPackage: 'paired',
      snackPackage: 'pairing-bites',
      tagsJson: JSON.stringify(['#요청승인', '#연락처교환', '#데모']),
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
      matchScope: 'all-participants',
      maxMatchesPerPerson: 6,
      contactExchangePolicy: 'chat-only',
      connectionMode: 'chat',
      connectionChannelsJson: JSON.stringify(['chat']),
      groupAfterParty: false,
      revealPopular: false,
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
      matchScope: 'mutual-only',
      maxMatchesPerPerson: 3,
      contactExchangePolicy: 'chat-only',
      connectionMode: 'chat',
      connectionChannelsJson: JSON.stringify(['chat']),
      groupAfterParty: false,
      revealPopular: false,
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
  for (let i = 0; i < 2; i++) {
    await prisma.participation.create({
      data: { partyId: approvalParty.id, userId: W[i].id, status: 'checked-in', seatNumber: i + 1 },
    })
    await prisma.participation.create({
      data: { partyId: approvalParty.id, userId: M[i].id, status: 'checked-in', seatNumber: i + 3 },
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
    cards.map((c) => prisma.questionCard.create({ data: { ...c, language: 'ko', partyId: null } }))
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

  // ============ 새 기능 데모 데이터 (연결 채널·인기·민감설정·회피) ============
  const byEmail = (p: string) => prisma.user.findUnique({ where: { email: `${p}@rotifolk.dev` } })
  const [w1, w2, w3, m1, m2, m3] = await Promise.all(
    ['w1', 'w2', 'w3', 'm1', 'm2', 'm3'].map(byEmail)
  )

  // 연결 채널 핸들 + 공개 동의 (매칭 리빌에서 단계적으로 열림)
  if (w1)
    await prisma.user.update({
      where: { id: w1.id },
      data: {
        phone: '010-1111-2222',
        shareContact: true,
        kakaoId: 'yoonseul_w',
        shareKakao: true,
        instagram: 'yoonseul.day',
        shareInstagram: true,
      },
    })
  if (m1)
    await prisma.user.update({
      where: { id: m1.id },
      data: {
        phone: '010-3333-4444',
        shareContact: true,
        kakaoId: 'dohyun_m',
        shareKakao: true,
        instagram: 'dohyun.cellar',
        shareInstagram: true,
      },
    })
  if (w2)
    await prisma.user.update({
      where: { id: w2.id },
      data: { instagram: 'haeun_pic', shareInstagram: true },
    })
  // 민감 정보 설정 데모: w3은 인기 랭킹 비참여, m3은 받은 호감 수 비공개
  if (w3) await prisma.user.update({ where: { id: w3.id }, data: { joinPopularityRanking: false } })
  if (m3) await prisma.user.update({ where: { id: m3.id }, data: { showLikesReceived: false } })

  // ============ 샘플 결제 데이터 ============
  const paymentNow = new Date()
  const paymentDateFrom = (dayOffset: number, hour = 19) => {
    const value = new Date(paymentNow)
    value.setDate(value.getDate() + dayOffset)
    value.setHours(hour, 0, 0, 0)
    return value
  }

  const whiskyParty = await prisma.party.findFirst({
    where: { title: '미드나잇 위스키 무제한 페어링' },
  })

  await prisma.payment.createMany({
    data: [
      // wine party: 실제 결제 데이터 8건, 환불 2건
      {
        partyId: wineParty.id,
        userId: W[0].id,
        amountKRW: 18_000,
        status: 'paid',
        paidAt: paymentDateFrom(-18),
        createdAt: paymentDateFrom(-18),
      },
      {
        partyId: wineParty.id,
        userId: W[1].id,
        amountKRW: 18_000,
        status: 'paid',
        paidAt: paymentDateFrom(-16),
        createdAt: paymentDateFrom(-16),
      },
      {
        partyId: wineParty.id,
        userId: W[2].id,
        amountKRW: 18_000,
        status: 'paid',
        paidAt: paymentDateFrom(-14),
        createdAt: paymentDateFrom(-14),
      },
      {
        partyId: wineParty.id,
        userId: M[0].id,
        amountKRW: 18_000,
        status: 'paid',
        paidAt: paymentDateFrom(-14),
        createdAt: paymentDateFrom(-14),
      },
      {
        partyId: wineParty.id,
        userId: M[1].id,
        amountKRW: 18_000,
        status: 'paid',
        paidAt: paymentDateFrom(-12),
        createdAt: paymentDateFrom(-12),
      },
      {
        partyId: wineParty.id,
        userId: M[2].id,
        amountKRW: 18_000,
        status: 'refunded',
        refundedAt: paymentDateFrom(-10),
        createdAt: paymentDateFrom(-10),
      },
      {
        partyId: wineParty.id,
        userId: M[3].id,
        amountKRW: 18_000,
        status: 'refunded',
        refundedAt: paymentDateFrom(-8),
        createdAt: paymentDateFrom(-8),
      },
      {
        partyId: wineParty.id,
        userId: M[4].id,
        amountKRW: 18_000,
        status: 'paid',
        paidAt: paymentDateFrom(-6),
        createdAt: paymentDateFrom(-6),
      },
      // coffee party: 결제 5건
      {
        partyId: coffeeParty.id,
        userId: W[3].id,
        amountKRW: 32_000,
        status: 'paid',
        paidAt: paymentDateFrom(-12, 18),
        createdAt: paymentDateFrom(-12, 18),
      },
      {
        partyId: coffeeParty.id,
        userId: W[4].id,
        amountKRW: 32_000,
        status: 'paid',
        paidAt: paymentDateFrom(-11, 18),
        createdAt: paymentDateFrom(-11, 18),
      },
      {
        partyId: coffeeParty.id,
        userId: M[0].id,
        amountKRW: 32_000,
        status: 'paid',
        paidAt: paymentDateFrom(-10, 18),
        createdAt: paymentDateFrom(-10, 18),
      },
      {
        partyId: coffeeParty.id,
        userId: M[1].id,
        amountKRW: 32_000,
        status: 'paid',
        paidAt: paymentDateFrom(-9, 18),
        createdAt: paymentDateFrom(-9, 18),
      },
      // tea party: 결제 3건
      {
        partyId: teaParty.id,
        userId: W[0].id,
        amountKRW: 42_000,
        status: 'paid',
        paidAt: paymentDateFrom(-4, 17),
        createdAt: paymentDateFrom(-4, 17),
      },
      {
        partyId: teaParty.id,
        userId: M[2].id,
        amountKRW: 42_000,
        status: 'paid',
        paidAt: paymentDateFrom(-4, 17),
        createdAt: paymentDateFrom(-4, 17),
      },
      {
        partyId: teaParty.id,
        userId: M[3].id,
        amountKRW: 42_000,
        status: 'paid',
        paidAt: paymentDateFrom(-3, 17),
        createdAt: paymentDateFrom(-3, 17),
      },
      // whisky party: 결제 2건
      ...(whiskyParty
        ? [
            {
              partyId: whiskyParty.id,
              userId: W[4].id,
              amountKRW: 88_000,
              status: 'paid',
              paidAt: paymentDateFrom(-2, 20),
              createdAt: paymentDateFrom(-2, 20),
            },
            {
              partyId: whiskyParty.id,
              userId: M[4].id,
              amountKRW: 88_000,
              status: 'paid',
              paidAt: paymentDateFrom(-1, 20),
              createdAt: paymentDateFrom(-1, 20),
            },
          ]
        : []),
    ],
  })

  const winePartyData = await prisma.party.findFirst({
    where: { title: '한남 루프탑 와인 로테이션 vol.12' },
  })
  const coffeePartyData = await prisma.party.findFirst({
    where: { title: '연남 스페셜티 6종 블라인드 코스' },
  })

  // ============ 샘플 신고 데이터 ============
  if (w1 && M[0] && winePartyData) {
    await prisma.report.create({
      data: {
        reporterId: w1.id,
        targetUserId: M[0].id,
        partyId: winePartyData.id,
        kind: 'inappropriate',
        body: '메시지 톤이 지나치게 공격적이에요.',
        status: 'open',
      },
    })
  }
  if (w2 && M[1] && coffeePartyData) {
    await prisma.report.create({
      data: {
        reporterId: w2.id,
        targetUserId: M[1].id,
        partyId: coffeePartyData.id,
        kind: 'spam',
        body: '홍보성 DM이 반복돼요.',
        status: 'reviewing',
      },
    })
  }
  if (w3 && m1) {
    await prisma.report.create({
      data: {
        reporterId: w3.id,
        targetUserId: m1.id,
        kind: 'harassment',
        body: '과도한 개인 질문이 들어왔습니다.',
        status: 'resolved',
      },
    })
  }
  if (m2 && W[3]) {
    await prisma.report.create({
      data: {
        reporterId: m2.id,
        targetUserId: W[3].id,
        kind: 'other',
        body: '신고 사유가 모호합니다.',
        status: 'dismissed',
      },
    })
  }

  // ============ 샘플 수익 정책 히스토리 ============
  await prisma.revenueRuleConfig.create({
    data: {
      key: 'global',
      platformFeePercent: 8.5,
      refundRetentionPercent: 5,
      minimumHostPayoutPercent: 84,
      updatedBy: admin.id,
      updatedAt: paymentDateFrom(-20, 9),
    },
  })
  await prisma.monitoringPolicyConfig.create({
    data: {
      key: 'global',
      warningRefundRatePercent: 11,
      dangerRefundRatePercent: 22,
      topPartyConcentrationPercent: 68,
      updatedBy: admin.id,
      updatedAt: paymentDateFrom(-20, 10),
    },
  })
  await prisma.revenueRuleHistory.create({
    data: {
      key: 'global',
      fromPlatformFeePercent: 7.5,
      toPlatformFeePercent: 8.5,
      fromRefundRetentionPercent: 4,
      toRefundRetentionPercent: 5,
      fromMinimumHostPayoutPercent: 88,
      toMinimumHostPayoutPercent: 84,
      changedBy: admin.id,
      reason: '분기 테스트용 정책 변경(베이직값 조정)',
      changedAt: paymentDateFrom(-14, 9),
    },
  })
  await prisma.monitoringPolicyHistory.create({
    data: {
      key: 'global',
      fromWarningRefundRatePercent: 12,
      toWarningRefundRatePercent: 11,
      fromDangerRefundRatePercent: 25,
      toDangerRefundRatePercent: 22,
      fromTopPartyConcentrationPercent: 70,
      toTopPartyConcentrationPercent: 68,
      changedBy: admin.id,
      reason: '분기 테스트용 임계값 완화',
      changedAt: paymentDateFrom(-14, 10),
    },
  })

  // 파티: 연결 채널 4종 모두 제공 + 인기 공개
  await prisma.party.update({
    where: { id: wineParty.id },
    data: {
      connectionChannelsJson: JSON.stringify(['chat', 'instagram', 'kakao', 'phone']),
      revealPopular: true,
      noteQuota: 5,
    },
  })

  // 최종 호감 투표 — m1(인기남)·w1(인기녀)에 표를 모으고 w1↔m1 상호 매칭
  const mkVoteFor = (partyId: string, fromUserId: string, toUserId: string) =>
    prisma.finalMatchVote.upsert({
      where: { partyId_fromUserId_toUserId: { partyId, fromUserId, toUserId } },
      create: { partyId, fromUserId, toUserId },
      update: {},
    })
  const mkVote = (fromUserId: string, toUserId: string) =>
    mkVoteFor(wineParty.id, fromUserId, toUserId)
  if (w1 && m1) {
    await mkVote(w1.id, m1.id)
    await mkVote(m1.id, w1.id) // 상호 매칭
    await mkVoteFor(approvalParty.id, w1.id, m1.id)
    await mkVoteFor(approvalParty.id, m1.id, w1.id)
  }
  if (w2 && m1) await mkVote(w2.id, m1.id)
  if (w3 && m1) await mkVote(w3.id, m1.id) // m1 = 인기남 (3표)
  if (m2 && w1) await mkVote(m2.id, w1.id)
  if (m3 && w1) await mkVote(m3.id, w1.id) // w1 = 인기녀 (3표)

  if (w1 && m1) {
    await prisma.contactExchangeRequest.create({
      data: {
        partyId: approvalParty.id,
        requesterId: m1.id,
        receiverId: w1.id,
        channel: 'instagram',
        status: 'pending',
      },
    })
    await prisma.contactExchangeRequest.create({
      data: {
        partyId: approvalParty.id,
        requesterId: w1.id,
        receiverId: m1.id,
        channel: 'kakao',
        status: 'approved',
        decidedById: m1.id,
        decidedAt: new Date(),
      },
    })
  }

  // ============ 커뮤니티 샘플 데이터 ============
  const communityPost = await prisma.communityPost.create({
    data: {
      authorId: W[0].id,
      partyId: wineParty.id,
      title: '첫 로테이션 모임 전에 뭘 준비하면 좋을까요?',
      body: '와인 초보라 라운드에서 어떤 이야기를 꺼내면 좋을지 궁금해요. 복장이나 주문 방식도 미리 알고 싶습니다.',
      category: 'question',
      area: '한남동',
      tagsJson: JSON.stringify(['와인초보', '첫참여', '한남동']),
    },
  })
  const rootComment = await prisma.communityComment.create({
    data: {
      postId: communityPost.id,
      authorId: host.id,
      body: '처음이면 향이나 맛을 맞히려 하지 않아도 괜찮아요. 좋아하는 분위기와 최근 재밌게 본 콘텐츠만 준비해도 대화가 충분히 이어져요.',
    },
  })
  const replyComment = await prisma.communityComment.create({
    data: {
      postId: communityPost.id,
      authorId: M[0].id,
      parentId: rootComment.id,
      body: '저도 첫 참여 때 이 답변이 제일 도움 됐어요. 질문 카드가 있어서 대화 공백이 거의 없었습니다.',
    },
  })
  await prisma.communityComment.create({
    data: {
      postId: communityPost.id,
      authorId: W[1].id,
      body: '복장은 너무 격식보다 편한 셔츠나 니트 정도면 충분했어요.',
    },
  })
  await prisma.communityPost.update({
    where: { id: communityPost.id },
    data: { commentCount: 3, lastCommentAt: replyComment.createdAt },
  })
  const reviewPost = await prisma.communityPost.create({
    data: {
      authorId: M[1].id,
      partyId: approvalParty.id,
      title: '요청 승인형 연락처 교환, 부담이 확실히 낮았어요',
      body: '채팅은 바로 열리고 외부 연락처는 요청과 승인으로 나뉘니 거절도 자연스러웠습니다. 다음 모임에도 이 방식이 있으면 좋겠어요.',
      category: 'match-review',
      area: '북촌',
      tagsJson: JSON.stringify(['연락처교환', '안전매칭']),
    },
  })
  await prisma.communityComment.create({
    data: {
      postId: reviewPost.id,
      authorId: W[0].id,
      body: '저도 번호보다 인스타 요청부터 시작하는 흐름이 편했어요.',
    },
  })
  await prisma.communityPost.update({
    where: { id: reviewPost.id },
    data: { commentCount: 1, lastCommentAt: new Date() },
  })

  const communityPostReport = await prisma.report.create({
    data: {
      reporterId: W[2].id,
      targetUserId: W[0].id,
      communityPostId: communityPost.id,
      reporterTargetKey: `community-post:${communityPost.id}`,
      kind: 'inappropriate',
      body: '처음 참여자에게 외부 연락처를 바로 요구하는 표현이 있어 확인이 필요합니다.',
      status: 'open',
    },
  })
  await prisma.reportAuditLog.create({
    data: {
      reportId: communityPostReport.id,
      actorId: W[2].id,
      action: 'report_created',
      note: 'inappropriate',
      metadataJson: JSON.stringify({ reporterTargetKey: `community-post:${communityPost.id}` }),
    },
  })
  const communityCommentReport = await prisma.report.create({
    data: {
      reporterId: M[2].id,
      targetUserId: host.id,
      communityPostId: communityPost.id,
      communityCommentId: rootComment.id,
      reporterTargetKey: `community-comment:${rootComment.id}`,
      kind: 'spam',
      body: '댓글에 특정 업장 홍보처럼 보이는 문구가 포함되어 검토 요청합니다.',
      status: 'reviewing',
      resolvedNote: '운영자 검토 시작',
    },
  })
  await prisma.reportAuditLog.createMany({
    data: [
      {
        reportId: communityCommentReport.id,
        actorId: M[2].id,
        action: 'report_created',
        note: 'spam',
        metadataJson: JSON.stringify({ reporterTargetKey: `community-comment:${rootComment.id}` }),
      },
      {
        reportId: communityCommentReport.id,
        actorId: admin.id,
        action: 'status_updated',
        note: '운영자 검토 시작',
        metadataJson: JSON.stringify({ fromStatus: 'open', toStatus: 'reviewing' }),
      },
    ],
  })

  // 회피 목록 데모 (라벨만 — 해시는 데모용 임의값)
  if (w1)
    await prisma.avoidContact.upsert({
      where: { userId_phoneHash: { userId: w1.id, phoneHash: 'demo-hash-ex-colleague' } },
      create: { userId: w1.id, phoneHash: 'demo-hash-ex-colleague', label: '전 직장 동료' },
      update: {},
    })

  // ============ 소셜 브레드스 (클럽·팔로우·후기·알림·저장·호스트지원·추천·채팅·쪽지·사진·완성매칭) ============
  // 종료된 approvalParty를 과거 모임 데이터(후기/매칭/쪽지/사진)의 기준으로 사용한다.
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000)
  const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 3600_000)

  // ── 클럽 (정기 모임 커뮤니티) ──
  const wineClub = await prisma.club.create({
    data: {
      ownerId: host.id,
      name: '한남 와인 라운지',
      category: 'wine',
      description: '매달 둘째 주 금요일, 한남동에서 만나는 와인 애호가 모임. 초보 환영.',
      visibility: 'public',
    },
  })
  const coffeeClub = await prisma.club.create({
    data: {
      ownerId: M[4].id,
      name: '연남 스페셜티 클럽',
      category: 'coffee',
      description: '핸드드립부터 에스프레소까지, 원두 노트를 함께 나눠요.',
      visibility: 'public',
    },
  })
  const teaClub = await prisma.club.create({
    data: {
      ownerId: W[2].id,
      name: '북촌 다실 모임',
      category: 'tea',
      description: '한옥에서 차 한 잔. 조용하고 깊은 대화를 좋아하는 분들.',
      visibility: 'private',
    },
  })

  // 클럽 멤버십 (owner는 member 행도 추가해 _count가 자연스럽게 잡히도록)
  const clubMemberData: { clubId: string; userId: string; role: string }[] = []
  const addMembers = (clubId: string, ownerId: string, members: { id: string }[]) => {
    clubMemberData.push({ clubId, userId: ownerId, role: 'owner' })
    for (const u of members) {
      if (u.id !== ownerId) clubMemberData.push({ clubId, userId: u.id, role: 'member' })
    }
  }
  addMembers(wineClub.id, host.id, [W[0], W[1], W[3], M[0], M[1], M[2]])
  addMembers(coffeeClub.id, M[4].id, [W[1], W[2], M[0], M[3]])
  addMembers(teaClub.id, W[2].id, [W[0], W[4], M[2]])
  await prisma.clubMember.createMany({ data: clubMemberData, skipDuplicates: true })

  // 클럽 게시글 + 댓글
  const winePost = await prisma.clubPost.create({
    data: {
      clubId: wineClub.id,
      authorId: W[0].id,
      title: '이번 달 정모 와인 추천 받아요',
      body: '가볍게 시작하기 좋은 내추럴 와인 있을까요? 6명 정도 모일 예정이에요.',
    },
  })
  const winePostReply = await prisma.clubComment.create({
    data: {
      postId: winePost.id,
      authorId: host.id,
      body: '루아르 슈냉블랑부터 시작하면 입문자도 편하게 즐겨요. 제가 한 병 가져갈게요!',
    },
  })
  await prisma.clubComment.create({
    data: {
      postId: winePost.id,
      authorId: M[0].id,
      parentId: winePostReply.id,
      body: '오 좋아요, 저는 치즈 플래터 담당할게요 🧀',
    },
  })
  await prisma.clubPost.update({
    where: { id: winePost.id },
    data: { commentCount: 2, lastCommentAt: minutesAgo(40) },
  })
  const coffeePost = await prisma.clubPost.create({
    data: {
      clubId: coffeeClub.id,
      authorId: M[3].id,
      title: '에티오피아 예가체프 vs 케냐 AA',
      body: '둘 다 좋아하는데 다음 시음회 메인으로 뭐가 나을까요?',
    },
  })
  await prisma.clubComment.create({
    data: {
      postId: coffeePost.id,
      authorId: W[1].id,
      body: '예가체프요! 플로럴한 향이 첫 시음회엔 더 임팩트 있어요.',
    },
  })
  await prisma.clubPost.update({
    where: { id: coffeePost.id },
    data: { commentCount: 1, lastCommentAt: minutesAgo(120) },
  })

  // ── 팔로우 (호스트 중심 + 참가자 상호) ──
  const followPairs: [{ id: string }, { id: string }][] = [
    [W[0], host],
    [W[1], host],
    [W[2], host],
    [M[0], host],
    [M[1], host],
    [M[2], host],
    [M[3], host],
    [W[0], M[0]],
    [M[0], W[0]],
    [W[1], M[1]],
    [W[3], M[2]],
    [M[4], W[2]],
    [host, W[0]],
  ]
  await prisma.follow.createMany({
    data: followPairs.map(([follower, following]) => ({
      followerId: follower.id,
      followingId: following.id,
    })),
    skipDuplicates: true,
  })

  // ── 후기 (종료된 approvalParty 기준: 호스트 후기 + 참가자 상호 후기) ──
  await prisma.review.createMany({
    data: [
      {
        partyId: approvalParty.id,
        fromUserId: W[0].id,
        targetUserId: host.id,
        rating: 5,
        body: '진행이 매끄럽고 어색한 순간이 없었어요. 질문 카드 타이밍이 특히 좋았습니다.',
        tagsJson: JSON.stringify(['친절해요', '진행이 매끄러워요']),
        hostReply: '함께해 주셔서 감사해요! 다음에 또 뵐게요 🍷',
        hostRepliedAt: minutesAgo(30),
      },
      {
        partyId: approvalParty.id,
        fromUserId: M[0].id,
        targetUserId: host.id,
        rating: 5,
        body: '처음 참여였는데 부담 없이 즐겼습니다. 강력 추천!',
        tagsJson: JSON.stringify(['분위기 좋아요', '또 참여하고 싶어요']),
      },
      {
        partyId: approvalParty.id,
        fromUserId: W[1].id,
        targetUserId: host.id,
        rating: 4,
        body: '전반적으로 만족스러웠어요. 라운드 시간이 조금만 더 길었으면.',
        tagsJson: JSON.stringify(['편안했어요']),
      },
      {
        partyId: approvalParty.id,
        fromUserId: M[0].id,
        targetUserId: W[0].id,
        rating: 5,
        body: '대화가 정말 잘 통했어요. 또 뵙고 싶네요.',
        anonymous: true,
        tagsJson: JSON.stringify(['대화가 즐거워요']),
      },
      {
        partyId: approvalParty.id,
        fromUserId: W[0].id,
        targetUserId: M[0].id,
        rating: 5,
        body: '편하게 리드해 주셔서 즐거웠습니다.',
        anonymous: true,
        tagsJson: JSON.stringify(['배려심 있어요']),
      },
    ],
  })

  // ── 완성된 매칭 + 양방향 최종투표 (approvalParty) ──
  await prisma.finalMatchVote.createMany({
    data: [
      { partyId: approvalParty.id, fromUserId: W[0].id, toUserId: M[0].id },
      { partyId: approvalParty.id, fromUserId: M[0].id, toUserId: W[0].id },
      { partyId: approvalParty.id, fromUserId: W[1].id, toUserId: M[1].id },
    ],
    skipDuplicates: true,
  })
  await prisma.finalMatch.create({
    data: {
      partyId: approvalParty.id,
      userAId: W[0].id < M[0].id ? W[0].id : M[0].id,
      userBId: W[0].id < M[0].id ? M[0].id : W[0].id,
      result: 'mutual',
    },
  })

  // ── 쪽지 (종료 후 도착) ──
  await prisma.partyNote.createMany({
    data: [
      {
        partyId: approvalParty.id,
        fromUserId: M[0].id,
        toUserId: W[0].id,
        roundIndex: 2,
        body: '오늘 대화 정말 즐거웠어요. 다음에 커피 한 잔 어때요?',
        emoji: '☕',
        shareContact: true,
        deliveredAt: minutesAgo(50),
        readAt: minutesAgo(20),
      },
      {
        partyId: approvalParty.id,
        fromUserId: W[1].id,
        toUserId: M[1].id,
        roundIndex: 3,
        body: '추천해 주신 차, 꼭 마셔볼게요. 고마워요!',
        emoji: '🍵',
        deliveredAt: minutesAgo(50),
      },
      {
        partyId: approvalParty.id,
        fromUserId: W[0].id,
        toUserId: M[0].id,
        roundIndex: 2,
        body: '저도 즐거웠어요 :) 연락 주세요.',
        emoji: '😊',
        shareContact: true,
        deliveredAt: minutesAgo(45),
      },
    ],
  })

  // ── 그룹 채팅방 + 메시지 (매칭된 페어 채팅) ──
  const pairRoom = await prisma.chatRoom.create({
    data: {
      kind: 'pair',
      partyId: approvalParty.id,
      title: '윤슬 ♥ 매칭 채팅',
      lastMessageAt: minutesAgo(5),
    },
  })
  await prisma.chatMembership.createMany({
    data: [
      { roomId: pairRoom.id, userId: W[0].id, lastReadAt: minutesAgo(4) },
      { roomId: pairRoom.id, userId: M[0].id, lastReadAt: minutesAgo(5) },
    ],
  })
  await prisma.chatMessage.createMany({
    data: [
      {
        roomId: pairRoom.id,
        userId: M[0].id,
        body: '안녕하세요! 오늘 즐거웠어요 :)',
        createdAt: minutesAgo(60),
      },
      {
        roomId: pairRoom.id,
        userId: W[0].id,
        body: '저도요! 덕분에 편하게 대화했어요',
        createdAt: minutesAgo(55),
      },
      {
        roomId: pairRoom.id,
        userId: M[0].id,
        body: '주말에 시간 괜찮으세요?',
        createdAt: minutesAgo(6),
      },
      {
        roomId: pairRoom.id,
        userId: W[0].id,
        body: '네 좋아요! 토요일 오후 어떠세요?',
        createdAt: minutesAgo(5),
      },
    ],
  })

  // ── 후기/완성 모임의 사진 + 좋아요 ──
  const photo1 = await prisma.partyPhoto.create({
    data: {
      partyId: approvalParty.id,
      userId: host.id,
      url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=900',
      caption: '오늘의 첫 잔 🍷',
    },
  })
  const photo2 = await prisma.partyPhoto.create({
    data: {
      partyId: approvalParty.id,
      userId: W[0].id,
      url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=900',
      caption: '다실 분위기가 너무 좋았어요',
    },
  })
  await prisma.photoLike.createMany({
    data: [
      { photoId: photo1.id, userId: W[0].id },
      { photoId: photo1.id, userId: M[0].id },
      { photoId: photo1.id, userId: W[1].id },
      { photoId: photo2.id, userId: host.id },
      { photoId: photo2.id, userId: M[0].id },
    ],
    skipDuplicates: true,
  })

  // ── 저장한 모임 (북마크) ──
  await prisma.savedParty.createMany({
    data: [
      { userId: W[0].id, partyId: wineParty.id },
      { userId: W[0].id, partyId: teaParty.id },
      { userId: M[0].id, partyId: wineParty.id },
      { userId: M[1].id, partyId: coffeeParty.id },
      { userId: W[2].id, partyId: teaParty.id },
      { userId: M[3].id, partyId: coffeeParty.id },
    ],
    skipDuplicates: true,
  })

  // ── 호스트 지원 (운영자 승인 대기/완료) ──
  await prisma.hostApplication.createMany({
    data: [
      {
        userId: W[2].id,
        introduction:
          '북촌에서 다도 모임을 5년째 운영해 왔습니다. 차분하고 깊은 대화를 좋아하는 분들을 모시고 싶어요.',
        hostingStyle: '차분 / 따뜻',
        plannedCategories: JSON.stringify(['tea']),
        experience: '오프라인 다도 모임 30회 이상 진행',
        status: 'pending',
      },
      {
        userId: M[3].id,
        introduction: '스페셜티 커피 큐그레이더 자격이 있습니다. 블라인드 시음회를 열고 싶어요.',
        hostingStyle: '발랄 / 진지',
        plannedCategories: JSON.stringify(['coffee']),
        experience: '카페 운영 3년',
        status: 'approved',
        reviewedById: admin.id,
        reviewedNote: '경력과 진정성이 충분합니다. 승인합니다.',
      },
      {
        userId: M[1].id,
        introduction: '위스키 페어링 모임을 기획하고 싶습니다.',
        hostingStyle: '진지',
        plannedCategories: JSON.stringify(['whisky']),
        status: 'rejected',
        reviewedById: admin.id,
        reviewedNote: '구체적인 운영 계획 보완 후 재지원 부탁드립니다.',
      },
    ],
  })

  // ── 추천(레퍼럴) ──
  await prisma.referral.createMany({
    data: [
      { referrerId: host.id, referredId: M[4].id, bonusKRW: 3000 },
      { referrerId: W[0].id, referredId: W[3].id, bonusKRW: 3000 },
    ],
    skipDuplicates: true,
  })

  // ── 알림 (각 유형별 샘플) ──
  await prisma.notification.createMany({
    data: [
      {
        userId: host.id,
        kind: 'party_join',
        title: '새 참가 신청',
        body: '윤슬님이 한남 루프탑 와인 로테이션에 참가했어요.',
        link: `/parties/${wineParty.id}`,
        createdAt: minutesAgo(180),
        readAt: minutesAgo(170),
      },
      {
        userId: W[0].id,
        kind: 'match_made',
        title: '매칭 성사! 💞',
        body: '서로 호감을 보냈어요. 채팅을 시작해 보세요.',
        link: `/chat/${pairRoom.id}`,
        createdAt: minutesAgo(58),
      },
      {
        userId: M[0].id,
        kind: 'match_made',
        title: '매칭 성사! 💞',
        body: '윤슬님과 매칭되었어요.',
        link: `/chat/${pairRoom.id}`,
        createdAt: minutesAgo(58),
      },
      {
        userId: W[0].id,
        kind: 'message',
        title: '새 메시지',
        body: '주말에 시간 괜찮으세요?',
        link: `/chat/${pairRoom.id}`,
        createdAt: minutesAgo(6),
      },
      {
        userId: host.id,
        kind: 'host_review',
        title: '새 후기가 도착했어요 ⭐',
        body: '윤슬님이 별점 5점 후기를 남겼어요.',
        link: `/parties/${approvalParty.id}`,
        createdAt: minutesAgo(40),
      },
      {
        userId: W[2].id,
        kind: 'party_starting',
        title: '곧 시작해요',
        body: '북촌 다실 모임이 곧 시작됩니다.',
        link: `/parties/${teaParty.id}`,
        createdAt: daysAgo(0),
      },
    ],
  })

  // ── 차단 (안전 기능 데모) ──
  await prisma.userBlock.create({
    data: { blockerId: W[4].id, blockedId: M[2].id, reason: '불쾌한 메시지' },
  })

  // ── 공간 예약 요청 (호스트가 남의 공간 섭외) ──
  await prisma.venueBooking.create({
    data: {
      venueId: venues[3].id,
      requesterId: M[0].id,
      ownerId: venues[3].ownerId,
      startAt: inDays(20),
      endAt: afterHours(inDays(20), 3),
      partySize: 8,
      category: 'whisky',
      noteToOwner: '소규모 위스키 페어링 모임을 열고 싶습니다. 시가룸도 사용 가능할까요?',
      status: 'requested',
      hours: 3,
      baseKRW: 540_000,
      multiplier: 1,
      cleaningFeeKRW: 30_000,
      totalKRW: 570_000,
    },
  })

  console.log('✔ Seed complete')
  console.log('   관리자:   admin@rotifolk.dev')
  console.log('   호스트:   host@rotifolk.dev')
  console.log('   여성 5명: w1~w5@rotifolk.dev')
  console.log('   남성 5명: m1~m5@rotifolk.dev')
  console.log('   비밀번호: rotifolk1234!')
  console.log(
    '   소셜 데이터: 클럽 3 · 팔로우 · 후기 · 매칭 · 쪽지 · 채팅 · 사진 · 저장 · 호스트지원 · 추천 · 알림 · 예약요청'
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
