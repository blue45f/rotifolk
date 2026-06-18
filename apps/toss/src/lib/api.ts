import data from '../sample-data.json'

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

// 토스 정책: 만남 주선/성별 매칭 프레이밍 완화 → 취향 기반 라운드 모임으로 표기.
const SENSITIVE = /(\d:\d\s*)?이성\s*매칭|남녀|소개팅/g
const sanitize = (s: string) =>
  s
    .replace(SENSITIVE, '라운드 매칭')
    .replace(/\s{2,}/g, ' ')
    .trim()
const cleanTags = (tags: string[]) => tags.filter((t) => !/\d:\d|이성|남녀|매칭/.test(t))

const items: Party[] = ((data as { items?: Party[] }).items || []).map((p) => ({
  ...p,
  description: sanitize(p.description),
  tags: cleanTags(p.tags || []),
}))
export function getParties(): Party[] {
  return items
}
export function getParty(id: string): Party | undefined {
  return items.find((p) => p.id === id)
}
export const won = (n: number) => '₩' + n.toLocaleString('ko-KR')
