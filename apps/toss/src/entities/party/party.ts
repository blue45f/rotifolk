import type { Party, PartySummary } from '@rotifolk/shared'

export const PARTY_CATEGORY_LABELS: Record<string, string> = {
  wine: '와인',
  coffee: '커피',
  tea: '티',
  whisky: '위스키',
  cocktail: '칵테일',
  beer: '맥주',
  sake: '사케',
  'natural-wine': '내추럴 와인',
  dessert: '디저트',
  custom: '커스텀',
}

const SENSITIVE_TEXT = /(\d:\d\s*)?이성\s*매칭|남녀|소개팅|연애목적|썸|연인|소개팅\b/gi

const DRINK_CATEGORIES = new Set([
  'wine',
  'whisky',
  'cocktail',
  'beer',
  'sake',
  'natural-wine',
  'dessert',
])

export type PartyListItem = PartySummary & {
  categoryLabel: string
  cover: string | null
  venueArea: string
  area: string
  isAlcohol: boolean
  alcohol: boolean
  rating: number
  sanitizedDescription: string
  livePulseLabel: string
}

export type PartyDetailItem = Party & {
  categoryLabel: string
  cover: string | null
  venueArea: string
  area: string
  isAlcohol: boolean
  alcohol: boolean
  rating: number
  sanitizedDescription: string
  livePulseLabel: string
  totalRounds: number
  basePriceKRW: number
  durationMinutes: number
  roundMinutes: number
  participantShareRate: number
}

function normalizeDescription(source = ''): string {
  return source
    .replace(SENSITIVE_TEXT, '라운드 매칭')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function normalizeTags(tags: string[]): string[] {
  return tags.filter((tag) => !/5:5|이성|남녀|소개팅|연인/.test(tag))
}

function makeCoverValue(raw: string | null | undefined) {
  return raw ?? null
}

function toCommonPartyFields(item: PartySummary | Party): {
  categoryLabel: string
  isAlcohol: boolean
  sanitizedDescription: string
  livePulseLabel: string
} {
  const category = 'config' in item ? item.config.category : item.category
  const categoryLabel = PARTY_CATEGORY_LABELS[category] ?? category
  const rawDescription =
    (item as PartySummary).description ||
    (item as Party).description ||
    '취향 기반 라운드 모임으로 즐기는 소셜 타임.'
  const isAlcohol = DRINK_CATEGORIES.has(category)
  const livePulseLabel =
    item.status === 'live'
      ? '진행 중'
      : item.currentParticipants >= item.maxParticipants
        ? '마감'
        : '모집 중'

  return {
    categoryLabel,
    isAlcohol,
    sanitizedDescription: normalizeDescription(rawDescription),
    livePulseLabel,
  }
}

export function mapPartySummary(item: PartySummary): PartyListItem {
  const base = toCommonPartyFields(item)

  return {
    ...item,
    categoryLabel: base.categoryLabel,
    area: item.venueArea ?? '',
    cover: makeCoverValue(item.coverImageUrl),
    venueArea: item.venueArea ?? '',
    alcohol: base.isAlcohol,
    isAlcohol: base.isAlcohol,
    rating: item.venueRating ?? 0,
    sanitizedDescription: base.sanitizedDescription,
    tags: normalizeTags(item.tags ?? []),
    livePulseLabel: base.livePulseLabel,
  }
}

export function mapPartyDetail(item: Party): PartyDetailItem {
  const base = toCommonPartyFields(item)
  const basePrice = item.pricing?.basePriceKRW ?? 0
  const rounds = item.config?.totalRounds ?? 0
  const roundMinutes = Math.max(1, Math.round((item.config?.roundDurationSec ?? 300) / 60))
  const maxSeats = item.maxParticipants || 1
  const joined = item.currentParticipants || 0

  return {
    ...item,
    categoryLabel: base.categoryLabel,
    area: item.venueArea ?? '',
    cover: makeCoverValue(item.coverImageUrl),
    venueArea: item.venueArea ?? '',
    alcohol: base.isAlcohol,
    isAlcohol: base.isAlcohol,
    rating: item.venueRating ?? 0,
    sanitizedDescription: base.sanitizedDescription,
    tags: normalizeTags(item.tags ?? []),
    livePulseLabel: base.livePulseLabel,
    totalRounds: rounds,
    basePriceKRW: basePrice,
    durationMinutes: item.endAt
      ? Math.max(1, Math.round((+new Date(item.endAt) - +new Date(item.startAt)) / 60000))
      : 1,
    roundMinutes,
    participantShareRate: Math.min(1, Math.max(0, joined / Math.max(1, maxSeats))),
  }
}

export function toOrganizerScript(p: {
  title: string
  venueName: string
  venueArea: string
  startAt?: string
}) {
  const when = p.startAt
    ? new Date(p.startAt).toLocaleString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '날짜 미정'

  return [
    '📋 로티포크 모임 운영 체크리스트',
    `- 제목: ${p.title}`,
    `- 장소: ${p.venueName} (${p.venueArea})`,
    `- 시작: ${when}`,
    '- 출입 동선: 입장 5분 전 점검, 환영 멘트 공지',
    '- 라운드 전환: 시간 안내, 다음 상대 정산 멘트',
    '- 종료 후 알림: 후기/리포트 템플릿 공유',
  ].join('\n')
}
