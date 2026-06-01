import { describe, expect, it } from 'vitest'
import { buildCommunityCommentTree, type CommunityComment } from './community'

const baseComment = {
  postId: 'post_1',
  author: {
    id: 'user_1',
    nickname: '윤슬',
    avatarId: null,
    role: 'host',
    isVerified: true,
  },
  createdAt: '2026-06-02T10:00:00.000Z',
  updatedAt: '2026-06-02T10:00:00.000Z',
} satisfies Omit<CommunityComment, 'id' | 'body' | 'parentId' | 'replies'>

describe('buildCommunityCommentTree', () => {
  it('keeps root comments first and nests one-level replies below their parent', () => {
    const comments: CommunityComment[] = [
      { ...baseComment, id: 'reply_1', parentId: 'root_1', body: '저도 같은 고민이에요.' },
      {
        ...baseComment,
        id: 'root_1',
        parentId: null,
        body: '처음 모임 전에 뭘 준비하면 좋을까요?',
      },
      { ...baseComment, id: 'root_2', parentId: null, body: '와인 초보도 괜찮나요?' },
    ]

    const tree = buildCommunityCommentTree(comments)
    const first = tree[0]
    const second = tree[1]

    expect(tree).toHaveLength(2)
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(first?.id).toBe('root_1')
    expect(first?.replies).toEqual([expect.objectContaining({ id: 'reply_1' })])
    expect(second?.id).toBe('root_2')
  })

  it('prevents deep nesting by folding replies-to-replies into the top parent thread', () => {
    const comments: CommunityComment[] = [
      { ...baseComment, id: 'root_1', parentId: null, body: '첫 댓글' },
      { ...baseComment, id: 'reply_1', parentId: 'root_1', body: '답장' },
      { ...baseComment, id: 'deep_1', parentId: 'reply_1', body: '답장의 답장' },
    ]

    const tree = buildCommunityCommentTree(comments)
    const root = tree[0]

    expect(tree).toHaveLength(1)
    expect(root).toBeDefined()
    expect(root?.replies?.map((reply) => reply.id)).toEqual(['reply_1', 'deep_1'])
    expect(root?.replies?.every((reply) => reply.parentId === 'root_1')).toBe(true)
  })
})
