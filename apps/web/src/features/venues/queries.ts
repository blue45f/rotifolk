import { useQuery } from '@tanstack/react-query'
import type { MenuItem, Venue, VenueSearchDto } from '@rotifolk/shared'
import { api } from '@services/api'

export const venueKeys = {
  list: (q: Partial<VenueSearchDto>) => ['venues', 'list', q] as const,
  areas: ['venues', 'areas'] as const,
  detail: (id: string) => ['venues', 'detail', id] as const,
  menu: (id: string) => ['venues', 'menu', id] as const,
}

export function useVenues(q: Partial<VenueSearchDto> = {}) {
  return useQuery({
    queryKey: venueKeys.list(q),
    queryFn: () => {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(q)) {
        if (v != null) params.set(k, String(v))
      }
      return api.get<Venue[]>(`venues${params.toString() ? `?${params}` : ''}`)
    },
  })
}

export function useVenueAreas() {
  return useQuery({
    queryKey: venueKeys.areas,
    queryFn: () => api.get<string[]>('venues/areas'),
    staleTime: 10 * 60_000,
  })
}

export function useVenue(id?: string) {
  return useQuery({
    queryKey: id ? venueKeys.detail(id) : ['venues', 'detail', 'none'],
    queryFn: () => api.get<{ venue: Venue; menu: MenuItem[] }>(`venues/${id}`),
    enabled: !!id,
  })
}

export function useVenueMenu(id?: string) {
  return useQuery({
    queryKey: id ? venueKeys.menu(id) : ['venues', 'menu', 'none'],
    queryFn: () => api.get<MenuItem[]>(`venues/${id}/menu`),
    enabled: !!id,
  })
}
