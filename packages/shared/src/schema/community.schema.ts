import { z } from 'zod'

export const CommunityPostCategoryEnum = z.enum([
  'question',
  'after-party',
  'venue-tip',
  'match-review',
])

const TagSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .transform((value) => value.replace(/^#/, ''))

/**
 * 게시글 첨부 이미지 캡 — 클라이언트가 긴 변 1600px로 리사이즈한 webp/jpeg면
 * 보통 100~300KB라 700K 문자(data URL ≈ 512KB 원본)면 충분한 상한이다.
 * 서버 json 본문 한도(1mb)와 함께 움직인다.
 */
export const POST_IMAGE_MAX_LENGTH = 700_000

/**
 * data URL 형식의 게시글 이미지 — 래스터 포맷 화이트리스트 + 길이 캡.
 * svg는 스크립트 실행 면이 있어 목록에서 제외한다(XSS 방어).
 */
export const PostImageDataSchema = z
  .string()
  .regex(/^data:image\/(png|jpe?g|webp|gif|avif);base64,/, {
    message: 'imageData must be a base64 raster data:image/* URL (svg 제외)',
  })
  .max(POST_IMAGE_MAX_LENGTH)

export const CreateCommunityPostSchema = z.object({
  title: z.string().trim().min(6).max(80),
  body: z.string().trim().min(10).max(2000),
  category: CommunityPostCategoryEnum.default('question'),
  area: z.string().trim().min(1).max(20).optional().nullable(),
  partyId: z.string().min(1).optional().nullable(),
  tags: z.array(TagSchema).max(8).default([]),
  imageData: PostImageDataSchema.optional().nullable(),
})
export type CreateCommunityPostDto = z.infer<typeof CreateCommunityPostSchema>

export const UpdateCommunityPostSchema = z
  .object({
    title: z.string().trim().min(6).max(80).optional(),
    body: z.string().trim().min(10).max(2000).optional(),
    category: CommunityPostCategoryEnum.optional(),
    area: z.string().trim().min(1).max(20).optional().nullable(),
    tags: z.array(TagSchema).max(8).optional(),
    /** null이면 첨부 제거. */
    imageData: PostImageDataSchema.optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: '수정할 내용을 입력해 주세요.',
  })
export type UpdateCommunityPostDto = z.infer<typeof UpdateCommunityPostSchema>

export const CreateCommunityCommentSchema = z.object({
  body: z.string().trim().min(1).max(800),
  parentId: z.string().min(1).optional().nullable(),
})
export type CreateCommunityCommentDto = z.infer<typeof CreateCommunityCommentSchema>

export const UpdateCommunityCommentSchema = z.object({
  body: z.string().trim().min(1).max(800),
})
export type UpdateCommunityCommentDto = z.infer<typeof UpdateCommunityCommentSchema>

export const ReportKindEnum = z.enum(['harassment', 'spam', 'inappropriate', 'other'])

export const CreateReportSchema = z
  .object({
    targetUserId: z.string().min(1).optional().nullable(),
    partyId: z.string().min(1).optional().nullable(),
    communityPostId: z.string().min(1).optional().nullable(),
    communityCommentId: z.string().min(1).optional().nullable(),
    kind: ReportKindEnum,
    body: z.string().trim().min(4).max(500),
  })
  .refine(
    (value) =>
      Boolean(
        value.targetUserId || value.partyId || value.communityPostId || value.communityCommentId
      ),
    {
      message: '신고 대상을 선택해 주세요.',
      path: ['targetUserId'],
    }
  )
export type CreateReportDto = z.infer<typeof CreateReportSchema>

export const UpdateReportStatusSchema = z.object({
  status: z.enum(['reviewing', 'resolved', 'dismissed']),
  note: z.string().trim().max(500).optional().nullable(),
  hideContent: z.boolean().default(false),
})
export type UpdateReportStatusDto = z.infer<typeof UpdateReportStatusSchema>

export const CommunityPostQuerySchema = z.object({
  category: CommunityPostCategoryEnum.optional(),
  area: z.string().trim().min(1).max(20).optional(),
  q: z.string().trim().min(1).max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(12),
})
export type CommunityPostQueryDto = z.infer<typeof CommunityPostQuerySchema>
