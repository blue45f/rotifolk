import { z } from 'zod'
import { MaritalStatusEnum, VerificationFieldEnum } from './profile.schema'

export const PartyCategoryEnum = z.enum([
  'wine',
  'coffee',
  'tea',
  'whisky',
  'cocktail',
  'beer',
  'sake',
  'natural-wine',
  'dessert',
  'custom',
])

export const RotationModeEnum = z.enum([
  'round-robin-pair',
  'round-robin-trio',
  'speed-circle',
  'random-shuffle',
  'host-curated',
])

export const PartyFormatEnum = z.enum(['rotation', 'note-ting', 'mixer'])
export const RotationFormatEnum = z.enum(['one-on-one', 'many-to-one', 'many-to-many'])
export const MatchScopeEnum = z.enum([
  'mutual-only',
  'top-n',
  'all-participants',
  'mutual-plus-top-n',
])
export const ConnectionModeEnum = z.enum(['chat', 'phone', 'both'])
export const ContactExchangePolicyEnum = z.enum([
  'mutual-consent',
  'chat-only',
  'open-after-match',
  'request-approval',
])
export const ConnectionChannelEnum = z.enum(['chat', 'instagram', 'kakao', 'phone'])
export const NoteDeliveryEnum = z.enum(['instant', 'party-end'])
export const DrinkPackageEnum = z.enum(['none', 'per-glass', 'unlimited', 'paired'])
export const SnackPackageEnum = z.enum(['none', 'per-plate', 'course', 'pairing-bites'])
export const ChildrenPolicyEnum = z.enum(['any', 'has', 'none'])

/** 성별·연령별 참여 비용 규칙. */
export const PricingRuleSchema = z
  .object({
    gender: z.enum(['male', 'female']).optional().nullable(),
    ageMin: z.number().int().min(18).max(80).optional().nullable(),
    ageMax: z.number().int().min(18).max(80).optional().nullable(),
    priceKRW: z.number().int().min(0).max(1_000_000),
    label: z.string().max(40).optional(),
  })
  .refine((r) => r.ageMin == null || r.ageMax == null || r.ageMin <= r.ageMax, {
    message: '최소 나이가 최대 나이보다 클 수 없어요',
    path: ['ageMax'],
  })
export type PricingRuleDto = z.infer<typeof PricingRuleSchema>

export const PartyConfigSchema = z.object({
  category: PartyCategoryEnum,
  rotationMode: RotationModeEnum,
  roundDurationSec: z.number().int().min(60).max(1800),
  totalRounds: z.number().int().min(2).max(20),
  breakBetweenRoundsSec: z.number().int().min(0).max(600).default(30),
  enableMidMatching: z.boolean().default(true),
  enableFinalMatching: z.boolean().default(true),
  enableQuiz: z.boolean().default(true),
  enableQuestionCards: z.boolean().default(true),
  enableLiveOrders: z.boolean().default(true),
  enableAvatarOnly: z.boolean().default(false),
  format: PartyFormatEnum.default('rotation'),
  rotationFormat: RotationFormatEnum.default('one-on-one'),
  groupSize: z.number().int().min(2).max(12).default(2),
  matchScope: MatchScopeEnum.default('mutual-only'),
  maxMatchesPerPerson: z.number().int().min(1).max(20).default(3),
  contactExchangePolicy: ContactExchangePolicyEnum.default('mutual-consent'),
  connectionMode: ConnectionModeEnum.default('chat'),
  connectionChannels: z.array(ConnectionChannelEnum).min(1).max(4).default(['chat']),
  groupAfterParty: z.boolean().default(false),
  revealPopular: z.boolean().default(true),
  enableNotes: z.boolean().default(true),
  noteDelivery: NoteDeliveryEnum.default('party-end'),
  noteQuota: z.number().int().min(1).max(50).default(5),
  enableConversationKit: z.boolean().default(true),
})

export const PartyPricingSchema = z.object({
  basePriceKRW: z.number().int().min(0).max(1_000_000),
  drinkPackage: DrinkPackageEnum.default('per-glass'),
  snackPackage: SnackPackageEnum.default('none'),
  refundDeadlineHours: z.number().int().min(0).max(168).default(24),
  pricingRules: z.array(PricingRuleSchema).max(20).default([]),
})

export const PartyRecruitmentSchema = z.object({
  genderRatioTarget: z.string().min(1).max(20).default('any'),
  ratioTolerance: z.number().int().min(0).max(10).default(1),
  maleCap: z.number().int().min(0).max(200).optional().nullable(),
  femaleCap: z.number().int().min(0).max(200).optional().nullable(),
  minMale: z.number().int().min(0).max(200).optional().nullable(),
  minFemale: z.number().int().min(0).max(200).optional().nullable(),
  autoCancelAt: z.string().datetime().optional().nullable(),
  autoCancelReason: z.string().max(500).optional().nullable(),
})

/** 최소 나이 ≤ 최대 나이 (둘 다 있을 때만 검사). */
const ageRangeOk = (min?: number | null, max?: number | null) =>
  min == null || max == null || min <= max

