import { describe, expect, it } from 'vitest'

import { checkEligibility } from './eligibility'

describe('checkEligibility', () => {
  it('돌싱 전용: divorced만 통과', () => {
    const policy = { maritalRequirement: ['divorced'] as const }
    expect(checkEligibility(policy, { maritalStatus: 'divorced' }).ok).toBe(true)
    expect(checkEligibility(policy, { maritalStatus: 'single' }).reasons).toContain('marital')
  })

  it('아이 없는 사람만 (미입력은 차단)', () => {
    const policy = { childrenPolicy: 'none' as const }
    expect(checkEligibility(policy, { hasChildren: false }).ok).toBe(true)
    expect(checkEligibility(policy, { hasChildren: true }).reasons).toContain('children')
    expect(checkEligibility(policy, { hasChildren: null }).reasons).toContain('children')
  })

  it('필수 인증 누락 표시', () => {
    const policy = { requiredVerifications: ['identity', 'company'] as const }
    const r = checkEligibility(policy, { verifiedFields: ['identity'] })
    expect(r.ok).toBe(false)
    expect(r.missingVerifications).toEqual(['company'])
  })

  it('나이+혼인+아이+인증 모두 통과', () => {
    const r = checkEligibility(
      {
        ageMin: 25,
        ageMax: 45,
        maritalRequirement: ['divorced'] as const,
        childrenPolicy: 'has' as const,
        requiredVerifications: ['identity'] as const,
      },
      { age: 35, maritalStatus: 'divorced', hasChildren: true, verifiedFields: ['identity'] }
    )
    expect(r.ok).toBe(true)
    expect(r.reasons).toEqual([])
  })

  it('조건 없으면 항상 통과', () => {
    expect(checkEligibility({}, {}).ok).toBe(true)
  })

  it('나이 제한이 있으면 나이 미입력은 차단 (혼인·아이와 일관)', () => {
    const policy = { ageMin: 30, ageMax: 40 }
    expect(checkEligibility(policy, { age: null }).reasons).toContain('age')
    expect(checkEligibility(policy, { age: 35 }).ok).toBe(true)
    // 나이 제한이 없으면 미입력도 통과
    expect(checkEligibility({}, { age: null }).ok).toBe(true)
  })
})
