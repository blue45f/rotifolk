import type { ID, ISODateString, Timestamps } from './common'
import type { MaritalStatus, VerificationField } from './profile'
import type { PublicUser } from './user'

/** 아이 유무 대상 정책. */
export type ChildrenPolicy = 'any' | 'has' | 'none'

export const CHILDREN_POLICY_LABEL: Record<ChildrenPolicy, string> = {
  any: '무관',
  has: '아이 있음',
  none: '아이 없음',
}

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
  | 'mutual-plus-top-n' // 상호 매칭 + 상호가 아닌 상위 N명 보완

/** 연락처 교환 방식. */
export type ContactExchangePolicy =
  | 'mutual-consent' // 둘 다 공개 동의 + 상대 핸들 존재
  | 'chat-only' // 앱 내 채팅만 열고 외부 채널 잠금
  | 'open-after-match' // 라운드 성사 시 제공된 채널을 즉시 공개
  | 'request-approval' // 외부 채널은 상대 요청-승인으로 공개

/** 연결 매체 (레거시 단일 선택). */
export type ConnectionMode = 'chat' | 'phone' | 'both'

/**
 * 연결 채널 (다중 선택). 부담 낮음 → 높음 순.
 * 리서치: 오픈채팅<인스타<카톡<번호. 인앱 채팅을 안전 기본값으로, 나머지는 단계적 공개.
 */
export type ConnectionChannel = 'chat' | 'instagram' | 'kakao' | 'phone'

export interface ConnectionChannelMeta {
  key: ConnectionChannel
  /** 풀 라벨 */
  label: string
  /** 칩/짧은 라벨 */
  short: string
  icon: string
  /** 부담 수준 1(낮음)~4(높음) */
  commitment: 1 | 2 | 3 | 4
  commitmentLabel: string
  /** 공개 시 안내/경고 */
  note?: string
  /** 채팅은 인앱이라 핸들이 없음(앱 내에서 바로 열림). 나머지는 핸들 값 필요. */
  hasHandle: boolean
}

/** 부담 낮음 → 높음 순서 (UI 정렬·리빌 우선순위 공용). */
export const CONNECTION_CHANNEL_ORDER: ConnectionChannel[] = ['chat', 'instagram', 'kakao', 'phone']

export const CONNECTION_CHANNELS: Record<ConnectionChannel, ConnectionChannelMeta> = {
  chat: {
    key: 'chat',
    label: '앱 내 채팅',
    short: '채팅',
    icon: '💬',
    commitment: 1,
    commitmentLabel: '부담 낮음',
    note: '번호·실명 노출 없이 앱 안에서 안전하게 시작해요.',
    hasHandle: false,
  },
  instagram: {
    key: 'instagram',
    label: '인스타그램',
    short: '인스타',
    icon: '📷',
    commitment: 2,
    commitmentLabel: '가벼운 호감',
    note: '서로 팔로우로 가볍게 이어져요.',
    hasHandle: true,
  },
  kakao: {
    key: 'kakao',
    label: '카카오톡 ID',
    short: '카톡',
    icon: '💛',
    commitment: 3,
    commitmentLabel: '편하게 대화',
    note: '카톡 ID를 공개하면 프로필 사진·상태메시지도 함께 보여요.',
    hasHandle: true,
  },
  phone: {
    key: 'phone',
    label: '전화번호',
    short: '번호',
    icon: '📞',
    commitment: 4,
    commitmentLabel: '가장 긴밀',
    note: '번호는 한번 공개하면 되돌릴 수 없고, 카카오톡과 연동돼요.',
    hasHandle: true,
  },
}

export const CONTACT_EXCHANGE_POLICY_LABEL: Record<ContactExchangePolicy, string> = {
  'mutual-consent': '상호 동의',
  'chat-only': '채팅만',
  'open-after-match': '매칭 즉시 공개',
  'request-approval': '요청 승인',
}

