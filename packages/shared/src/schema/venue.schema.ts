import { z } from 'zod'

export const VenueKindEnum = z.enum([
  'wine-bar',
  'cafe',
  'tea-house',
  'whisky-bar',
  'lounge',
  'private-room',
  'rooftop',
  'gallery',
  'studio',
  'custom',
])

export const CreateVenueSchema = z.object({
  name: z.string().min(2).max(80),
  kind: VenueKindEnum,
  area: z.string().min(1).max(40),
  address: z.string().min(5).max(200),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  capacity: z.number().int().min(2).max(200),
  pricePerHourKRW: z.number().int().min(0).max(10_000_000),
  amenities: z.array(z.string()).max(20).default([]),
  description: z.string().max(2000).optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  photos: z.array(z.string().url()).max(10).default([]),
})
export type CreateVenueDto = z.infer<typeof CreateVenueSchema>

export const VenueSearchSchema = z.object({
  q: z.string().optional(),
  kind: VenueKindEnum.optional(),
  area: z.string().optional(),
  minCapacity: z.coerce.number().int().min(2).optional(),
  partnered: z.coerce.boolean().optional(),
})
export type VenueSearchDto = z.infer<typeof VenueSearchSchema>

export const VenueBookingSchema = z.object({
  venueId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  partySize: z.number().int().min(2).max(40),
  noteToVenue: z.string().max(500).optional(),
})
export type VenueBookingDto = z.infer<typeof VenueBookingSchema>
