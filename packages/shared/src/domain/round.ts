import type { ID, ISODateString, Timestamps } from './common'

export type RoundStatus = 'queued' | 'live' | 'finished'

export interface Round extends Timestamps {
  id: ID
  partyId: ID
  index: number               // 1부터
  status: RoundStatus
  startedAt?: ISODateString | null
  finishedAt?: ISODateString | null
  durationSec: number
  pairs: Pair[]
}

export interface Pair {
  id: ID
  roundId: ID
  seatLabel: string           // e.g. "A", "B-1"
  memberIds: ID[]             // 2~3명
}

export type FinalMatchResult =
  | 'mutual'      // 양쪽 모두 선택
  | 'pending'     // 한쪽만 선택
  | 'declined'    // 둘 다 선택 안 함

export interface FinalMatchVote {
  id: ID
  partyId: ID
  fromUserId: ID
  toUserId: ID
  createdAt: ISODateString
}

export interface FinalMatch {
  id: ID
  partyId: ID
  userAId: ID
  userBId: ID
  result: FinalMatchResult
  matchedAt: ISODateString
}
