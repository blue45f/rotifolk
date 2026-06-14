import { beforeEach, describe, expect, it } from 'vitest'

import { clearGuestToken, getGuestToken, setGuestToken } from './guestSession'

describe('guestSession', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores and reads the guest token under the rotifolk key', () => {
    expect(getGuestToken()).toBeNull()
    setGuestToken('tok_1234567890')
    expect(localStorage.getItem('rotifolk-guest-token')).toBe('tok_1234567890')
    expect(getGuestToken()).toBe('tok_1234567890')
  })

  it('clears the token', () => {
    setGuestToken('tok_1234567890')
    clearGuestToken()
    expect(getGuestToken()).toBeNull()
  })
})
