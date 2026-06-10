import type { ID } from './common'
import { AVATAR_MOODS } from './avatar'

/**
 * 게스트(비로그인) 참가자 식별 — 참가 행(Participation)에 userId가 없으므로
 * `guest:<participationId>` 합성 키를 라운드 memberIds·로스터·체크인 경로에서
 * 일반 userId와 동일한 형태로 사용한다(매칭 모듈 계약 변경 없음).
 */
export const GUEST_KEY_PREFIX = 'guest:'

export function guestParticipantKey(participationId: ID): string {
  return `${GUEST_KEY_PREFIX}${participationId}`
}

export function isGuestParticipantKey(key: string | null | undefined): boolean {
  return !!key && key.startsWith(GUEST_KEY_PREFIX)
}

/** `guest:<id>` → participationId. 게스트 키가 아니면 null. */
export function participationIdFromGuestKey(key: string): ID | null {
  return isGuestParticipantKey(key) ? key.slice(GUEST_KEY_PREFIX.length) : null
}

/** 게스트 아바타 — 기존 아바타 모듈 프리셋(무드 이모지 + 브랜드 휴)을 재사용한다. */
export interface GuestAvatar {
  emoji: string
  hue: string
}

/** 아바타 모듈과 동일한 브랜드 휴 팔레트 (auth 기본 아바타와 같은 소스). */
export const AVATAR_HUE_PRESETS = [
  '#7A1F3D',
  '#C9627F',
  '#D4A24C',
  '#6B8E5A',
  '#2F7884',
  '#6E5BB3',
] as const

/** 게스트가 고를 수 있는 프리셋 — 무드 이모지 × 휴 팔레트 조합. */
export const GUEST_AVATAR_PRESETS: GuestAvatar[] = AVATAR_MOODS.map((mood, i) => ({
  emoji: mood.emoji,
  hue: AVATAR_HUE_PRESETS[i % AVATAR_HUE_PRESETS.length],
}))

/** 이름 기반 결정적 프리셋 배정 — 현장 등록(이름만 입력) 시 자동 아바타. */
export function pickGuestAvatar(seed: string): GuestAvatar {
  const salt = [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return GUEST_AVATAR_PRESETS[salt % GUEST_AVATAR_PRESETS.length]
}

/** 회원/게스트 공용 표시 이름 — 로스터·라이브 파트너 카드에서 같은 규칙을 쓴다. */
export function participantDisplayName(p: {
  user?: { nickname: string } | null
  guestName?: string | null
}): string {
  return p.user?.nickname ?? p.guestName ?? '익명'
}
