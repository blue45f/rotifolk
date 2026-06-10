import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GuestJoinDto, Participation } from '@rotifolk/shared'
import { api } from '@services/api'
import { partyKeys } from '@features/parties/queries'
import { clearGuestToken, getGuestToken, setGuestToken } from './guestSession'

export const guestKeys = {
  session: (partyId: string, token: string | null) =>
    ['guest', 'session', partyId, token ?? 'none'] as const,
}

/** 이 파티에 내 기기 토큰으로 합류한 게스트 참가가 있는지 (재방문 식별). */
export function useGuestSession(partyId: string | undefined) {
  const token = getGuestToken()
  return useQuery({
    queryKey: guestKeys.session(partyId ?? 'none', token),
    queryFn: () =>
      api.get<{ participation: Participation | null }>(`parties/${partyId}/guests/me`, {
        searchParams: { token: token ?? '' },
      }),
    enabled: !!partyId && !!token,
    staleTime: 30_000,
  })
}

/** 게스트(비로그인) 링크 합류 — 성공 시 토큰을 localStorage에 저장한다. */
export function useGuestJoin(partyId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: Omit<GuestJoinDto, 'token'>) =>
      api.post<{ participation: Participation; guestToken: string }>(
        `parties/${partyId}/guest-join`,
        { ...dto, token: getGuestToken() ?? undefined },
      ),
    onSuccess: (data) => {
      setGuestToken(data.guestToken)
      if (partyId) {
        queryClient.invalidateQueries({ queryKey: partyKeys.detail(partyId) })
        queryClient.invalidateQueries({ queryKey: ['guest', 'session', partyId] })
      }
    },
  })
}

/** 현장 합류 — 호스트가 이름만으로 게스트를 즉석 등록. */
export function useHostAddGuest(partyId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post<Participation>(`parties/${partyId}/guests`, { name }),
    onSuccess: () => {
      if (partyId) queryClient.invalidateQueries({ queryKey: partyKeys.detail(partyId) })
    },
  })
}

/**
 * 가입/로그인 직후 게스트 참여 이력을 내 계정으로 연결.
 * 토큰이 없으면 no-op. 성공하면 토큰을 소진해 중복 클레임을 막는다.
 */
export async function claimGuestHistory(): Promise<number> {
  const guestToken = getGuestToken()
  if (!guestToken) return 0
  try {
    const res = await api.post<{ claimed: number }>('auth/claim-guest', { guestToken })
    clearGuestToken()
    return res.claimed
  } catch {
    // 클레임 실패는 가입 흐름을 막지 않는다 — 토큰을 남겨 다음 로그인에 재시도.
    return 0
  }
}
