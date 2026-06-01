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

export const CommunityPostQuerySchema = z.object({
  category: CommunityPostCategoryEnum.optional(),
  area: z.string().trim().min(1).max(20).optional(),
  q: z.string().trim().min(1).max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(12),
})
export type CommunityPostQueryDto = z.infer<typeof CommunityPostQuerySchema>
