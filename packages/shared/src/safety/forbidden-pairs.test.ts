import { describe, expect, it } from 'vitest'

import { repairForbiddenPairs } from '../matching/group-rotation'

import { computeForbiddenPairs } from './avoidance'

describe('computeForbiddenPairs', () => {
  it('차단(양방향)으로 금지쌍 산출', () => {
    const out = computeForbiddenPairs([
      { userId: 'a', blockedUserIds: ['b'] },
      { userId: 'b' },
      { userId: 'c' },
    ])
    expect(out).toEqual([['a', 'b']])
  })

  it('회피 해시 대조(양방향)', () => {
    const out = computeForbiddenPairs([
      { userId: 'a', phoneHash: 'hashA' },
      { userId: 'b', avoidHashes: ['hashA'] }, // b가 a를 회피
    ])
    expect(out).toEqual([['a', 'b']])
  })

  it('같은 회사는 한쪽이라도 회피 on일 때만 금지', () => {
    const on = computeForbiddenPairs([
      { userId: 'a', company: 'Toss', avoidSameCompany: true },
      { userId: 'b', company: 'toss ' },
    ])
    expect(on).toEqual([['a', 'b']])

    const off = computeForbiddenPairs([
      { userId: 'a', company: 'Toss' },
      { userId: 'b', company: 'Toss' },
    ])
    expect(off).toEqual([])
  })
})

describe('repairForbiddenPairs', () => {
  it('같은 라운드 내 교환으로 금지쌍 회피', () => {
    // 라운드: [a,b] [c,d], a-b 금지 → 교환 후 a,b 분리
    const rounds = [
      {
        index: 1,
        pairs: [
          ['a', 'b'],
          ['c', 'd'],
        ],
      },
    ]
    const out = repairForbiddenPairs(rounds, [['a', 'b']])
    const hasAB = out[0].pairs.some((g) => g.includes('a') && g.includes('b'))
    expect(hasAB).toBe(false)
    // 인원 보존
    expect(out[0].pairs.flat().sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('금지쌍이 없으면 그대로', () => {
    const rounds = [{ index: 1, pairs: [['a', 'b']] }]
    expect(repairForbiddenPairs(rounds, [])).toEqual(rounds)
  })
})
