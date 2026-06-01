import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LoginDto, SignUpDto, User } from '@rotifolk/shared'
import { api } from '@services/api'
import { useAuthStore } from '@store/authStore'
import { disconnectSocket } from '@features/live/socket'

export const authKeys = {
  me: ['auth', 'me'] as const,
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
