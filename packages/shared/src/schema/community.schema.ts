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

export const CreateCommunityPostSchema = z.object({
  title: z.string().trim().min(6).max(80),
  body: z.string().trim().min(10).max(2000),
  category: CommunityPostCategoryEnum.default('question'),
  area: z.string().trim().min(1).max(20).optional().nullable(),
  partyId: z.string().min(1).optional().nullable(),
  tags: z.array(TagSchema).max(8).default([]),
})
export type CreateCommunityPostDto = z.infer<typeof CreateCommunityPostSchema>

export const CreateCommunityCommentSchema = z.object({
  body: z.string().trim().min(1).max(800),
  parentId: z.string().min(1).optional().nullable(),
})
export type CreateCommunityCommentDto = z.infer<typeof CreateCommunityCommentSchema>

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
        value.targetUserId || value.partyId || value.communityPostId || value.communityCommentId,
      ),
    {
      message: '신고 대상을 선택해 주세요.',
      path: ['targetUserId'],
    },
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
