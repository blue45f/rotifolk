import { describe, expect, it } from 'vitest'

import { channelsFromLegacyMode, legacyModeFromChannels } from './party'

describe('channelsFromLegacyMode', () => {
  it('phone → [phone]', () => {
    expect(channelsFromLegacyMode('phone')).toEqual(['phone'])
  })
  it('both → [chat, phone]', () => {
    expect(channelsFromLegacyMode('both')).toEqual(['chat', 'phone'])
  })
  it('chat(기본) → [chat]', () => {
    expect(channelsFromLegacyMode('chat')).toEqual(['chat'])
  })
})

describe('legacyModeFromChannels', () => {
  it('인앱(chat)만 → chat', () => {
    expect(legacyModeFromChannels(['chat'])).toBe('chat')
  })
  it('인앱 + 외부 채널 → both', () => {
    expect(legacyModeFromChannels(['chat', 'phone'])).toBe('both')
    expect(legacyModeFromChannels(['chat', 'kakao'])).toBe('both')
    expect(legacyModeFromChannels(['chat', 'instagram'])).toBe('both')
  })
  it('외부 채널만(인앱 없음) → phone', () => {
    expect(legacyModeFromChannels(['phone'])).toBe('phone')
    expect(legacyModeFromChannels(['kakao'])).toBe('phone')
    expect(legacyModeFromChannels(['kakao', 'instagram'])).toBe('phone')
  })
  it('빈 배열 → chat(기본값)', () => {
    expect(legacyModeFromChannels([])).toBe('chat')
  })
})

describe('connectionMode ↔ channels 라운드트립', () => {
  it('레거시 모드를 채널로 변환 후 다시 모드로 — 의미 보존', () => {
    for (const mode of ['chat', 'phone', 'both'] as const) {
      expect(legacyModeFromChannels(channelsFromLegacyMode(mode))).toBe(mode)
    }
  })
})
