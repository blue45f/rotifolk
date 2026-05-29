import { z } from 'zod'

export const AvatarMoodEnum = z.enum(['chill', 'sparkling', 'curious', 'witty', 'cozy', 'mystery'])
export const AvatarPatternEnum = z.enum([
  'solid',
  'gradient',
  'sparkle',
  'wave',
  'aurora',
  'confetti',
])
export const AvatarBackdropEnum = z.enum([
  'none',
  'halo',
  'spotlight',
  'bokeh',
  'grid',
  'wine-stain',
])

export const UpsertAvatarSchema = z.object({
  mood: AvatarMoodEnum,
  hue: z.string().regex(/^#?[0-9a-fA-F]{6}$/),
  pattern: AvatarPatternEnum.default('gradient'),
  emojiBadge: z.string().min(1).max(8),
  faceSeed: z.string().min(1).max(40),
  backdrop: AvatarBackdropEnum.default('none'),
  accessories: z.array(z.string().max(24)).max(6).default([]),
  vibeWord: z.string().max(20).optional().nullable(),
})
export type UpsertAvatarDto = z.infer<typeof UpsertAvatarSchema>
