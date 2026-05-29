import type { ID, ISODateString, Timestamps } from './common'
import type { PartyCategory } from './party'
import type { Venue } from './venue'

export type VenueBookingStatus =
  | 'requested' // 호스트가 섭외 요청
  | 'confirmed' // 사장님 확정 (또는 instantBook 즉시 확정)
  | 'declined' // 사장님 거절
  | 'cancelled' // 호스트 취소
  | 'completed' // 이용 완료

export const VENUE_BOOKING_STATUS_LABEL: Record<VenueBookingStatus, string> = {
  requested: '요청 중',
  confirmed: '확정',
  declined: '거절됨',
  cancelled: '취소됨',
  completed: '이용 완료',
}

/** 가격 견적 — 시간 × 단가 × 배수 − 할인 + 청소비, 수수료 별도 표기. */
export interface VenueQuote {
  hours: number
  baseKRW: number // 시간당 단가 × 시간
  multiplier: number // 적용된 배수(주말/피크)
  weekendApplied: boolean
  peakApplied: boolean
  lastMinuteRate: number // 막판 할인율 (0~0.15)
  discountKRW: number
  cleaningFeeKRW: number
  subtotalKRW: number // 할인 반영 + 청소비 (호스트 부담 합)
  feeKRW: number // 플랫폼 수수료 (정보 표기)
  totalKRW: number
}

export interface VenueBooking extends Timestamps {
  id: ID
  venueId: ID
  venueName?: string
  venueArea?: string
  venuePhoto?: string | null
  requesterId: ID
  requesterNickname?: string
  ownerId?: ID | null
  partyId?: ID | null
  startAt: ISODateString
  endAt: ISODateString
  partySize: number
  category: PartyCategory
  noteToOwner?: string | null
  status: VenueBookingStatus
  // 가격 스냅샷
  hours: number
  baseKRW: number
  multiplier: number
  discountKRW: number
  cleaningFeeKRW: number
  totalKRW: number
  ownerMessage?: string | null
  decidedAt?: ISODateString | null
  /** 확정된 예약에서만 노출되는 도착 가이드 */
  arrivalGuide?: import('./venue').ArrivalGuide | null
}

/** 추천 점수 + 사람이 읽는 근거. */
export interface VenueFitReason {
  icon: string
  text: string
  /** positive(강점) | neutral(참고) | caution(주의) */
  tone: 'positive' | 'neutral' | 'caution'
}

export interface VenueFit {
  score: number // 0~100
  grade: 'perfect' | 'great' | 'good' | 'fair'
  reasons: VenueFitReason[]
}

export interface VenueRecommendation {
  venue: Venue
  fit: VenueFit
  quote?: VenueQuote | null
  available?: boolean
  distanceKm?: number | null
}

export type OffHoursKind =
  | 'after-close' // 마감 후 야간
  | 'closed-day' // 정기 휴무일
  | 'weekend' // 주말 낮/저녁
  | 'daytime-gap' // 평일 한산한 낮

export interface OffHoursSlot {
  startAt: ISODateString
  endAt: ISODateString
  kind: OffHoursKind
  label: string // "금요일 마감 후" 등
  suggestedCapacity: number
  quote: VenueQuote
}

export interface VenueBusyRange {
  startAt: ISODateString
  endAt: ISODateString
  label?: string
}

export interface VenueAvailability {
  venueId: ID
  busy: VenueBusyRange[]
  offHours: OffHoursSlot[]
}

/** 섭외 추천을 위한 모임 브리프. */
export interface VenueBrief {
  category: PartyCategory
  area?: string
  partySize: number
  startAt?: ISODateString
  endAt?: ISODateString
  lat?: number | null
  lng?: number | null
  maxBudgetKRW?: number | null
}
