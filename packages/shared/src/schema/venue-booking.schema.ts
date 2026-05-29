import { z } from 'zod'
import { PartyCategoryEnum } from './party.schema'

export const CreateVenueBookingSchema = z
  .object({
    venueId: z.string().min(1),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    partySize: z.number().int().min(2).max(100),
    category: PartyCategoryEnum,
    noteToOwner: z.string().max(500).optional().nullable(),
  })
  .refine((v) => new Date(v.endAt).getTime() > new Date(v.startAt).getTime(), {
    message: '종료 시각은 시작 시각 이후여야 해요',
    path: ['endAt'],
  })
export type CreateVenueBookingDto = z.infer<typeof CreateVenueBookingSchema>

export const VenueRecommendQuerySchema = z.object({
  category: PartyCategoryEnum,
  area: z.string().optional(),
  partySize: z.coerce.number().int().min(2).max(100),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  maxBudgetKRW: z.coerce.number().int().optional(),
})
export type VenueRecommendQueryDto = z.infer<typeof VenueRecommendQuerySchema>

export const VenueAvailabilityQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  days: z.coerce.number().int().min(1).max(30).optional(),
})
export type VenueAvailabilityQueryDto = z.infer<typeof VenueAvailabilityQuerySchema>

export const OwnerDecisionSchema = z.object({
  message: z.string().max(500).optional(),
})
export type OwnerDecisionDto = z.infer<typeof OwnerDecisionSchema>

export const LinkBookingPartySchema = z.object({
  partyId: z.string().min(1),
})
export type LinkBookingPartyDto = z.infer<typeof LinkBookingPartySchema>
