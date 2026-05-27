import { describe, expect, it } from 'vitest'
import { findMutualMatches } from './final-match'

describe('findMutualMatches', () => {
  it('returns mutual matches', () => {
    const votes = [
      { fromUserId: 'a', toUserId: 'b' },
      { fromUserId: 'b', toUserId: 'a' },
      { fromUserId: 'c', toUserId: 'd' },
    ]
    const matches = findMutualMatches(votes)
    expect(matches).toEqual([{ userAId: 'a', userBId: 'b' }])
  })

  it('dedupes both directions', () => {
    const votes = [
      { fromUserId: 'x', toUserId: 'y' },
      { fromUserId: 'y', toUserId: 'x' },
    ]
    expect(findMutualMatches(votes)).toHaveLength(1)
  })

  it('returns empty when no mutuals', () => {
    expect(findMutualMatches([{ fromUserId: 'a', toUserId: 'b' }])).toHaveLength(0)
  })
})
