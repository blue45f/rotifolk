import { describe, expect, it } from 'vitest'

import { buildRoundRobin } from './round-robin'

describe('buildRoundRobin', () => {
  it('produces (n-1) rounds for even n', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f']
    const rounds = buildRoundRobin(ids)
    expect(rounds).toHaveLength(5)
    rounds.forEach((r) => expect(r.pairs).toHaveLength(3))
  })

  it('every user meets every other exactly once (even n)', () => {
    const ids = ['a', 'b', 'c', 'd']
    const rounds = buildRoundRobin(ids)
    const seen = new Set<string>()
    rounds.forEach((r) => r.pairs.forEach(([a, b]) => seen.add(a < b ? `${a}|${b}` : `${b}|${a}`)))
    expect(seen.size).toBe(6) // C(4,2) = 6
  })

  it('handles odd n with rotating BYE', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    const rounds = buildRoundRobin(ids)
    expect(rounds).toHaveLength(5)
    const byes = rounds.map((r) => r.byeUserId)
    expect(new Set(byes).size).toBe(5)
  })

  it('returns [] for fewer than 2 users', () => {
    expect(buildRoundRobin([])).toEqual([])
    expect(buildRoundRobin(['solo'])).toEqual([])
  })
})
