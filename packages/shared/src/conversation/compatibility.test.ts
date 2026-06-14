import { describe, expect, it } from 'vitest'

import { computeCompatibility } from './compatibility'

describe('computeCompatibility', () => {
  it('결정적 — 같은 입력은 같은 결과', () => {
    const a = { mbti: 'ENFP', interests: ['wine', 'movie'] }
    const b = { mbti: 'INFJ', interests: ['wine', 'hiking'] }
    const r1 = computeCompatibility(a, b, 'x-y')
    const r2 = computeCompatibility(a, b, 'x-y')
    expect(r1).toEqual(r2)
  })

  it('점수는 30~99 범위', () => {
    const r = computeCompatibility({}, {}, 'seed')
    expect(r.score).toBeGreaterThanOrEqual(30)
    expect(r.score).toBeLessThanOrEqual(99)
  })

  it('공통 관심사가 많으면 점수가 오른다', () => {
    const lots = computeCompatibility(
      { interests: ['a', 'b', 'c'] },
      { interests: ['a', 'b', 'c'] },
      's'
    )
    const none = computeCompatibility({ interests: ['a'] }, { interests: ['z'] }, 's')
    expect(lots.score).toBeGreaterThan(none.score)
  })

  it('점수대별 타이틀', () => {
    expect(computeCompatibility({}, {}, 'seed').title.length).toBeGreaterThan(0)
  })
})
