import { describe, expect, it } from 'vitest'
import {
  ClubQuerySchema,
  CreateClubCommentSchema,
  CreateClubPostSchema,
  CreateClubSchema,
} from './club.schema'
import { PostImageDataSchema, POST_IMAGE_MAX_LENGTH } from './community.schema'

describe('CreateClubSchema', () => {
  it('accepts a regular public club payload', () => {
    const result = CreateClubSchema.safeParse({
      name: '한남 내추럴 와인회',
      category: 'natural-wine',
      description: '한 달에 두 번, 한남동에서 내추럴 와인을 돌려 마시는 클럽입니다.',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.visibility).toBe('public')
    }
  })

  it('rejects custom or unknown categories', () => {
    const result = CreateClubSchema.safeParse({
      name: '아무 모임',
      category: 'custom',
      description: '카테고리 검증을 확인하기 위한 페이로드입니다.',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a too-short description after trimming', () => {
    const result = CreateClubSchema.safeParse({
      name: '커피 클럽',
      category: 'coffee',
      description: '   짧음   ',
    })
    expect(result.success).toBe(false)
  })
})

describe('ClubQuerySchema', () => {
  it('coerces page numbers and applies defaults', () => {
    const result = ClubQuerySchema.safeParse({ page: '2' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.pageSize).toBe(12)
    }
  })
})

describe('CreateClubPostSchema', () => {
  it('accepts an optional raster image attachment', () => {
    const result = CreateClubPostSchema.safeParse({
      title: '6월 정기 모임 후기',
      body: '이번 모임은 보졸레 빌라주로 시작해서 분위기가 아주 좋았어요.',
      imageData: 'data:image/webp;base64,UklGRg==',
    })
    expect(result.success).toBe(true)
  })

  it('rejects svg data URLs (XSS surface)', () => {
    const result = CreateClubPostSchema.safeParse({
      title: '6월 정기 모임 후기',
      body: '이번 모임은 보졸레 빌라주로 시작해서 분위기가 아주 좋았어요.',
      imageData: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    })
    expect(result.success).toBe(false)
  })
})

describe('CreateClubCommentSchema', () => {
  it('accepts a one-level reply parentId', () => {
    const result = CreateClubCommentSchema.safeParse({
      body: '저도 그 와인 좋았어요.',
      parentId: 'club_comment_root',
    })
    expect(result.success).toBe(true)
  })
})

describe('PostImageDataSchema', () => {
  it('rejects payloads over the shared length cap', () => {
    const oversized = `data:image/webp;base64,${'A'.repeat(POST_IMAGE_MAX_LENGTH)}`
    expect(PostImageDataSchema.safeParse(oversized).success).toBe(false)
  })

  it('rejects non-data-URL strings', () => {
    expect(PostImageDataSchema.safeParse('https://example.com/cat.png').success).toBe(false)
  })
})
