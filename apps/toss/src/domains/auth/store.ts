import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import type { User } from '@rotifolk/shared'

import { readAuthSession } from '@/shared/storage/authToken'

interface AuthState {
  token: string | null
  user: User | null
  setSession: (token: string, user: User) => void
  clear: () => void
  hydrateLegacy: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      clear: () => set({ token: null, user: null }),
      hydrateLegacy: () => {
        const legacy = readAuthSession()
        set((state) => {
          if (!legacy.token) return state.user ? state : { ...state, token: null }
          return {
            ...state,
            token: state.token || legacy.token,
            user: state.user || legacy.user,
          }
        })
      },
    }),
    {
      name: 'toss-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
