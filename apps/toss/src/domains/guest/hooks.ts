import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuthStore } from '@/domains/auth/store'
import { guestJoin, getGuestSession, type GuestSessionResult, type GuestJoinBody } from '@/lib/api'
import { clearGuestToken, readGuestToken, setGuestToken } from '@/shared/storage/guestToken'

import { makeGuestAvatar, type GuestAvatar } from '@/shared/avatars/constants'

export function useGuestSession(partyId: string | undefined) {
  const [session, setSession] = useState<GuestSessionResult['participation']>(null)
  const me = useAuthStore((state) => state.user)
  const token = me ? null : readGuestToken()

  useEffect(() => {
    let alive = true
    if (!partyId || !token) {
      setSession(null)
      return
    }

    void getGuestSession(partyId, token)
      .then((res) => {
        if (!alive) return
        setSession(res.participation)
      })
      .catch(() => {
        if (!alive) return
        setSession(null)
      })

    return () => {
      alive = false
    }
  }, [partyId, token])

  return session
}

export function useGuestJoin() {
  const [busy, setBusy] = useState(false)

  const mutate = useCallback(async (partyId: string, body: GuestJoinBody) => {
    setBusy(true)
    try {
      const res = await guestJoinWithToken(partyId, body)
      return res
    } finally {
      setBusy(false)
    }
  }, [])

  return { mutate, busy }
}

async function guestJoinWithToken(partyId: string, body: GuestJoinBody) {
  const token = readGuestToken()
  const payload = token ? { ...body, token } : body
  const res = await guestJoin(partyId, payload)
  setGuestToken(res.guestToken)
  return res
}

export function useGuestSeed(name: string, fallbackIndex = 0) {
  const avatar = useMemo<GuestAvatar>(
    () => makeGuestAvatar(name || '게스트', fallbackIndex),
    [name, fallbackIndex]
  )
  return avatar
}

export function useGuestLogout() {
  return useCallback(() => {
    clearGuestToken()
  }, [])
}
