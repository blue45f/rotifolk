import { useEffect } from 'react'

import { useAuthStore } from '@/domains/auth/store'
import { getMe } from '@/domains/auth/api'
import { claimGuestHistory } from '@/domains/auth/api'
import { clearGuestToken } from '@/shared/storage/guestToken'

export function useAuthBootstrap() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const hydrateLegacy = useAuthStore((state) => state.hydrateLegacy)
  const setSession = useAuthStore((state) => state.setSession)
  const clear = useAuthStore((state) => state.clear)

  useEffect(() => {
    hydrateLegacy()
  }, [hydrateLegacy])

  useEffect(() => {
    if (!token || user) return

    let cancelled = false
    void getMe()
      .then((me) => {
        if (cancelled) return
        setSession(token, me)
        void claimGuestHistory()
          .then((res) => {
            if (!res.claimed) return
            clearGuestToken()
          })
          .catch(() => {
            // keep token; next auth refresh 시도
          })
      })
      .catch(() => {
        if (cancelled) return
        clear()
      })

    return () => {
      cancelled = true
    }
  }, [clear, setSession, token, user])
}
