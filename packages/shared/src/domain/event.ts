import type { ID, ISODateString, Timestamps } from './common'

export type LiveEventKind =
  | 'cheers'           // 다 같이 건배
  | 'reveal'           // 정체 공개 (아바타 모드)
  | 'mini-game'        // 미니 게임 시작
  | 'shuffle'          // 강제 셔플
  | 'photo-time'       // 단체 사진
  | 'announcement'     // 호스트 공지
  | 'compliment-rain'  // 칭찬 폭우 (모두에게 익명 칭찬 카드)
  | 'gift-card'        // 즉석 선물 카드

export interface LiveEvent extends Timestamps {
  id: ID
  partyId: ID
  kind: LiveEventKind
  payload?: Record<string, unknown>
  triggeredBy: ID            // hostId
  triggeredAt: ISODateString
  expiresAt?: ISODateString | null
}
