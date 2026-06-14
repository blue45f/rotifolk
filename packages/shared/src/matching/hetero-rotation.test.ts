import { describe, expect, it } from 'vitest'

import { buildHeteroRotation } from './hetero-rotation'

describe('buildHeteroRotation', () => {
  it('produces rounds equal to bigger group size', () => {
    const rounds = buildHeteroRotation([
      { userId: 'w1', gender: 'female' },
      { userId: 'w2', gender: 'female' },
      { userId: 'w3', gender: 'female' },
      { userId: 'm1', gender: 'male' },
      { userId: 'm2', gender: 'male' },
      { userId: 'm3', gender: 'male' },
      { userId: 'm4', gender: 'male' },
    ])
    expect(rounds).toHaveLength(4) // bigger = 4 (men)
    rounds.forEach((r) => expect(r.pairs).toHaveLength(3))
  })

  it('every cross-gender pair appears (when 5:5)', () => {
    const ws = ['w1', 'w2', 'w3', 'w4', 'w5'] as const
    const ms = ['m1', 'm2', 'm3', 'm4', 'm5'] as const
    const rounds = buildHeteroRotation([
      ...ws.map((id) => ({ userId: id, gender: 'female' as const })),
      ...ms.map((id) => ({ userId: id, gender: 'male' as const })),
    ])
    expect(rounds).toHaveLength(5)
    const seen = new Set<string>()
    rounds.forEach((r) => r.pairs.forEach(([a, b]) => seen.add(a < b ? `${a}|${b}` : `${b}|${a}`)))
    expect(seen.size).toBe(25)
  })

  it('every pair is cross-gender', () => {
    const rounds = buildHeteroRotation([
      { userId: 'w1', gender: 'female' },
      { userId: 'w2', gender: 'female' },
      { userId: 'm1', gender: 'male' },
      { userId: 'm2', gender: 'male' },
      { userId: 'm3', gender: 'male' },
    ])
    rounds.forEach((r) =>
      r.pairs.forEach(([a, b]) => {
        const aIsW = a.startsWith('w')
        const bIsW = b.startsWith('w')
        expect(aIsW).not.toBe(bIsW)
      })
    )
  })

  it('returns empty when one gender is absent', () => {
    expect(buildHeteroRotation([{ userId: 'w1', gender: 'female' }])).toHaveLength(0)
  })
})
