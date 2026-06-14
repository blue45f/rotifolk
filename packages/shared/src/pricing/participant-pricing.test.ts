import { describe, expect, it } from 'vitest'

import {
  ageFromBirthYear,
  ageRangeForGender,
  isAgeEligible,
  resolveParticipantPrice,
} from './participant-pricing'

describe('resolveParticipantPrice', () => {
  it('성별 규칙 (여 3만 / 남 5만)', () => {
    const rules = [
      { gender: 'female' as const, priceKRW: 30000 },
      { gender: 'male' as const, priceKRW: 50000 },
    ]
    expect(resolveParticipantPrice(40000, rules, { gender: 'female' })).toBe(30000)
    expect(resolveParticipantPrice(40000, rules, { gender: 'male' })).toBe(50000)
  })

  it('연령 규칙 (20대 3만 / 그 외 base)', () => {
    const rules = [{ ageMin: 20, ageMax: 29, priceKRW: 30000 }]
    expect(resolveParticipantPrice(40000, rules, { age: 25 })).toBe(30000)
    expect(resolveParticipantPrice(40000, rules, { age: 35 })).toBe(40000)
  })

  it('성별+연령 복합 — 먼저 매칭되는 규칙 우선', () => {
    const rules = [
      { gender: 'female' as const, ageMin: 20, ageMax: 29, priceKRW: 20000 },
      { gender: 'female' as const, priceKRW: 30000 },
    ]
    expect(resolveParticipantPrice(40000, rules, { gender: 'female', age: 25 })).toBe(20000)
    expect(resolveParticipantPrice(40000, rules, { gender: 'female', age: 35 })).toBe(30000)
  })

  it('매칭 없으면 base, 나이 모르면 나이 규칙 건너뜀', () => {
    expect(resolveParticipantPrice(40000, [], {})).toBe(40000)
    expect(
      resolveParticipantPrice(40000, [{ ageMin: 20, ageMax: 29, priceKRW: 30000 }], { age: null })
    ).toBe(40000)
  })
})

describe('age eligibility', () => {
  it('성별 전용 나이 범위 우선, 없으면 공통', () => {
    const src = { ageMin: 20, ageMax: 50, maleAgeMin: 30, maleAgeMax: 40 }
    expect(ageRangeForGender(src, 'male')).toEqual({ min: 30, max: 40 })
    expect(ageRangeForGender(src, 'female')).toEqual({ min: 20, max: 50 })
  })

  it('isAgeEligible 성별별', () => {
    const src = { maleAgeMin: 30, maleAgeMax: 40, femaleAgeMin: 25, femaleAgeMax: 35 }
    expect(isAgeEligible(src, 'male', 28)).toBe(false)
    expect(isAgeEligible(src, 'male', 35)).toBe(true)
    expect(isAgeEligible(src, 'female', 28)).toBe(true)
    expect(isAgeEligible(src, 'male', null)).toBe(true) // 미입력 통과
  })

  it('ageFromBirthYear', () => {
    expect(ageFromBirthYear(1995, 2026)).toBe(31)
    expect(ageFromBirthYear(null, 2026)).toBeNull()
  })
})
