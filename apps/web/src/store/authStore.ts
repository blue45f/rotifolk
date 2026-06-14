import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import type { User } from '@rotifolk/shared'

interface AuthState {
  token: string | null
  user: User | null
  setSession: (payload: { token: string; user: User }) => void
  updateUser: (patch: Partial<User>) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setSession: ({ token, user }) => set({ token, user }),
      updateUser: (patch) => {
        const u = get().user
        if (!u) return
        set({ user: { ...u, ...patch } })
      },
      clear: () => set({ token: null, user: null }),
    }),
    {
      name: 'rotifolk-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export const useIsAuthed = () => useAuthStore((s) => !!s.token && !!s.user)
export const useCurrentUser = () => useAuthStore((s) => s.user)
