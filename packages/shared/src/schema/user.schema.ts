import { z } from 'zod'

export const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  nickname: z.string().min(2).max(16),
  birthYear: z.number().int().min(1940).max(2015).optional(),
  gender: z.enum(['male', 'female', 'other', 'private']).optional(),
})
export type SignUpDto = z.infer<typeof SignUpSchema>

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginDto = z.infer<typeof LoginSchema>

export const UpdateProfileSchema = z.object({
  nickname: z.string().min(2).max(16).optional(),
  bio: z.string().max(200).optional(),
  interests: z.array(z.string()).max(8).optional(),
  mbti: z.string().regex(/^[IE][SN][TF][JP]$/i).optional(),
})
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>
