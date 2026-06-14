import { describe, expect, it } from 'vitest'

import { threadCommentsWithPlaceholders } from './community.module'

const AUTHOR = {
  id: 'user_1',
  nickname: '서연',
  avatarId: null,
  role: 'host',
  isVerified: true,
}

function comment(
  id: string,
  status: string,
  parentId: string | null = null,
  body = '본문'
): Parameters<typeof threadCommentsWithPlaceholders>[0][number] {
  return {
    id,
    postId: 'post_1',
    parentId,
    body,
    status,
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-01T10:00:00Z'),
    author: AUTHOR,
  }
}

describe('threadCommentsWithPlaceholders', () => {
  it('visible 댓글은 그대로 통과시킨다', () => {
    const result = threadCommentsWithPlaceholders([comment('c1', 'visible')])
    expect(result).toHaveLength(1)
    expect(result[0].deleted).toBeUndefined()
    expect(result[0].body).toBe('본문')
  })

  it('답글이 남아 있는 removed 댓글은 본문·작성자를 비운 플레이스홀더가 된다', () => {
    const result = threadCommentsWithPlaceholders([
      comment('root', 'removed', null, '지워질 본문'),
      comment('reply', 'visible', 'root', '살아남는 답글'),
    ])
    expect(result).toHaveLength(2)
    const placeholder = result.find((item) => item.id === 'root')
    expect(placeholder?.deleted).toBe(true)
    expect(placeholder?.body).toBe('')
    expect(placeholder?.author.nickname).not.toBe(AUTHOR.nickname)
  })

  it('답글이 없는 removed 댓글은 응답에서 제외한다', () => {
    const result = threadCommentsWithPlaceholders([
      comment('alone', 'removed'),
      comment('other', 'visible'),
    ])
    expect(result.map((item) => item.id)).toEqual(['other'])
  })

  it('답글까지 모두 removed면 부모 플레이스홀더도 사라진다', () => {
    const result = threadCommentsWithPlaceholders([
      comment('root', 'removed'),
      comment('reply', 'removed', 'root'),
    ])
    expect(result).toHaveLength(0)
  })
})
