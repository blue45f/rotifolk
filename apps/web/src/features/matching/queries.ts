import { useQuery } from '@tanstack/react-query'
import type { ConnectionChannel } from '@rotifolk/shared'
import { api } from '@services/api'

export type MatchResult = 'mutual' | 'top-pick' | 'all'

/** 매칭별 연결 채널. handle은 양쪽이 공개에 동의했을 때만 채워짐(chat은 인앱이라 항상 null). */
export interface MatchChannel {
  channel: ConnectionChannel
  handle: string | null
}

export interface PartyMatch {
  partnerId: string
  nickname: string
  avatarId: string | null
  result: MatchResult
  /** 이 인연과 이어질 수 있는 채널들 (호스트 정책 ∩ 상호 동의). */
  channels: MatchChannel[]
}

export interface MyPartyMatches {
  scope: 'mutual-only' | 'top-n' | 'all-participants' | string
  /** 호스트가 이 파티에서 제공한 연결 채널 (다중). */
  connectionChannels: ConnectionChannel[]
  groupAfterParty: boolean
  matches: PartyMatch[]
}

export interface PopularPerson {
  userId: string
  nickname: string
  avatarId: string | null
  likes: number
}

export interface PopularToday {
  revealPopular: boolean
  popularMale: PopularPerson | null
  popularFemale: PopularPerson | null
}

export function useMyPartyMatches(partyId?: string) {
  return useQuery({
    queryKey: ['party-matches', partyId],
    queryFn: () => api.get<MyPartyMatches>(`parties/${partyId}/matching/my-matches`),
    enabled: !!partyId,
  })
}

export function usePartyPopular(partyId?: string) {
  return useQuery({
    queryKey: ['party-popular', partyId],
    queryFn: () => api.get<PopularToday>(`parties/${partyId}/matching/popular`),
    enabled: !!partyId,
  })
}
