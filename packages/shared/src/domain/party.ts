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

export type PartyStatus =
  | 'draft'
  | 'open'
  | 'full'
  | 'locked'
  | 'live'
  | 'ended'
  | 'cancelled'

export type RotationMode =
  | 'round-robin-pair'      // 1:1 라운드 로빈 — 짝수 인원, 모두가 모두를 한 번씩
  | 'round-robin-trio'      // 3인 1조 로테이션
  | 'speed-circle'          // 원형 회전 (스피드데이팅 클래식)
  | 'random-shuffle'        // 라운드마다 랜덤 셔플
  | 'host-curated'          // 호스트가 직접 매칭 지정

/** 음료 제공 패키지. */
export type DrinkPackage =
  | 'none'         // 음료 없음 (테이크아웃/상권 자유 이용)
  | 'per-glass'    // 잔당 결제 — 메뉴에서 골라서 추가 주문
  | 'unlimited'    // 시간 내 무제한 — 리필 요청만 보냄, 추가 비용 없음
  | 'paired'       // 라운드마다 페어링 음료가 코스로 나옴 (호스트 큐레이션)

/** 안주/디저트 제공 패키지. */
export type SnackPackage =
  | 'none'
  | 'per-plate'    // 접시당 결제
  | 'course'       // 셰프 코스 (정해진 양·시점)
  | 'pairing-bites' // 음료에 맞춰 소량 페어링 제공

export interface PartyConfig {
  category: PartyCategory
  rotationMode: RotationMode
  roundDurationSec: number
  totalRounds: number
  breakBetweenRoundsSec: number
  enableMidMatching: boolean   // 라운드별 "괜찮았어요" 투표
  enableFinalMatching: boolean // 종료 직전 최종 매칭
  enableQuiz: boolean
  enableQuestionCards: boolean
  enableLiveOrders: boolean
  enableAvatarOnly: boolean    // 실명 대신 아바타+닉네임만 노출
}

export interface PartyPricing {
  basePriceKRW: number
  drinkPackage: DrinkPackage
  snackPackage: SnackPackage
  refundDeadlineHours: number
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
  tags: string[]
  ageMin?: number | null
  ageMax?: number | null
  genderRatio?: '5:5' | 'any' | null
}

export interface PartySummary
  extends Pick<
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
  venueName: string
  venueArea: string
  basePriceKRW: number
  drinkPackage: DrinkPackage
  snackPackage: SnackPackage
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