const CreatePartyObject = z.object({
  title: z.string().min(4).max(60),
  description: z.string().min(20).max(2000),
  venueId: z.string().min(1),
  coverImageUrl: z.string().url().optional().nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  minParticipants: z.number().int().min(2).max(20),
  maxParticipants: z.number().int().min(2).max(40),
  config: PartyConfigSchema,
  pricing: PartyPricingSchema,
  recruitment: PartyRecruitmentSchema.default({
    genderRatioTarget: 'any',
    ratioTolerance: 1,
  }),
  tags: z.array(z.string().min(1).max(20)).max(10).default([]),
  ageMin: z.number().int().min(18).max(80).optional().nullable(),
  ageMax: z.number().int().min(18).max(80).optional().nullable(),
  maleAgeMin: z.number().int().min(18).max(80).optional().nullable(),
  maleAgeMax: z.number().int().min(18).max(80).optional().nullable(),
  femaleAgeMin: z.number().int().min(18).max(80).optional().nullable(),
  femaleAgeMax: z.number().int().min(18).max(80).optional().nullable(),
  requiredVerifications: z.array(VerificationFieldEnum).max(6).default([]),
  maritalRequirement: z.array(MaritalStatusEnum).max(5).default([]),
  childrenPolicy: ChildrenPolicyEnum.default('any'),
  genderRatio: z.enum(['5:5', 'any']).optional().nullable(),
})

export const CreatePartySchema = CreatePartyObject.refine((d) => ageRangeOk(d.ageMin, d.ageMax), {
  message: '최소 나이가 최대 나이보다 클 수 없어요',
  path: ['ageMax'],
})
  .refine((d) => ageRangeOk(d.maleAgeMin, d.maleAgeMax), {
    message: '남성 최소 나이가 최대 나이보다 클 수 없어요',
    path: ['maleAgeMax'],
  })
  .refine((d) => ageRangeOk(d.femaleAgeMin, d.femaleAgeMax), {
    message: '여성 최소 나이가 최대 나이보다 클 수 없어요',
    path: ['femaleAgeMax'],
  })
export type CreatePartyDto = z.infer<typeof CreatePartySchema>

// .partial()은 ZodObject에만 있으므로 refine 이전의 객체에 적용한 뒤 같은 검증을 부착.
export const UpdatePartySchema = CreatePartyObject.partial()
  .refine((d) => ageRangeOk(d.ageMin, d.ageMax), {
    message: '최소 나이가 최대 나이보다 클 수 없어요',
    path: ['ageMax'],
  })
  .refine((d) => ageRangeOk(d.maleAgeMin, d.maleAgeMax), {
    message: '남성 최소 나이가 최대 나이보다 클 수 없어요',
    path: ['maleAgeMax'],
  })
  .refine((d) => ageRangeOk(d.femaleAgeMin, d.femaleAgeMax), {
    message: '여성 최소 나이가 최대 나이보다 클 수 없어요',
    path: ['femaleAgeMax'],
  })
export type UpdatePartyDto = z.infer<typeof UpdatePartySchema>

export const PartyQuerySchema = z.object({
  category: PartyCategoryEnum.optional(),
  area: z.string().optional(),
  date: z.string().date().optional(),
  tag: z.string().min(1).max(40).optional(),
  status: z.enum(['open', 'live', 'ended']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})
export type PartyQueryDto = z.infer<typeof PartyQuerySchema>

export const JoinPartySchema = z.object({
  partyId: z.string(),
  note: z.string().max(200).optional(),
})
export type JoinPartyDto = z.infer<typeof JoinPartySchema>

export const FinalMatchVoteSchema = z.object({
  toUserId: z.string(),
})
export type FinalMatchVoteDto = z.infer<typeof FinalMatchVoteSchema>

/** 체크인 — 좌석 번호는 양의 정수만(미지정 가능). */
export const CheckInSchema = z.object({
  seatNumber: z.number().int().min(1).max(500).optional(),
})
export type CheckInDto = z.infer<typeof CheckInSchema>

/** 게스트(비로그인) 링크 합류 — 닉네임 + 아바타 프리셋만으로 참가. */
export const GuestJoinSchema = z.object({
  nickname: z.string().trim().min(1).max(16),
  avatar: z
    .object({
      emoji: z.string().min(1).max(8),
      hue: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    })
    .optional(),
  /** 재방문 식별 토큰(localStorage 'rotifolk-guest-token') — 있으면 기존 참가를 돌려준다(멱등). */
  token: z.string().min(8).max(64).optional(),
})
export type GuestJoinDto = z.infer<typeof GuestJoinSchema>

/** 현장 합류 — 호스트가 이름만 입력해 즉석 등록(아바타 자동 배정). */
export const HostAddGuestSchema = z.object({
  name: z.string().trim().min(1).max(16),
})
export type HostAddGuestDto = z.infer<typeof HostAddGuestSchema>

/** 가입 후 게스트 참여 이력 연결 — guestToken으로 본인 행을 클레임. */
export const ClaimGuestSchema = z.object({
  guestToken: z.string().min(8).max(64),
})
export type ClaimGuestDto = z.infer<typeof ClaimGuestSchema>

export const ContactExchangeRequestSchema = z.object({
  channel: ConnectionChannelEnum,
})
export type ContactExchangeRequestDto = z.infer<typeof ContactExchangeRequestSchema>

export const ContactExchangeDecisionSchema = z.object({
  action: z.enum(['approve', 'reject']),
})
export type ContactExchangeDecisionDto = z.infer<typeof ContactExchangeDecisionSchema>
