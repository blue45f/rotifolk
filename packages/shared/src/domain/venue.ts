import type { ID, Timestamps } from './common'

export type VenueKind =
  | 'wine-bar'
  | 'cafe'
  | 'tea-house'
  | 'whisky-bar'
  | 'lounge'
  | 'private-room'
  | 'rooftop'
  | 'gallery'
  | 'studio'
  | 'restaurant'
  | 'pub'
  | 'custom'

/** 결제/확정 후 공개되는 도착 가이드 (offhours 참고). 원본 민감정보는 저장하지 않는다. */
export interface ArrivalGuide {
  parkingNote?: string
  entryInfo?: string
  wifiSsid?: string
  wifiPassword?: string
  sortingNote?: string
  emergencyContact?: string
  extraNotes?: string
}

export interface Venue extends Timestamps {
  id: ID
  name: string
  kind: VenueKind
  area: string
  address: string
  lat?: number | null
  lng?: number | null
  capacity: number
  pricePerHourKRW: number
  amenities: string[]
  partnered: boolean
  description?: string | null
  photos: string[]
  contactPhone?: string | null
  rating: number
  reviewCount: number

  // ── 섭외/예약 고도화 ──
  instantBook: boolean
  cleaningFeeKRW: number
  minHours: number
  /** 영업 시작/종료 (분, 0~1440). 유휴시간 산출에 사용. */
  openMinute: number
  closeMinute: number
  /** 정기 휴무 요일 (0=일 ... 6=토) */
  closedWeekdays: number[]
  weekendMultiplier: number
  peakMultiplier: number
  arrivalGuide?: ArrivalGuide | null
  vibeTags: string[]
  useCases: string[]
  hostBlurb?: string | null
  selfHostEnabled: boolean

  ownerId?: ID | null

  // ── 클라이언트 계산 보강(옵션) ──
  /** 조회자 위치 기준 거리(km). 위치 정보가 있을 때만. */
  distanceKm?: number | null
  /** 현재 로그인 사용자가 소유한 공간인지 */
  isMine?: boolean
}

/** @deprecated venue-booking 모듈로 이전. 하위호환용 유지. */
export interface VenueBookingRequest {
  venueId: ID
  startAt: string
  endAt: string
  partySize: number
  noteToVenue?: string
}
