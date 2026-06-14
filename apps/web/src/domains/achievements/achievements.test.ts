import { describe, expect, it } from 'vitest'

import { computeAchievements, summarizeAchievements } from './achievements'

describe('computeAchievements', () => {
  it('marks milestone flags according to thresholds', () => {
    const list = computeAchievements({
      hostedCount: 5,
      joinedCount: 15,
      trustScore: 80,
      isVerified: true,
      hasReferred: 3,
    })

    expect(list.find((item) => item.id === 'first-join')?.earned).toBe(true)
    expect(list.find((item) => item.id === 'regular')?.earned).toBe(true)
    expect(list.find((item) => item.id === 'connoisseur')?.earned).toBe(true)
    expect(list.find((item) => item.id === 'first-host')?.earned).toBe(true)
    expect(list.find((item) => item.id === 'curator')?.earned).toBe(true)
    expect(list.find((item) => item.id === 'maestro')?.earned).toBe(false)
    expect(list.find((item) => item.id === 'verified')?.earned).toBe(true)
    expect(list.find((item) => item.id === 'trustworthy')?.earned).toBe(true)
    expect(list.find((item) => item.id === 'connector')?.earned).toBe(true)
  })

  it('does not grant thresholds before they are reached', () => {
    const list = computeAchievements({
      hostedCount: 0,
      joinedCount: 0,
      trustScore: 10,
      isVerified: false,
      hasReferred: 0,
    })

    expect(list.every((item) => item.earned === false)).toBe(true)
    expect(summarizeAchievements(list)).toEqual({ earned: 0, total: 9 })
  })
})

describe('summarizeAchievements', () => {
  it('counts earned items accurately', () => {
    const summary = summarizeAchievements([
      { id: 'a', emoji: 'A', label: 'A', description: 'A', earned: true },
      { id: 'b', emoji: 'B', label: 'B', description: 'B', earned: false },
      { id: 'c', emoji: 'C', label: 'C', description: 'C', earned: true },
    ])

    expect(summary).toEqual({ earned: 2, total: 3 })
  })
})
