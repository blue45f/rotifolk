import { describe, expect, it } from 'vitest'
import {
  computeConnections,
  filterConnectionsExcluding,
  resolveSharedChannels,
  resolveChannelsByPolicy,
  type Connection,
} from './connections'

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

  it('mutual-plus-top-n: 상호 + 상위 후보 결합', () => {
    const out = computeConnections({
      scope: 'mutual-plus-top-n',
      maxPerPerson: 1,
      votes: [
        { fromUserId: 'a', toUserId: 'b' },
        { fromUserId: 'b', toUserId: 'a' }, // 상호
        { fromUserId: 'a', toUserId: 'c' }, // a의 상위 후보
        { fromUserId: 'd', toUserId: 'a' }, // a에게 투표
        { fromUserId: 'c', toUserId: 'b' },
      ],
    })
    expect(out).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ result: 'mutual', userAId: 'a', userBId: 'b' }),
      ]),
    )
    expect(out.length).toBeGreaterThanOrEqual(2)
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

describe('resolveSharedChannels', () => {
  it('chat은 동의 없이 항상 열리고 핸들이 없다', () => {
    const out = resolveSharedChannels(['chat'], {}, {})
    expect(out).toEqual([{ channel: 'chat', handle: null }])
  })

  it('카톡은 양쪽 동의 + 상대 핸들이 있을 때만 노출', () => {
    const me = { shareKakao: true }
    const them = { shareKakao: true, kakaoId: 'wine_lover' }
    expect(resolveSharedChannels(['chat', 'kakao'], me, them)).toEqual([
      { channel: 'chat', handle: null },
      { channel: 'kakao', handle: 'wine_lover' },
    ])
    // 한쪽만 동의하면 미노출
    expect(resolveSharedChannels(['kakao'], { shareKakao: false }, them)).toEqual([])
    // 상대 핸들 없으면 미노출
    expect(resolveSharedChannels(['kakao'], me, { shareKakao: true })).toEqual([])
  })

  it('호스트가 제공하지 않은 채널은 동의해도 미노출', () => {
    const out = resolveSharedChannels(
      ['chat'],
      { shareContact: true },
      { shareContact: true, phone: '01012345678' },
    )
    expect(out).toEqual([{ channel: 'chat', handle: null }])
  })

  it('부담 낮음→높음 순서로 정렬된다', () => {
    const me = { shareKakao: true, shareInstagram: true, shareContact: true }
    const them = {
      shareKakao: true,
      kakaoId: 'k',
      shareInstagram: true,
      instagram: 'ig',
      shareContact: true,
      phone: '01000000000',
    }
    const out = resolveSharedChannels(['phone', 'kakao', 'instagram', 'chat'], me, them)
    expect(out.map((c) => c.channel)).toEqual(['chat', 'instagram', 'kakao', 'phone'])
  })

  it('resolveChannelsByPolicy: 정책별 공개 채널 동작', () => {
    const me = {
      shareKakao: true,
      shareInstagram: true,
      shareContact: true,
      kakaoId: 'meK',
      instagram: 'meI',
      phone: '01011111111',
    }
    const partner = {
      shareKakao: true,
      shareInstagram: true,
      shareContact: true,
      kakaoId: 'youK',
      instagram: 'youI',
      phone: '01022222222',
    }
    const offered = ['chat', 'instagram', 'kakao', 'phone'] as const

    expect(resolveChannelsByPolicy('chat-only', offered, me, partner)).toEqual([
      { channel: 'chat', handle: null },
    ])
    expect(resolveChannelsByPolicy('open-after-match', offered, me, partner)).toEqual([
      { channel: 'chat', handle: null },
      { channel: 'instagram', handle: 'youI' },
      { channel: 'kakao', handle: 'youK' },
      { channel: 'phone', handle: '01022222222' },
    ])
    expect(resolveChannelsByPolicy('request-approval', offered, me, partner)).toEqual([
      { channel: 'chat', handle: null },
    ])
    expect(resolveChannelsByPolicy('mutual-consent', offered, me, partner)).toEqual([
      { channel: 'chat', handle: null },
      { channel: 'instagram', handle: 'youI' },
      { channel: 'kakao', handle: 'youK' },
      { channel: 'phone', handle: '01022222222' },
    ])
  })
})

describe('filterConnectionsExcluding', () => {
  it('금지쌍을 최종 연결에서 제거(순서 무관)', () => {
    const conns: Connection[] = [
      { userAId: 'a', userBId: 'b', result: 'mutual' },
      { userAId: 'a', userBId: 'c', result: 'mutual' },
    ]
    const out = filterConnectionsExcluding(conns, [['b', 'a']])
    expect(out).toHaveLength(1)
    expect(out[0].userBId).toBe('c')
  })
})
