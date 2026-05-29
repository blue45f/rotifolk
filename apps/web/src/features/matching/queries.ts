import { useQuery } from '@tanstack/react-query'
import { api } from '@services/api'

export type MatchResult = 'mutual' | 'top-pick' | 'all'

export interface PartyMatch {
  partnerId: string
  nickname: string
  avatarId: string | null
  result: MatchResult
  /** connectionMode가 phone/both이고 양쪽이 연락처 공개에 동의했을 때만 채워짐 */
  phone: string | null
}

export interface MyPartyMatches {
  scope: 'mutual-only' | 'top-n' | 'all-participants' | string
  connectionMode: 'chat' | 'phone' | 'both' | string
  groupAfterParty: boolean
  matches: PartyMatch[]
}

export function useMyPartyMatches(partyId?: string) {
  return useQuery({
    queryKey: ['party-matches', partyId],
    queryFn: () => api.get<MyPartyMatches>(`parties/${partyId}/matching/my-matches`),
    enabled: !!partyId,
  })
}
