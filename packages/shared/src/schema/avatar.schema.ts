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

/**
 * 업로드 아바타 사진 캡 — 클라이언트가 긴 변 256px·품질 0.85로 리사이즈하면
 * 보통 수십 KB라 300K 문자(data URL 기준 ≈ 225KB 원본)면 넉넉한 상한이다.
 */
export const AVATAR_IMAGE_MAX_LENGTH = 300_000

/** data URL 형식의 아바타 사진 — `data:image/<fmt>;base64,` 프리픽스 + 길이 캡 검증. */
export const AvatarImageDataSchema = z
  .string()
  .regex(/^data:image\/(png|jpe?g|webp|gif|avif);base64,/, {
    message: 'imageData must be a base64 data:image/* URL',
  })
  .max(AVATAR_IMAGE_MAX_LENGTH)

export const UpsertAvatarSchema = z.object({
  mood: AvatarMoodEnum,
  hue: z.string().regex(/^#?[0-9a-fA-F]{6}$/),
  pattern: AvatarPatternEnum.default('gradient'),
  emojiBadge: z.string().min(1).max(8),
  faceSeed: z.string().min(1).max(40),
  backdrop: AvatarBackdropEnum.default('none'),
  accessories: z.array(z.string().max(24)).max(6).default([]),
  vibeWord: z.string().max(20).optional().nullable(),
  /** 직접 업로드한 사진(data URL). null이면 삭제(프리셋 폴백). */
  imageData: AvatarImageDataSchema.nullable().optional(),
})
export type UpsertAvatarDto = z.infer<typeof UpsertAvatarSchema>
