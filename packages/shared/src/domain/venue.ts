import type { ID, Timestamps } from './common'

export type VenueKind =
  | 'wine-bar'
  | 'cafe'
  | 'tea-house'
  | 'whisky-bar'
  | 'lounge'
  | 'private-room'
  | 'rooftop'
  | 'gallery'
  | 'studio'
  | 'custom'

export interface Venue extends Timestamps {
  id: ID
  name: string
  kind: VenueKind
  area: string
  address: string
  lat?: number | null
  lng?: number | null
  capacity: number
  pricePerHourKRW: number
  amenities: string[]
  partnered: boolean
  description?: string | null
  photos: string[]
  contactPhone?: string | null
  rating: number
  reviewCount: number
}

export interface VenueBookingRequest {
  venueId: ID
  startAt: string
  endAt: string
  partySize: number
  noteToVenue?: string
}
