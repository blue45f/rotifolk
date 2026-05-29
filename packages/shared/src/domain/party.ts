import type { ID, ISODateString, Timestamps } from './common'
import type { PublicUser } from './user'

export type PartyCategory =
  | 'wine'
  | 'coffee'
  | 'tea'
  | 'whisky'
  | 'cocktail'
  | 'beer'
  | 'sake'
  | 'natural-wine'
  | 'dessert'
  | 'custom'

export type PartyStatus = 'draft' | 'open' | 'full' | 'locked' | 'live' | 'ended' | 'cancelled'

export type RotationMode =
  | 'round-robin-pair' // 1:1 라운드 로빈 — 짝수 인원, 모두가 모두를 한 번씩
  | 'round-robin-trio' // 3인 1조 로테이션
  | 'speed-circle' // 원형 회전 (스피드데이팅 클래식)
  | 'random-shuffle' // 라운드마다 랜덤 셔플
  | 'host-curated' // 호스트가 직접 매칭 지정

/** 모임 포맷 — 로테이션 외 다양한 오프라인 이성 모임. */
export type PartyFormat =
  | 'rotation' // 5분 라운드 회전 매칭
  | 'note-ting' // 쪽지팅 — 자유 밍글 + 쪽지 교환
  | 'mixer' // 자유 소셜 믹서

export const PARTY_FORMAT_LABEL: Record<PartyFormat, string> = {
  rotation: '로테이션 파티',
  'note-ting': '쪽지팅',
  mixer: '믹서',
}

/** 대화 구조 — 한 라운드에서 만나는 인원 구성. */
export type RotationFormat =
  | 'one-on-one' // 1:1
  | 'many-to-one' // N:1 (핫시트 — 한 명을 그룹이 둘러싼다)
  | 'many-to-many' // N:N (그룹 테이블 회전)

export const ROTATION_FORMAT_LABEL: Record<RotationFormat, string> = {
  'one-on-one': '1:1 대화',
  'many-to-one': 'N:1 핫시트',
  'many-to-many': 'N:N 그룹',
}

/** 매칭 결과 범위. */
export type MatchScope =
  | 'mutual-only' // 서로 지목한 상호 매칭만
  | 'top-n' // 누적 호감 상위 N명까지 연결(상호 아니어도)
  | 'all-participants' // 참가자 전원 연결

/** 연결 매체. */
export type ConnectionMode = 'chat' | 'phone' | 'both'

/** 쪽지 도착 시점. */
export type NoteDelivery = 'instant' | 'party-end'

/** 음료 제공 패키지. */
export type DrinkPackage = 'none' | 'per-glass' | 'unlimited' | 'paired'

/** 안주/디저트 제공 패키지. */
export type SnackPackage = 'none' | 'per-plate' | 'course' | 'pairing-bites'

export interface PartyConfig {
  category: PartyCategory
  rotationMode: RotationMode
  roundDurationSec: number
  totalRounds: number
  breakBetweenRoundsSec: number
  enableMidMatching: boolean
  enableFinalMatching: boolean
  enableQuiz: boolean
  enableQuestionCards: boolean
  enableLiveOrders: boolean
  enableAvatarOnly: boolean

  // ── 포맷 & 대화 구조 ──
  format: PartyFormat
  rotationFormat: RotationFormat
  groupSize: number

  // ── 매칭 결과 정책 ──
  matchScope: MatchScope
  maxMatchesPerPerson: number
  connectionMode: ConnectionMode
  groupAfterParty: boolean

  // ── 쪽지 & 대화 도우미 ──
  enableNotes: boolean
  noteDelivery: NoteDelivery
  enableConversationKit: boolean
}

export interface PartyPricing {
  basePriceKRW: number
  drinkPackage: DrinkPackage
  snackPackage: SnackPackage
  refundDeadlineHours: number
}

/** 모집 규모 · 성비 · 자동 취소 정책. */
export interface PartyRecruitment {
  /** 목표 남:여 성비 "any" | "1:1" | "5:3" 등. 소수 성별 비례 하한. */
  genderRatioTarget: string
  ratioTolerance: number
  maleCap?: number | null
  femaleCap?: number | null
  minMale?: number | null
  minFemale?: number | null
  autoCancelAt?: ISODateString | null
  autoCancelReason?: string | null
}

export interface Party extends Timestamps {
  id: ID
  title: string
  description: string
  hostId: ID
  host?: PublicUser
  venueId: ID
  coverImageUrl?: string | null
  startAt: ISODateString
  endAt: ISODateString
  minParticipants: number
  maxParticipants: number
  currentParticipants: number
  status: PartyStatus
  config: PartyConfig
  pricing: PartyPricing
  recruitment: PartyRecruitment
  tags: string[]
  ageMin?: number | null
  ageMax?: number | null
  genderRatio?: '5:5' | 'any' | null
}

export interface PartySummary extends Pick<
  Party,
  | 'id'
  | 'title'
  | 'coverImageUrl'
  | 'startAt'
  | 'currentParticipants'
  | 'maxParticipants'
  | 'status'
  | 'tags'
> {
  category: PartyCategory
  format: PartyFormat
  venueName: string
  venueArea: string
  basePriceKRW: number
  drinkPackage: DrinkPackage
  snackPackage: SnackPackage
  hostId: ID
  hostNickname: string
}

export type ParticipationStatus =
  | 'pending'
  | 'confirmed'
  | 'waitlist'
  | 'checked-in'
  | 'cancelled'
  | 'no-show'

export interface Participation extends Timestamps {
  id: ID
  partyId: ID
  userId: ID
  status: ParticipationStatus
  seatNumber?: number | null
  checkedInAt?: ISODateString | null
  user?: PublicUser
}