/** 연락처 요청형 공개 상태 (매칭 후 요청·승인 워크플로우용). */
export type ContactExchangeChannelState =
  | 'open'
  | 'requestable'
  | 'pending_me'
  | 'pending_them'
  | 'approved'
  | 'rejected'
  | 'locked'

export type ContactExchangeRequestStatus = 'pending' | 'approved' | 'rejected'

/** 레거시 connectionMode → 채널 배열 (하위호환). */
export function channelsFromLegacyMode(mode: ConnectionMode): ConnectionChannel[] {
  if (mode === 'phone') return ['phone']
  if (mode === 'both') return ['chat', 'phone']
  return ['chat']
}

/** 채널 배열 → 레거시 connectionMode (하위호환 저장값을 채널과 동기화). */
export function legacyModeFromChannels(channels: readonly ConnectionChannel[]): ConnectionMode {
  const hasChat = channels.includes('chat')
  const hasExternal = channels.some((c) => c !== 'chat')
  if (hasChat && hasExternal) return 'both'
  if (hasExternal) return 'phone'
  return 'chat'
}

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
  contactExchangePolicy: ContactExchangePolicy
  /** @deprecated connectionChannels 사용. 하위호환 위해 유지. */
  connectionMode: ConnectionMode
  /** 호스트가 이 파티에서 제공하는 연결 채널 (다중). 미지정 시 connectionMode에서 유도. */
  connectionChannels?: ConnectionChannel[]
  groupAfterParty: boolean
  /** 종료 후 오늘의 인기남/인기녀 공개. */
  revealPopular?: boolean

  // ── 쪽지 & 대화 도우미 ──
  enableNotes: boolean
  noteDelivery: NoteDelivery
  /** 1인당 보낼 수 있는 쪽지 상한 (신중한 선택 유도). */
  noteQuota?: number
  enableConversationKit: boolean
}

/** 성별·연령별 참여 비용 규칙. 먼저 매칭되는 규칙의 가격 적용. */
export interface PricingRule {
  /** 적용 성별. 미지정이면 모든 성별. */
  gender?: 'male' | 'female' | null
  /** 적용 나이 하한(포함). */
  ageMin?: number | null
  /** 적용 나이 상한(포함). */
  ageMax?: number | null
  priceKRW: number
  /** 표시용 라벨 (예: "여성 20대"). */
  label?: string
}

export interface PartyPricing {
  basePriceKRW: number
  drinkPackage: DrinkPackage
  snackPackage: SnackPackage
  refundDeadlineHours: number
  /** 성별·연령별 가격 규칙 (없으면 basePriceKRW 일괄). */
  pricingRules?: PricingRule[]
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
  /** 성별별 나이 제한 (없으면 ageMin/ageMax 공통값 적용). */
  maleAgeMin?: number | null
  maleAgeMax?: number | null
  femaleAgeMin?: number | null
  femaleAgeMax?: number | null
  genderRatio?: '5:5' | 'any' | null
  /** 참가 필수 인증 (제출/검증 완료해야 참가 가능). */
  requiredVerifications?: VerificationField[]
  /** 허용 혼인상태 (빈 배열/미지정=무관, 예 ["divorced"]=돌싱 전용). */
  maritalRequirement?: MaritalStatus[]
  /** 아이 유무 대상. */
  childrenPolicy?: ChildrenPolicy
  venueName?: string
  venueArea?: string
  venueRating?: number
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
  | 'maritalRequirement'
  | 'childrenPolicy'
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
  description?: string
  totalRounds?: number
  venueRating?: number
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
  /** 회원은 실제 userId, 게스트는 `guest:<participationId>` 합성 키 (라운드 memberIds와 동일 형태). */
  userId: ID
  status: ParticipationStatus
  seatNumber?: number | null
  checkedInAt?: ISODateString | null
  user?: PublicUser
  /** 게스트(비로그인) 참가자 여부 — 가입 없이 초대 링크/현장 등록으로 합류. */
  isGuest?: boolean
  guestName?: string | null
  guestAvatar?: { emoji: string; hue: string; imageData?: string | null } | null
}
