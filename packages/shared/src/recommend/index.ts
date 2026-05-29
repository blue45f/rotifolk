import type { PartySummary, User } from '../domain'

export * from './venue-match'

/**
 * 사용자에게 맞는 파티 점수화.
 * - 관심사 키워드가 title/tags에 등장하면 +2 per match
 * - MBTI 첫 글자(E/I)가 같으면 +1 (외향/내향 정도만 약한 가중치)
 * - 무료 모임이면 +0.5 (접근성)
 * - 호스트와 같은 카테고리를 자주 듣는 경향이 있으면 그쪽으로 +1 (단순화: previous interests에 카테고리 키워드 포함)
 */
export interface RecommendationContext {
  interests?: string[]
  mbti?: string | null
  recentCategories?: string[]
}

export function scoreParty(p: PartySummary, ctx: RecommendationContext): number {
  let score = 0
  const text = `${p.title} ${p.tags.join(' ')} ${p.category}`.toLowerCase()
  for (const k of ctx.interests ?? []) {
    if (!k) continue
    if (text.includes(k.toLowerCase())) score += 2
  }
  if (ctx.recentCategories?.includes(p.category)) score += 1
  if (p.basePriceKRW === 0) score += 0.5
  if (p.status === 'live') score += 1
  if (p.tags.some((t) => t.toLowerCase().includes('즉석'))) score += 0.5
  return score
}

export function recommendParties(
  parties: readonly PartySummary[],
  ctx: RecommendationContext,
  limit = 6,
): PartySummary[] {
  return [...parties]
    .map((p) => ({ p, s: scoreParty(p, ctx) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p)
}

export function userToContext(user: User | null | undefined): RecommendationContext {
  return {
    interests: user?.interests,
    mbti: user?.mbti,
    recentCategories: [],
  }
}
