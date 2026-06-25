import { request } from '@/shared/api/request'

import type { User } from '@rotifolk/shared'
import { readGuestToken } from '@/shared/storage/guestToken'

export async function getMe(): Promise<User> {
  const res = await request<{ user: User }>('auth/me')
  return res.user
}

export async function claimGuestHistory() {
  const guestToken = readGuestToken()
  if (!guestToken) return { claimed: 0 }

  return request<{ claimed: number }>('auth/claim-guest', {
    method: 'POST',
    json: { guestToken },
  })
}
