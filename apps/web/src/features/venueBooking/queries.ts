import { api } from '@services/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  CreateVenueBookingDto,
  CreateVenueDto,
  UpdateVenueDto,
  Venue,
  VenueAvailability,
  VenueBooking,
  VenueRecommendation,
} from '@rotifolk/shared'

/** 공간 추천 브리프 (UI 입력) */
export interface VenueBrief {
  category: string
  area?: string
  partySize: number
  startAt?: string
  endAt?: string
  lat?: number | null
  lng?: number | null
  maxBudgetKRW?: number | null
}

/** /venues/mine 응답 — 공간 + 운영 카운트 */
export type OwnedVenue = Venue & { upcomingParties: number; pendingRequests: number }

export const vbKeys = {
  recommend: (b: VenueBrief) => ['venue-rec', b] as const,
  availability: (id: string) => ['venue-availability', id] as const,
  myVenues: () => ['venues', 'mine'] as const,
  bookings: (role: string) => ['venue-bookings', role] as const,
}

function toParams(brief: VenueBrief): string {
  const p = new URLSearchParams()
  p.set('category', brief.category)
  p.set('partySize', String(brief.partySize))
  if (brief.area) p.set('area', brief.area)
  if (brief.startAt) p.set('startAt', brief.startAt)
  if (brief.endAt) p.set('endAt', brief.endAt)
  if (brief.lat != null) p.set('lat', String(brief.lat))
  if (brief.lng != null) p.set('lng', String(brief.lng))
  if (brief.maxBudgetKRW != null && Number.isFinite(brief.maxBudgetKRW))
    p.set('maxBudgetKRW', String(brief.maxBudgetKRW))
  return p.toString()
}

export function useRecommendVenues(brief: VenueBrief | null) {
  const hasValidTimeRange = !(
    brief?.startAt &&
    brief?.endAt &&
    new Date(brief.endAt).getTime() <= new Date(brief.startAt).getTime()
  )
  return useQuery({
    queryKey: brief ? vbKeys.recommend(brief) : ['venue-rec', 'idle'],
    queryFn: () => api.get<VenueRecommendation[]>(`venues/recommend?${toParams(brief!)}`),
    enabled: !!brief && brief.partySize > 0 && hasValidTimeRange,
    staleTime: 15_000,
  })
}

export function useVenueAvailability(venueId?: string, days = 14) {
  return useQuery({
    queryKey: venueId ? vbKeys.availability(venueId) : ['venue-availability', 'none'],
    queryFn: () => api.get<VenueAvailability>(`venues/${venueId}/availability?days=${days}`),
    enabled: !!venueId,
  })
}

export function useMyVenues() {
  return useQuery({
    queryKey: vbKeys.myVenues(),
    queryFn: () => api.get<OwnedVenue[]>('venues/mine'),
  })
}

export function useMyVenueBookings(role: 'requester' | 'owner') {
  return useQuery({
    queryKey: vbKeys.bookings(role),
    queryFn: () => api.get<VenueBooking[]>(`venue-bookings/mine?role=${role}`),
  })
}

export function useCreateVenueBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateVenueBookingDto) => api.post<VenueBooking>('venue-bookings', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: vbKeys.bookings('requester') }),
  })
}

export function useDecideBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      action,
      message,
    }: {
      id: string
      action: 'confirm' | 'decline'
      message?: string
    }) =>
      action === 'confirm'
        ? api.patch<VenueBooking>(`venue-bookings/${id}/confirm`, { message })
        : api.patch<VenueBooking>(`venue-bookings/${id}/decline`, { message }),
    onSuccess: () => qc.invalidateQueries({ queryKey: vbKeys.bookings('owner') }),
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch<VenueBooking>(`venue-bookings/${id}/cancel`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: vbKeys.bookings('requester') }),
  })
}

export function useCreateVenue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateVenueDto) => api.post<Venue>('venues', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: vbKeys.myVenues() }),
  })
}

export function useUpdateVenue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateVenueDto }) =>
      api.patch<Venue>(`venues/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: vbKeys.myVenues() }),
  })
}
