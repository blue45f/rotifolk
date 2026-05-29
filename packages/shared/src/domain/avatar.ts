import type { ID, Timestamps } from './common'

export type AvatarMood = 'chill' | 'sparkling' | 'curious' | 'witty' | 'cozy' | 'mystery'

export type AvatarPattern = 'solid' | 'gradient' | 'sparkle' | 'wave' | 'aurora' | 'confetti'

export type AvatarBackdrop = 'none' | 'halo' | 'spotlight' | 'bokeh' | 'grid' | 'wine-stain'

export interface Avatar extends Timestamps {
  id: ID
  ownerId: ID
  mood: AvatarMood
  hue: string // hex color, eg #B8336A
  pattern: AvatarPattern
  emojiBadge: string // single emoji
  faceSeed: string // svg seed for deterministic illustration
  // 빌더 고도화
  backdrop: AvatarBackdrop
  accessories: string[] // 'glasses' | 'hat' | 'sparkle-ring' | 'headphones' ...
  vibeWord?: string | null
}

export const AVATAR_MOODS: { value: AvatarMood; label: string; emoji: string }[] = [
  { value: 'chill', label: '차분', emoji: '🌙' },
  { value: 'sparkling', label: '반짝', emoji: '✨' },
  { value: 'curious', label: '호기심', emoji: '🔍' },
  { value: 'witty', label: '위트', emoji: '😏' },
  { value: 'cozy', label: '포근', emoji: '🧶' },
  { value: 'mystery', label: '미스터리', emoji: '🎭' },
]

export const AVATAR_ACCESSORIES: { value: string; label: string; emoji: string }[] = [
  { value: 'glasses', label: '안경', emoji: '👓' },
  { value: 'hat', label: '모자', emoji: '🎩' },
  { value: 'sparkle-ring', label: '반짝 링', emoji: '💫' },
  { value: 'headphones', label: '헤드폰', emoji: '🎧' },
  { value: 'flower', label: '꽃', emoji: '🌷' },
  { value: 'star', label: '별', emoji: '⭐' },
]
