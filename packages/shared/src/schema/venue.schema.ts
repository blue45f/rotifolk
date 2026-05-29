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
  'restaurant',
  'pub',
  'custom',
])

export const ArrivalGuideSchema = z.object({
  parkingNote: z.string().max(280).optional(),
  entryInfo: z.string().max(200).optional(),
  wifiSsid: z.string().max(60).optional(),
  wifiPassword: z.string().max(60).optional(),
  sortingNote: z.string().max(280).optional(),
  emergencyContact: z.string().max(40).optional(),
  extraNotes: z.string().max(1000).optional(),
})

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
  // ── 섭외 고도화 ──
  instantBook: z.boolean().default(false),
  cleaningFeeKRW: z.number().int().min(0).max(1_000_000).default(0),
  minHours: z.number().int().min(1).max(12).default(2),
  openMinute: z.number().int().min(0).max(1440).default(660),
  closeMinute: z.number().int().min(0).max(1440).default(1380),
  closedWeekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  weekendMultiplier: z.number().min(0.5).max(3).default(1),
  peakMultiplier: z.number().min(0.5).max(3).default(1),
  arrivalGuide: ArrivalGuideSchema.optional().nullable(),
  vibeTags: z.array(z.string().max(20)).max(12).default([]),
  useCases: z.array(z.string().max(20)).max(12).default([]),
  hostBlurb: z.string().max(500).optional().nullable(),
  selfHostEnabled: z.boolean().default(true),
})
export type CreateVenueDto = z.infer<typeof CreateVenueSchema>

export const UpdateVenueSchema = CreateVenueSchema.partial()
export type UpdateVenueDto = z.infer<typeof UpdateVenueSchema>

export const VenueSearchSchema = z.object({
  q: z.string().optional(),
  kind: VenueKindEnum.optional(),
  area: z.string().optional(),
  minCapacity: z.coerce.number().int().min(2).optional(),
  partnered: z.coerce.boolean().optional(),
  mine: z.coerce.boolean().optional(),
})
export type VenueSearchDto = z.infer<typeof VenueSearchSchema>
