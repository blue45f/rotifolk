/** 참가비 구간 키 — 무료 / 가성비 / 표준 / 프리미엄. */
export type PriceBandKey = 'free' | 'budget' | 'standard' | 'premium'

export interface PriceBand {
  key: PriceBandKey
  /** UI 칩 라벨. */
  label: string
  /** 참가비(원)가 이 구간에 속하는지. */
  match: (krw: number) => boolean
}

/**
 * 참가비 구간 정의 (무료 → 프리미엄). 구간은 서로 겹치지 않고 0 이상의 모든 금액을 덮는다.
 * - free: 0원
 * - budget: 1 ~ 20,000원
 * - standard: 20,001 ~ 50,000원
 * - premium: 50,001원 이상
 */
export const PRICE_BANDS: PriceBand[] = [
  { key: 'free', label: '무료', match: (k) => k === 0 },
  { key: 'budget', label: '~2만원', match: (k) => k > 0 && k <= 20_000 },
  { key: 'standard', label: '2~5만원', match: (k) => k > 20_000 && k <= 50_000 },
  { key: 'premium', label: '5만원+', match: (k) => k > 50_000 },
]

/** 키로 참가비 구간을 찾는다 (없거나 null이면 undefined). */
export function getPriceBand(key: PriceBandKey | null | undefined): PriceBand | undefined {
  if (!key) return undefined
  return PRICE_BANDS.find((b) => b.key === key)
}

/**
 * 참가비 구간으로 모임 목록을 좁힌다. key가 없으면 원본을 그대로 돌려준다.
 * 순수 함수 — 입력 배열을 변형하지 않는다.
 */
export function filterByPriceBand<T extends { basePriceKRW: number }>(
  items: readonly T[],
  key: PriceBandKey | null | undefined
): T[] {
  const band = getPriceBand(key)
  if (!band) return [...items]
  return items.filter((item) => band.match(item.basePriceKRW))
}
