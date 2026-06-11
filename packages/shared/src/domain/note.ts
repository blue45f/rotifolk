import type { ID, ISODateString, Timestamps } from './common'

/** 쪽지 — 라운드에서 만난 상대(또는 호스트)에게 남기는 메시지. */
export interface PartyNote extends Timestamps {
  id: ID
  partyId: ID
  fromUserId: ID
  fromNickname?: string
  fromAvatarId?: ID | null
  /** 보낸 사람이 직접 업로드한 프로필 사진(data URL). 없으면 이니셜 폴백. */
  fromAvatarImage?: string | null
  toUserId: ID
  roundIndex?: number | null
  body: string
  emoji?: string | null
  shareContact: boolean
  /** null이면 아직 미도착 (noteDelivery='party-end' 대기 중) */
  deliveredAt?: ISODateString | null
  readAt?: ISODateString | null
}

/** 쪽지 스티커 프리셋 — 분위기를 한 글자로. */
export const NOTE_EMOJIS = ['🍷', '☕', '✨', '🌙', '🫶', '😊', '🔥', '🌹', '👋', '💌'] as const
