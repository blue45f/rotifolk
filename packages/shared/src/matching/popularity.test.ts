import { describe, expect, it } from 'vitest'

import { computePopularity } from './popularity'

const candidates = [
  { userId: 'm1', gender: 'male' as const },
  { userId: 'm2', gender: 'male' as const },
  { userId: 'f1', gender: 'female' as const },
  { userId: 'f2', gender: 'female' as const },
]

describe('computePopularity', () => {
  it('성별별 최다 호감 1인을 선정', () => {
    const votes = [
      { toUserId: 'm1' },
      { toUserId: 'm1' },
      { toUserId: 'm2' },
      { toUserId: 'f2' },
      { toUserId: 'f2' },
      { toUserId: 'f1' },
    ]
    const out = computePopularity(votes, candidates)
    expect(out.popularMale).toEqual({ userId: 'm1', likes: 2 })
    expect(out.popularFemale).toEqual({ userId: 'f2', likes: 2 })
  })

  it('0표는 선정 대상에서 제외(빈 결과는 null)', () => {
    const out = computePopularity([], candidates)
    expect(out.popularMale).toBeNull()
    expect(out.popularFemale).toBeNull()
  })

  it('동률이면 candidates 순서가 앞선 사람 우선', () => {
    const out = computePopularity([{ toUserId: 'm1' }, { toUserId: 'm2' }], candidates)
    expect(out.popularMale).toEqual({ userId: 'm1', likes: 1 })
  })
})
