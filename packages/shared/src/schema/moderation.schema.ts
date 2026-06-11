import { z } from 'zod'

/**
 * 어드민 콘텐츠 모더레이션 — 커뮤니티/클럽 게시글의 숨김·복구·삭제·첨부 제거.
 * 신고(Report) 처리와 달리 게시글 자체를 직접 다루는 운영 도구의 계약이다.
 */

export const ModerationScopeEnum = z.enum(['community', 'club'])
export type ModerationScope = z.infer<typeof ModerationScopeEnum>

export const ModerationPostStatusEnum = z.enum(['open', 'hidden', 'removed'])
export type ModerationPostStatus = z.infer<typeof ModerationPostStatusEnum>

export const ModerationPostQuerySchema = z.object({
  scope: ModerationScopeEnum.default('community'),
  status: ModerationPostStatusEnum.optional(),
  q: z.string().trim().min(1).max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})
export type ModerationPostQueryDto = z.infer<typeof ModerationPostQuerySchema>

export const ModerationPostActionEnum = z.enum(['hide', 'restore', 'remove', 'clear-image'])
export type ModerationPostAction = z.infer<typeof ModerationPostActionEnum>

export const ModeratePostSchema = z.object({
  scope: ModerationScopeEnum,
  action: ModerationPostActionEnum,
  note: z.string().trim().max(300).optional().nullable(),
})
export type ModeratePostDto = z.infer<typeof ModeratePostSchema>

/** 모더레이션 목록의 행 — 두 스코프(커뮤니티/클럽)를 한 모양으로 정규화한다. */
export interface ModerationPostItem {
  id: string
  scope: ModerationScope
  title: string
  excerpt: string
  status: ModerationPostStatus
  hasImage: boolean
  commentCount: number
  reportCount: number
  authorNickname: string
  /** 클럽 글이면 클럽 이름, 커뮤니티 글이면 null. */
  clubName: string | null
  createdAt: string
}
