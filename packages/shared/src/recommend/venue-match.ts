import type { PartyCategory } from '../domain/party'
import type { Venue, VenueKind } from '../domain/venue'
import type {
  VenueBrief,
  VenueFit,
  VenueFitReason,
  VenueRecommendation,
} from '../domain/venue-booking'
import { formatDistanceKm, haversineKm } from '../geo'
import { formatKRW, quoteVenueBooking } from '../pricing/venue-pricing'

const CATEGORY_KINDS: Record<PartyCategory, VenueKind[]> = {
  wine: ['wine-bar', 'restaurant', 'rooftop', 'lounge'],
  'natural-wine': ['wine-bar', 'restaurant', 'rooftop', 'lounge'],
  coffee: ['cafe', 'gallery', 'studio'],
  tea: ['tea-house', 'cafe', 'gallery'],
  whisky: ['whisky-bar', 'lounge', 'private-room', 'pub'],
  cocktail: ['lounge', 'rooftop', 'pub', 'whisky-bar'],
  beer: ['pub', 'rooftop', 'restaurant'],
  sake: ['restaurant', 'private-room', 'lounge'],
  dessert: ['cafe', 'tea-house', 'gallery'],
  custom: [],
}

const CATEGORY_LABEL: Record<PartyCategory, string> = {
  wine: '와인',
  'natural-wine': '내추럴 와인',
  coffee: '커피',
  tea: '차',
  whisky: '위스키',
  cocktail: '칵테일',
  beer: '맥주',
  sake: '사케',
  dessert: '디저트',
  custom: '모임',
}

const KIND_LABEL: Record<VenueKind, string> = {
  'wine-bar': '와인바',
  cafe: '카페',
  'tea-house': '다실',
  'whisky-bar': '위스키바',
  lounge: '라운지',
  'private-room': '프라이빗룸',
  rooftop: '루프탑',
  gallery: '갤러리',
  studio: '스튜디오',
  restaurant: '레스토랑',
  pub: '펍',
  custom: '공간',
}

export function categoryToKinds(category: PartyCategory): VenueKind[] {
  return CATEGORY_KINDS[category] ?? []
}

export interface ScoreVenueOptions {
  available?: boolean
  distanceKm?: number | null
}

