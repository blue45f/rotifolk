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
})

export const PartyPricingSchema = z.object({
  basePriceKRW: z.number().int().min(0).max(1_000_000),
  drinkPackage: DrinkPackageEnum.default('per-glass'),
  snackPackage: SnackPackageEnum.default('none'),
  refundDeadlineHours: z.number().int().min(0).max(168).default(24),
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
