import { describe, expect, it } from 'vitest'

import { PRICE_BANDS, filterByPriceBand, getPriceBand } from './index'

const items = [
  { id: 'free', basePriceKRW: 0 },
  { id: 'cheap', basePriceKRW: 18_000 },
  { id: 'edge20k', basePriceKRW: 20_000 },
  { id: 'mid', basePriceKRW: 32_000 },
  { id: 'edge50k', basePriceKRW: 50_000 },
  { id: 'lux', basePriceKRW: 88_000 },
]

describe('PRICE_BANDS', () => {
  it('모든 양수 금액은 정확히 하나의 구간에만 속한다', () => {
    for (const krw of [0, 1, 20_000, 20_001, 50_000, 50_001, 1_000_000]) {
      const matched = PRICE_BANDS.filter((b) => b.match(krw))
      expect(matched).toHaveLength(1)
    }
  })
})

describe('getPriceBand', () => {
  it('null/undefined면 undefined를 돌려준다', () => {
    expect(getPriceBand(null)).toBeUndefined()
    expect(getPriceBand(undefined)).toBeUndefined()
  })
  it('키로 구간을 찾는다', () => {
    expect(getPriceBand('free')?.label).toBe('무료')
    expect(getPriceBand('premium')?.label).toBe('5만원+')
  })
})

describe('filterByPriceBand', () => {
  it('키가 없으면 원본 복사본을 그대로 돌려준다', () => {
    const out = filterByPriceBand(items, null)
    expect(out).toHaveLength(items.length)
    expect(out).not.toBe(items)
  })

  it('무료만 거른다', () => {
    expect(filterByPriceBand(items, 'free').map((i) => i.id)).toEqual(['free'])
  })

  it('가성비(~2만원) 구간 — 0원은 제외, 2만원 경계 포함', () => {
    expect(filterByPriceBand(items, 'budget').map((i) => i.id)).toEqual(['cheap', 'edge20k'])
  })

  it('표준(2~5만원) 구간 — 2만원 초과 5만원 이하', () => {
    expect(filterByPriceBand(items, 'standard').map((i) => i.id)).toEqual(['mid', 'edge50k'])
  })

  it('프리미엄(5만원+) 구간 — 5만원 초과', () => {
    expect(filterByPriceBand(items, 'premium').map((i) => i.id)).toEqual(['lux'])
  })

  it('입력 배열을 변형하지 않는다', () => {
    const snapshot = [...items]
    filterByPriceBand(items, 'budget')
    expect(items).toEqual(snapshot)
  })
})
