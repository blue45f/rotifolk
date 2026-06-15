import { describe, expect, it } from 'vitest'

import { computeProfileCompleteness, type ProfileCompletenessInput } from './index'

const empty: ProfileCompletenessInput = {
  bio: null,
  mbti: null,
  interests: [],
  avatarImage: null,
  gender: null,
  birthYear: null,
  isVerified: false,
  verifiedFields: [],
  instagram: null,
  kakaoId: null,
  profile: null,
}

describe('computeProfileCompleteness', () => {
  it('빈 프로필은 0%이고 미완 항목이 전부다', () => {
    const r = computeProfileCompleteness(empty)
    expect(r.percent).toBe(0)
    expect(r.doneCount).toBe(0)
    expect(r.totalCount).toBe(r.items.length)
    expect(r.items.every((i) => !i.done)).toBe(true)
  })

  it('완전히 채운 프로필은 100%다', () => {
    const r = computeProfileCompleteness({
      bio: '와인과 사람을 좋아해요',
      mbti: 'ENFP',
      interests: ['wine', 'art', 'travel'],
      avatarImage: 'data:image/png;base64,xxx',
      gender: 'female',
      birthYear: 1994,
      isVerified: true,
      verifiedFields: ['identity'],
      instagram: 'someone',
      kakaoId: null,
      profile: { oneLiner: '차분한 대화를 좋아해요' },
    })
    expect(r.percent).toBe(100)
    expect(r.doneCount).toBe(r.totalCount)
    expect(r.nextItem).toBeNull()
  })

  it('공백 문자열은 채운 것으로 보지 않는다', () => {
    const r = computeProfileCompleteness({ ...empty, bio: '   ', mbti: '\n' })
    expect(r.percent).toBe(0)
  })

  it('관심사는 2개 이상일 때만 완성으로 본다', () => {
    const one = computeProfileCompleteness({ ...empty, interests: ['wine'] })
    expect(one.items.find((i) => i.key === 'interests')?.done).toBe(false)
    const two = computeProfileCompleteness({ ...empty, interests: ['wine', 'coffee'] })
    expect(two.items.find((i) => i.key === 'interests')?.done).toBe(true)
  })

  it('isVerified 또는 identity 인증 필드 둘 중 하나면 인증 완료다', () => {
    const byFlag = computeProfileCompleteness({ ...empty, isVerified: true })
    expect(byFlag.items.find((i) => i.key === 'verified')?.done).toBe(true)
    const byField = computeProfileCompleteness({ ...empty, verifiedFields: ['identity'] })
    expect(byField.items.find((i) => i.key === 'verified')?.done).toBe(true)
  })

  it('nextItem은 미완 항목 중 가중치가 가장 높은 것이다', () => {
    // 가중치 3 항목(소개·사진·관심사·인증)만 채우면, 다음은 가중치 2 항목 중 하나.
    const r = computeProfileCompleteness({
      ...empty,
      bio: '소개',
      avatarImage: 'data:image/png;base64,x',
      interests: ['a', 'b'],
      isVerified: true,
    })
    expect(r.nextItem).not.toBeNull()
    expect(r.nextItem?.weight).toBe(2)
  })

  it('사전 프로필은 이상형/프롬프트 답변으로도 인정된다', () => {
    const byIdeal = computeProfileCompleteness({
      ...empty,
      profile: { idealType: ['유머러스한 사람'] },
    })
    expect(byIdeal.items.find((i) => i.key === 'preProfile')?.done).toBe(true)
    const byPrompt = computeProfileCompleteness({
      ...empty,
      profile: { prompts: [{ q: '주말엔?', a: '등산을 가요' }] },
    })
    expect(byPrompt.items.find((i) => i.key === 'preProfile')?.done).toBe(true)
  })

  it('percent는 0~100 정수다', () => {
    const r = computeProfileCompleteness({ ...empty, bio: '소개', mbti: 'INTJ' })
    expect(Number.isInteger(r.percent)).toBe(true)
    expect(r.percent).toBeGreaterThan(0)
    expect(r.percent).toBeLessThan(100)
  })
})
