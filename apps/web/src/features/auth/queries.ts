import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { LoginDto, SignUpDto, User } from '@rotifolk/shared'
import { api } from '@services/api'
import { useAuthStore } from '@store/authStore'
import { disconnectSocket } from '@features/live/socket'
import { claimGuestHistory } from '@features/guest/queries'

export const authKeys = {
  me: ['auth', 'me'] as const,
  config: ['auth', 'config'] as const,
}

/** 게스트로 참여한 이력이 있으면 세션 확보 직후 내 계정으로 연결한다(게스트 → 회원 전환). */
function claimGuestHistoryAfterAuth(queryClient: QueryClient) {
  void claimGuestHistory().then((claimed) => {
    if (claimed > 0) {
      queryClient.invalidateQueries({ queryKey: ['parties', 'mine'] })
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    }
  })
}

// 공개 설정(Google 클라이언트 ID 노출 여부). null 이면 버튼 숨김.
export function useAuthConfig() {
  return useQuery({
    queryKey: authKeys.config,
    queryFn: () => api.get<{ googleClientId: string | null }>('auth/config'),
    staleTime: Infinity,
  })
}

export function useGoogleLogin() {
  const queryClient = useQueryClient()
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: (credential: string) =>
      api.post<{ token: string; user: User }>('auth/google', { credential }),
    onSuccess: (data) => {
      setSession(data)
      queryClient.setQueryData(authKeys.me, { user: data.user })
      claimGuestHistoryAfterAuth(queryClient)
    },
  })
}

export function useSignUp() {
  const queryClient = useQueryClient()
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: (dto: SignUpDto & { referralCode?: string }) =>
      api.post<{ token: string; user: User }>('auth/signup', dto),
    onSuccess: (data) => {
      setSession(data)
      queryClient.setQueryData(authKeys.me, { user: data.user })
      claimGuestHistoryAfterAuth(queryClient)
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: (dto: LoginDto) => api.post<{ token: string; user: User }>('auth/login', dto),
    onSuccess: (data) => {
      setSession(data)
      queryClient.setQueryData(authKeys.me, { user: data.user })
      claimGuestHistoryAfterAuth(queryClient)
    },
  })
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => api.get<{ user: User }>('auth/me'),
    enabled,
    staleTime: 60_000,
  })
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear)
  const queryClient = useQueryClient()
  return () => {
    disconnectSocket()
    clear()
    queryClient.clear()
  }
}
