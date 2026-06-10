import { describe, expect, it } from 'vitest'
import {
  GUEST_AVATAR_PRESETS,
  guestParticipantKey,
  isGuestParticipantKey,
  participantDisplayName,
  participationIdFromGuestKey,
  pickGuestAvatar,
} from './guest'

describe('guest participant key', () => {
  it('roundtrips participationId through the synthetic key', () => {
    const key = guestParticipantKey('pt_123')
    expect(key).toBe('guest:pt_123')
    expect(isGuestParticipantKey(key)).toBe(true)
    expect(participationIdFromGuestKey(key)).toBe('pt_123')
  })

  it('does not treat normal userIds as guest keys', () => {
    expect(isGuestParticipantKey('u_abc')).toBe(false)
    expect(isGuestParticipantKey(null)).toBe(false)
    expect(participationIdFromGuestKey('u_abc')).toBeNull()
  })
})

describe('pickGuestAvatar', () => {
  it('is deterministic for the same name and stays in presets', () => {
    const a = pickGuestAvatar('하늘')
    const b = pickGuestAvatar('하늘')
    expect(a).toEqual(b)
    expect(GUEST_AVATAR_PRESETS).toContainEqual(a)
  })
})

describe('participantDisplayName', () => {
  it('prefers member nickname, then guest name, then anonymous', () => {
    expect(participantDisplayName({ user: { nickname: '소믈리에' } })).toBe('소믈리에')
    expect(participantDisplayName({ guestName: '카톡게스트' })).toBe('카톡게스트')
    expect(participantDisplayName({})).toBe('익명')
  })
})
