import { api } from '@infrastructure/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  CreatePartyDto,
  Paginated,
  Participation,
  Party,
  PartyQueryDto,
  PartySummary,
} from '@rotifolk/shared'

export const partyKeys = {
  all: ['parties'] as const,
  list: (q: Partial<PartyQueryDto>) => [...partyKeys.all, 'list', q] as const,
  detail: (id: string) => [...partyKeys.all, 'detail', id] as const,
  mine: ['parties', 'mine'] as const,
  hosted: ['parties', 'hosted'] as const,
}

export function useParties(q: Partial<PartyQueryDto> = {}) {
  return useQuery({
    queryKey: partyKeys.list(q),
    queryFn: () => {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(q)) {
        if (v != null) params.set(k, String(v))
      }
      const query = params.toString()
      return query
        ? api.get<Paginated<PartySummary>>(`parties?${query}`)
        : api.get<Paginated<PartySummary>>('parties')
    },
  })
}

export function useParty(id: string | undefined) {
  return useQuery({
    queryKey: id ? partyKeys.detail(id) : ['parties', 'detail', 'none'],
    queryFn: () => api.get<{ party: Party; participants: Participation[] }>(`parties/${id}`),
    enabled: !!id,
  })
}

export function useCreateParty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreatePartyDto) => api.post<Party>('parties', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partyKeys.all })
    },
  })
}

export function useJoinParty(partyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (note?: string) => api.post<Participation>(`parties/${partyId}/join`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partyKeys.detail(partyId) })
      queryClient.invalidateQueries({ queryKey: partyKeys.mine })
    },
  })
}

export function useCancelJoin(partyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<{ ok: true }>(`parties/${partyId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partyKeys.detail(partyId) })
      queryClient.invalidateQueries({ queryKey: partyKeys.mine })
    },
  })
}

export function useMyParties() {
  return useQuery({
    queryKey: partyKeys.mine,
    queryFn: () =>
      api.get<Array<{ participation: { id: string; status: string }; party: PartySummary }>>(
        'parties/mine'
      ),
  })
}

export function useHostedParties() {
  return useQuery({
    queryKey: partyKeys.hosted,
    queryFn: () => api.get<PartySummary[]>('parties/hosted'),
  })
}

export function usePartyLifecycleActions(partyId: string) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: partyKeys.detail(partyId) })

  return {
    lock: useMutation({
      mutationFn: () => api.post(`parties/${partyId}/lock`),
      onSuccess: invalidate,
    }),
    start: useMutation({
      mutationFn: () => api.post(`parties/${partyId}/start`),
      onSuccess: invalidate,
    }),
    end: useMutation({
      mutationFn: () => api.post(`parties/${partyId}/end`),
      onSuccess: invalidate,
    }),
    plan: useMutation({
      mutationFn: () => api.post(`parties/${partyId}/matching/plan`),
      onSuccess: invalidate,
    }),
  }
}
