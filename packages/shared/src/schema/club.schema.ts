import { z } from 'zod'
import { CLUB_CATEGORIES } from '../domain/club'
import { PostImageDataSchema } from './community.schema'

export const ClubCategoryEnum = z.enum(CLUB_CATEGORIES)
export const ClubVisibilityEnum = z.enum(['public', 'private'])

export const CreateClubSchema = z.object({
  name: z.string().trim().min(2).max(40),
  category: ClubCategoryEnum,
  description: z.string().trim().min(10).max(500),
  visibility: ClubVisibilityEnum.default('public'),
})
export type CreateClubDto = z.infer<typeof CreateClubSchema>

export const ClubQuerySchema = z.object({
  category: ClubCategoryEnum.optional(),
  q: z.string().trim().min(1).max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(12),
})
export type ClubQueryDto = z.infer<typeof ClubQuerySchema>

export const CreateClubPostSchema = z.object({
  title: z.string().trim().min(4).max(80),
  body: z.string().trim().min(10).max(2000),
  imageData: PostImageDataSchema.optional().nullable(),
})
export type CreateClubPostDto = z.infer<typeof CreateClubPostSchema>

export const ClubPostQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(12),
})
export type ClubPostQueryDto = z.infer<typeof ClubPostQuerySchema>

export const CreateClubCommentSchema = z.object({
  body: z.string().trim().min(1).max(800),
  parentId: z.string().min(1).optional().nullable(),
})
export type CreateClubCommentDto = z.infer<typeof CreateClubCommentSchema>
