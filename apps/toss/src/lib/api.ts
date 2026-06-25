import type {
  Party as SharedParty,
  Participation,
  PartySummary as SharedPartySummary,
} from '@rotifolk/shared'
import type { GuestJoinDto } from '@rotifolk/shared'

import {
  mapPartyDetail,
  mapPartySummary,
  type PartyDetailItem,
  type PartyListItem,
} from '../entities/party/party'

import { request } from '@/shared/api/request'

export type Party = PartyListItem
export type PartyDetail = PartyDetailItem

export interface PartySession {
  party: PartyDetail
  participants: Participation[]
}

export interface GuestJoinBody {
  nickname: string
  avatar?: {
    emoji: string
    hue: string
    imageData?: string | null
  }
}

export interface GuestSessionResult {
  participation: Participation | null
}

export interface GuestMutationResult {
  participation: Participation
  guestToken: string
}

type PartyListPayload = {
  items: SharedPartySummary[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
}

function mapList(payload: unknown): SharedPartySummary[] {
  if (
    payload &&
    typeof payload === 'object' &&
    'items' in (payload as Record<string, unknown>) &&
    Array.isArray((payload as { items?: unknown }).items)
  ) {
    return (payload as { items: unknown[] }).items as SharedPartySummary[]
  }
  return []
}

export async function getParties(
  query: Record<string, string | number | boolean | undefined> = {}
): Promise<Party[]> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v == null) continue
    params.set(k, String(v))
  }
  if (!params.has('pageSize')) params.set('pageSize', '20')

  const payload = await request<PartyListPayload>('parties', {
    query: Object.fromEntries(params.entries()) as Record<string, string>,
  })
  return mapList(payload).map(mapPartySummary)
}

export async function getParty(id: string): Promise<PartySession | undefined> {
  const data = await request<{ party?: SharedParty; participants?: Participation[] }>(
    `parties/${encodeURIComponent(id)}`
  )
  if (!data.party) return undefined

  return {
    party: mapPartyDetail(data.party),
    participants: data.participants ?? [],
  }
}

export async function joinParty(id: string, note?: string): Promise<Participation> {
  return request<Participation>(`parties/${encodeURIComponent(id)}/join`, {
    method: 'POST',
    json: note ? { note } : undefined,
  })
}

export async function cancelPartyJoin(id: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`parties/${encodeURIComponent(id)}/join`, { method: 'DELETE' })
}

export async function lockParty(id: string): Promise<SharedParty> {
  return request<SharedParty>(`parties/${encodeURIComponent(id)}/lock`, { method: 'POST' })
}

export async function startParty(id: string): Promise<SharedParty> {
  return request<SharedParty>(`parties/${encodeURIComponent(id)}/start`, { method: 'POST' })
}

export async function endParty(id: string): Promise<SharedParty> {
  return request<SharedParty>(`parties/${encodeURIComponent(id)}/end`, { method: 'POST' })
}

export async function guestJoin(
  id: string,
  body: GuestJoinBody | GuestJoinDto
): Promise<GuestMutationResult> {
  return request<GuestMutationResult>(`parties/${encodeURIComponent(id)}/guest-join`, {
    method: 'POST',
    json: body,
  })
}

export async function getGuestSession(
  id: string,
  token: string | null
): Promise<GuestSessionResult> {
  if (!token) return { participation: null }
  return request<GuestSessionResult>(`parties/${encodeURIComponent(id)}/guests/me`, {
    query: { token },
  })
}

export async function hostAddGuest(id: string, name: string): Promise<Participation> {
  return request<Participation>(`parties/${encodeURIComponent(id)}/guests`, {
    method: 'POST',
    json: { name },
  })
}

export const won = (n: number) => '₩' + n.toLocaleString('ko-KR')
