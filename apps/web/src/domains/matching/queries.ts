import { api } from '@infrastructure/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  ConnectionChannel,
  ContactExchangeChannelState,
  ContactExchangePolicy,
  ContactExchangeRequestStatus,
  MatchScope,
} from '@rotifolk/shared'

export type MatchResult = 'mutual' | 'top-pick' | 'all'

/** 매칭별 연결 채널. handle은 양쪽이 공개에 동의했을 때만 채워짐(chat은 인앱이라 항상 null). */
export interface MatchChannel {
  channel: ConnectionChannel
  handle: string | null
  state?: ContactExchangeChannelState
  requestId?: string | null
  requestedBy?: 'me' | 'them' | null
  canRequest?: boolean
}

export interface PartyMatch {
  partnerId: string
  nickname: string
  avatarId: string | null
  /** 상대가 직접 업로드한 프로필 사진(data URL) — 없으면 프리셋 폴백. */
  avatarImage?: string | null
  result: MatchResult
  /** 이 인연과 이어질 수 있는 채널들 (호스트 정책 ∩ 상호 동의). */
  channels: MatchChannel[]
  /** 전화 채널이 양쪽 동의로 공유됐을 때의 번호(아니면 null). channels에서 파생된 편의 필드. */
  phone?: string | null
  /** 서로 간의 궁합 (MBTI·관심사·띠 기반). factors는 점수에 기여한 근거 목록. */
  compatibility?: { score: number; title: string; blurb: string; factors?: string[] }
  /** 본인인증 완료 여부 (신뢰 신호). */
  verified?: boolean
}

export interface MyPartyMatches {
  scope: MatchScope
  contactExchangePolicy: ContactExchangePolicy
  /** 호스트가 이 파티에서 제공한 연결 채널 (다중). */
  connectionChannels: ConnectionChannel[]
  groupAfterParty: boolean
  /** 오늘의 인기남/인기녀 요약 (popular 엔드포인트와 동일 데이터, 응답에 함께 실림). */
  popularity?: { popularMale: PopularPerson | null; popularFemale: PopularPerson | null }
  /** 내가 받은 호감 수 (본인에게만 보여주는 요약). */
  myLikesReceived?: number
  matches: PartyMatch[]
}

export interface PopularPerson {
  userId: string
  nickname: string
  avatarId: string | null
  /** 직접 업로드한 프로필 사진(data URL) — 없으면 프리셋 폴백. */
  avatarImage?: string | null
  /** 받은 호감 수. 본인이 호감 수 공개를 끄면 null. */
  likes: number | null
}

export interface PopularToday {
  revealPopular: boolean
  popularMale: PopularPerson | null
  popularFemale: PopularPerson | null
}

export interface ContactExchangeRequestResult {
  requestId: string
  status: ContactExchangeRequestStatus
  channel: ConnectionChannel
  decidedById?: string | null
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

export function useRequestContactExchange(partyId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ partnerId, channel }: { partnerId: string; channel: ConnectionChannel }) =>
      api.post<ContactExchangeRequestResult>(
        `parties/${partyId}/matching/contact-requests/${partnerId}`,
        { channel }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party-matches', partyId] })
    },
  })
}

export function useDecideContactExchangeRequest(partyId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: 'approve' | 'reject' }) =>
      api.post<ContactExchangeRequestResult>(
        `parties/${partyId}/matching/contact-requests/${requestId}/decision`,
        { action }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party-matches', partyId] })
    },
  })
}
