import { describe, expect, it } from 'vitest'
import { detectAvoidOverlaps, normalizePhoneKR } from './avoidance'

describe('normalizePhoneKR', () => {
  it('하이픈·공백 등 비숫자 제거', () => {
    expect(normalizePhoneKR('010-1234-5678')).toBe('01012345678')
    expect(normalizePhoneKR('010 1234 5678')).toBe('01012345678')
  })
  it('+82 국가코드를 0으로 보정', () => {
    expect(normalizePhoneKR('+82 10-1234-5678')).toBe('01012345678')
    expect(normalizePhoneKR('821012345678')).toBe('01012345678')
  })
  it('빈 입력 안전 처리', () => {
    expect(normalizePhoneKR('')).toBe('')
  })
  it('같은 번호의 표기 차이는 동일하게 정규화(해시 대조 일관성)', () => {
    expect(normalizePhoneKR('010-1234-5678')).toBe(normalizePhoneKR('+821012345678'))
  })
})

describe('detectAvoidOverlaps', () => {
  it('내 회피 목록 해시와 일치 → avoid-list', () => {
    const out = detectAvoidOverlaps({ myAvoidHashes: ['h1'] }, [
      { userId: 'u1', phoneHash: 'h1' },
      { userId: 'u2', phoneHash: 'h2' },
    ])
    expect(out).toEqual([{ userId: 'u1', reasons: ['avoid-list'] }])
  })

  it('상대 회피 목록에 내 해시 → they-avoid-me (양방향 감지)', () => {
    const out = detectAvoidOverlaps({ myPhoneHash: 'me' }, [{ userId: 'u1', avoidHashes: ['me'] }])
    expect(out[0]?.reasons).toContain('they-avoid-me')
  })

  it('차단한 사용자 → blocked', () => {
    const out = detectAvoidOverlaps({ myBlockedUserIds: ['u1'] }, [{ userId: 'u1' }])
    expect(out[0]?.reasons).toContain('blocked')
  })

  it('같은 회사 회피는 옵션 on일 때만, 대소문자/공백 무시', () => {
    const attendees = [{ userId: 'u1', company: '  Toss  ' }]
    expect(
      detectAvoidOverlaps({ myCompany: 'toss', avoidSameCompany: true }, attendees)[0]?.reasons,
    ).toContain('same-company')
    expect(detectAvoidOverlaps({ myCompany: 'toss', avoidSameCompany: false }, attendees)).toEqual(
      [],
    )
  })

  it('여러 사유가 동시에 잡힘', () => {
    const out = detectAvoidOverlaps({ myAvoidHashes: ['h1'], myBlockedUserIds: ['u1'] }, [
      { userId: 'u1', phoneHash: 'h1' },
    ])
    expect(out[0]?.reasons).toEqual(expect.arrayContaining(['blocked', 'avoid-list']))
  })

  it('사유 없으면 결과에서 제외', () => {
    expect(detectAvoidOverlaps({}, [{ userId: 'u1', phoneHash: 'h1' }])).toEqual([])
  })
})
