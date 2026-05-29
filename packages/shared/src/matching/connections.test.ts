import { describe, expect, it } from 'vitest'
import { computeConnections } from './connections'

describe('computeConnections', () => {
  it('mutual-only: 서로 지목한 쌍만 연결', () => {
    const out = computeConnections({
      scope: 'mutual-only',
      votes: [
        { fromUserId: 'a', toUserId: 'b' },
        { fromUserId: 'b', toUserId: 'a' },
        { fromUserId: 'a', toUserId: 'c' }, // 일방
      ],
    })
    expect(out).toHaveLength(1)
    expect(out[0].result).toBe('mutual')
  })

  it('top-n: 누적 호감 상위 N명까지 (상호 아니어도)', () => {
    const out = computeConnections({
      scope: 'top-n',
      maxPerPerson: 1,
      votes: [
        { fromUserId: 'a', toUserId: 'b' },
        { fromUserId: 'a', toUserId: 'b' }, // b 2표
        { fromUserId: 'a', toUserId: 'c' }, // c 1표
      ],
    })
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ userAId: 'a', userBId: 'b', result: 'top-pick' })
  })

  it('all-participants: 전원 상호 연결', () => {
    const out = computeConnections({
      scope: 'all-participants',
      votes: [],
      allUserIds: ['a', 'b', 'c'],
    })
    expect(out).toHaveLength(3) // ab, ac, bc
    expect(out.every((c) => c.result === 'all')).toBe(true)
  })
})
