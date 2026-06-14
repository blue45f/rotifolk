import { api } from '@infrastructure/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { CreateNoteDto, PartyNote } from '@rotifolk/shared'

export const noteKeys = {
  all: ['notes'] as const,
  mine: ['notes', 'mine'] as const,
  party: (partyId: string) => ['notes', 'party', partyId] as const,
}

/** 쪽지함 — 나에게 도착한 쪽지 */
export function useMyNotes() {
  return useQuery({
    queryKey: noteKeys.mine,
    queryFn: () => api.get<PartyNote[]>('notes/mine'),
  })
}

/** 특정 파티에서 주고받은 쪽지 (받은/보낸) */
export function usePartyNotes(partyId: string | undefined) {
  return useQuery({
    queryKey: partyId ? noteKeys.party(partyId) : ['notes', 'party', 'none'],
    queryFn: () => api.get<{ received: PartyNote[]; sent: PartyNote[] }>(`notes/party/${partyId}`),
    enabled: !!partyId,
  })
}

/** 쪽지 보내기 */
export function useSendNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateNoteDto) => api.post<PartyNote>('notes', dto),
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: noteKeys.mine })
      qc.invalidateQueries({ queryKey: noteKeys.party(note.partyId) })
    },
  })
}

/** 쪽지 일괄 전달 (호스트) — 파티 종료 시 대기 중인 쪽지를 한꺼번에 도착시킨다. */
export function useDeliverNotes(partyId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ delivered: number }>(`notes/party/${partyId}/deliver`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteKeys.mine })
      if (partyId) qc.invalidateQueries({ queryKey: noteKeys.party(partyId) })
    },
  })
}

/** 쪽지 읽음 처리 */
export function useMarkNoteRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch<PartyNote>(`notes/${id}/read`, {}),
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: noteKeys.mine })
      qc.invalidateQueries({ queryKey: noteKeys.party(note.partyId) })
    },
  })
}
