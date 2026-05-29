import { z } from 'zod'

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
export const MatchScopeEnum = z.enum(['mutual-only', 'top-n', 'all-participants'])
export const ConnectionModeEnum = z.enum(['chat', 'phone', 'both'])
export const ConnectionChannelEnum = z.enum(['chat', 'instagram', 'kakao', 'phone'])
export const NoteDeliveryEnum = z.enum(['instant', 'party-end'])
export const DrinkPackageEnum = z.enum(['none', 'per-glass', 'unlimited', 'paired'])
export const SnackPackageEnum = z.enum(['none', 'per-plate', 'course', 'pairing-bites'])

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

export const CreatePartySchema = z.object({
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
  genderRatio: z.enum(['5:5', 'any']).optional().nullable(),
})
export type CreatePartyDto = z.infer<typeof CreatePartySchema>

export const UpdatePartySchema = CreatePartySchema.partial()
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