/** 모임 브리프에 대한 공간 적합도 점수(0~100) + 사람이 읽는 근거. */
export function scoreVenueFit(
  venue: Venue,
  brief: VenueBrief,
  opts: ScoreVenueOptions = {},
): VenueFit {
  const reasons: VenueFitReason[] = []
  let score = 0
  const catLabel = CATEGORY_LABEL[brief.category]
  const kindLabel = KIND_LABEL[venue.kind]

  // 1) 카테고리 ↔ 공간 종류 (28)
  const kinds = categoryToKinds(brief.category)
  if (kinds.length === 0) {
    score += 18
  } else if (kinds[0] === venue.kind) {
    score += 28
    reasons.push({ icon: '🎯', tone: 'positive', text: `${catLabel}에 딱 맞는 ${kindLabel}` })
  } else if (kinds.includes(venue.kind)) {
    score += 22
    reasons.push({ icon: '✨', tone: 'positive', text: `${catLabel} 무드와 어울리는 ${kindLabel}` })
  } else {
    score += 6
    reasons.push({ icon: '🤔', tone: 'neutral', text: `${catLabel}와는 결이 다른 ${kindLabel}` })
  }

  // 2) 정원 적합 (24)
  const size = brief.partySize
  if (size <= venue.capacity) {
    const ratio = size / Math.max(1, venue.capacity)
    if (ratio >= 0.6) {
      score += 24
      reasons.push({
        icon: '👥',
        tone: 'positive',
        text: `${size}명에 꼭 맞는 정원 (최대 ${venue.capacity})`,
      })
    } else if (ratio >= 0.35) {
      score += 18
      reasons.push({ icon: '👥', tone: 'neutral', text: `여유로운 ${venue.capacity}인 공간` })
    } else {
      score += 9
      reasons.push({
        icon: '🪑',
        tone: 'caution',
        text: `${size}명엔 다소 넓어요 (최대 ${venue.capacity})`,
      })
    }
  } else {
    reasons.push({ icon: '⚠️', tone: 'caution', text: `정원 초과 — 최대 ${venue.capacity}명` })
  }

  // 3) 위치 (22) — 거리 우선, 없으면 동네명
  if (opts.distanceKm != null) {
    if (opts.distanceKm < 1) {
      score += 22
      reasons.push({
        icon: '📍',
        tone: 'positive',
        text: `내 위치에서 ${formatDistanceKm(opts.distanceKm)}`,
      })
    } else if (opts.distanceKm < 3) {
      score += 16
      reasons.push({
        icon: '📍',
        tone: 'positive',
        text: `가까운 ${formatDistanceKm(opts.distanceKm)}`,
      })
    } else if (opts.distanceKm < 6) {
      score += 9
      reasons.push({
        icon: '📍',
        tone: 'neutral',
        text: `${formatDistanceKm(opts.distanceKm)} 거리`,
      })
    } else {
      score += 3
      reasons.push({
        icon: '🚇',
        tone: 'caution',
        text: `${formatDistanceKm(opts.distanceKm)} — 조금 멀어요`,
      })
    }
  } else if (brief.area && venue.area.includes(brief.area)) {
    score += 18
    reasons.push({ icon: '📍', tone: 'positive', text: `${brief.area} 동네 공간` })
  } else if (brief.area) {
    score += 6
  } else {
    score += 11
  }

  // 4) 가격 (12)
  if (brief.maxBudgetKRW != null && brief.maxBudgetKRW > 0) {
    if (venue.pricePerHourKRW <= brief.maxBudgetKRW) {
      score += 12
      reasons.push({
        icon: '💰',
        tone: 'positive',
        text: `예산 내 · 시간당 ${formatKRW(venue.pricePerHourKRW)}`,
      })
    } else {
      score += 2
      reasons.push({
        icon: '💸',
        tone: 'caution',
        text: `예산 초과 · 시간당 ${formatKRW(venue.pricePerHourKRW)}`,
      })
    }
  } else {
    score += 8
  }

  // 5) 평점 (8)
  if (venue.reviewCount > 0) {
    score += Math.round((venue.rating / 5) * 8)
    if (venue.rating >= 4.5) {
      reasons.push({
        icon: '⭐',
        tone: 'positive',
        text: `평점 ${venue.rating.toFixed(1)} · 후기 ${venue.reviewCount}`,
      })
    }
  } else {
    score += 3
  }

  // 6) 즉시 예약 (6)
  if (venue.instantBook) {
    score += 6
    reasons.push({ icon: '⚡', tone: 'positive', text: '요청 즉시 확정 가능' })
  }

  // 가용성 반영
  if (opts.available === false) {
    score = Math.round(score * 0.4)
    reasons.unshift({ icon: '⛔', tone: 'caution', text: '요청 시간대는 예약 불가' })
  } else if (opts.available === true) {
    reasons.unshift({ icon: '✅', tone: 'positive', text: '요청 시간 예약 가능' })
  }

  score = Math.max(0, Math.min(100, Math.round(score)))
  const grade: VenueFit['grade'] =
    score >= 85 ? 'perfect' : score >= 70 ? 'great' : score >= 50 ? 'good' : 'fair'
  return { score, grade, reasons: reasons.slice(0, 5) }
}

export interface RecommendVenuesOptions {
  viewer?: { lat?: number | null; lng?: number | null }
  availabilityByVenue?: Record<string, boolean>
  now?: Date | string
  limit?: number
}

/** 공간 목록을 브리프 적합도로 랭킹. 거리/가용성/견적을 함께 첨부. */
export function recommendVenues(
  venues: readonly Venue[],
  brief: VenueBrief,
  opts: RecommendVenuesOptions = {},
): VenueRecommendation[] {
  const viewerLat = opts.viewer?.lat ?? brief.lat
  const viewerLng = opts.viewer?.lng ?? brief.lng

  const recs = venues.map((venue): VenueRecommendation => {
    let distanceKm: number | null = null
    if (viewerLat != null && viewerLng != null && venue.lat != null && venue.lng != null) {
      distanceKm = haversineKm(
        { lat: viewerLat, lng: viewerLng },
        { lat: venue.lat, lng: venue.lng },
      )
    }
    const available = opts.availabilityByVenue?.[venue.id]
    const fit = scoreVenueFit(venue, brief, { available, distanceKm })
    const quote =
      brief.startAt && brief.endAt
        ? quoteVenueBooking(venue, brief.startAt, brief.endAt, { now: opts.now })
        : null
    return { venue: { ...venue, distanceKm }, fit, quote, available, distanceKm }
  })

  recs.sort((a, b) => b.fit.score - a.fit.score)
  return typeof opts.limit === 'number' ? recs.slice(0, opts.limit) : recs
}
