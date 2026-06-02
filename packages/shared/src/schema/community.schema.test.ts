import { describe, expect, it } from 'vitest'
import {
  CreateCommunityCommentSchema,
  CreateCommunityPostSchema,
  CreateReportSchema,
} from './community.schema'

describe('CreateCommunityCommentSchema', () => {
  it('accepts a parentId for one-level replies', () => {
    const result = CreateCommunityCommentSchema.safeParse({
      body: '저도 참여 전에 궁금했던 내용이에요.',
      parentId: 'comment_root',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.parentId).toBe('comment_root')
    }
  })

  it('rejects blank comment bodies after trimming', () => {
    const result = CreateCommunityCommentSchema.safeParse({ body: '   ' })
    expect(result.success).toBe(false)
  })
})

describe('CreateCommunityPostSchema', () => {
  it('normalizes tags and enforces product-safe post length', () => {
    const result = CreateCommunityPostSchema.safeParse({
      title: '첫 로테이션 모임 전에 뭘 준비하면 좋을까요?',
      body: '와인 초보라서 라운드 전에 어느 정도 준비하면 좋을지 궁금해요.',
      category: 'question',
      area: '한남동',
      tags: [' 와인 ', '초보'],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual(['와인', '초보'])
    }
  })
})

describe('CreateReportSchema', () => {
  it('accepts community post and comment report targets', () => {
    const result = CreateReportSchema.safeParse({
      communityPostId: 'cp_first',
      communityCommentId: 'cc_host_tip',
      kind: 'inappropriate',
      body: '개인정보를 유도하는 댓글이라 신고합니다.',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.communityPostId).toBe('cp_first')
      expect(result.data.communityCommentId).toBe('cc_host_tip')
    }
  })

  it('rejects reports without any target', () => {
    const result = CreateReportSchema.safeParse({
      kind: 'spam',
      body: '대상 없는 신고는 운영자가 처리할 수 없어요.',
    })

    expect(result.success).toBe(false)
  })

  it('rejects blank report bodies after trimming', () => {
    const result = CreateReportSchema.safeParse({
      communityPostId: 'cp_first',
      kind: 'other',
      body: '   ',
    })

    expect(result.success).toBe(false)
  })
})
