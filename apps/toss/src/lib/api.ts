// 토스 정책: 만남 주선/성별 매칭 프레이밍 완화 → 취향 기반 라운드 모임으로 표기.
const SENSITIVE = /(\d:\d\s*)?이성\s*매칭|남녀|소개팅/g
const sanitize = (s: string) =>
  s
    .replace(SENSITIVE, '라운드 매칭')
    .replace(/\s{2,}/g, ' ')
    .trim()
const cleanTags = (tags: string[]) => tags.filter((t) => !/\d:\d|이성|남녀|매칭/.test(t))

export interface Party {
  id: string
  title: string
  description: string
  category: string
  categoryLabel: string
  cover: string | null
  venueName: string
  area: string
  rating: number
  basePriceKRW: number
  maxParticipants: number
  totalRounds: number
  tags: string[]
  alcohol: boolean
}

const categoryLabels: Record<string, string> = {
  wine: '와인',
  coffee: '커피',
  tea: '티',
  whisky: '위스키',
  cocktail: '칵테일',
  beer: '맥주',
  sake: '사케',
  'natural-wine': '내추럴 와인',
  dessert: '디저트',
}

function mapPartySummaryToParty(p: any): Party {
  const category = p.category || 'custom'
  const isAlcohol = ['wine', 'whisky', 'cocktail', 'beer', 'sake', 'natural-wine'].includes(
    category
  )

  return {
    id: p.id,
    title: p.title,
    description: sanitize(p.description || ''),
    category,
    categoryLabel: categoryLabels[category] || category,
    cover: p.coverImageUrl || null,
    venueName: p.venueName || '',
    area: p.venueArea || '',
    rating: p.venueRating || 0,
    basePriceKRW: p.basePriceKRW || 0,
    maxParticipants: p.maxParticipants || 0,
    totalRounds: p.totalRounds || 0,
    tags: cleanTags(p.tags || []),
    alcohol: isAlcohol,
  }
}

function mapFullPartyToParty(p: any): Party {
  const category = p.config?.category || p.category || 'custom'
  const isAlcohol = ['wine', 'whisky', 'cocktail', 'beer', 'sake', 'natural-wine'].includes(
    category
  )

  return {
    id: p.id,
    title: p.title,
    description: sanitize(p.description || ''),
    category,
    categoryLabel: categoryLabels[category] || category,
    cover: p.coverImageUrl || null,
    venueName: p.venueName || '',
    area: p.venueArea || '',
    rating: p.venueRating || 0,
    basePriceKRW: p.pricing?.basePriceKRW || p.basePriceKRW || 0,
    maxParticipants: p.maxParticipants || 0,
    totalRounds: p.config?.totalRounds || p.totalRounds || 0,
    tags: cleanTags(p.tags || []),
    alcohol: isAlcohol,
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export async function getParties(): Promise<Party[]> {
  try {
    const res = await fetch(`${API_BASE}/parties?pageSize=100`)
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
    const data = await res.json()
    const rawItems = data.items || []
    return rawItems.map(mapPartySummaryToParty)
  } catch (error) {
    console.error('Failed to get parties from DB:', error)
    throw error
  }
}

export async function getParty(id: string): Promise<Party | undefined> {
  try {
    const res = await fetch(`${API_BASE}/parties/${encodeURIComponent(id)}`)
    if (!res.ok) {
      if (res.status === 404) return undefined
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    const data = await res.json()
    if (!data.party) return undefined
    return mapFullPartyToParty(data.party)
  } catch (error) {
    console.error(`Failed to get party ${id} from DB:`, error)
    throw error
  }
}

export const won = (n: number) => '₩' + n.toLocaleString('ko-KR')
