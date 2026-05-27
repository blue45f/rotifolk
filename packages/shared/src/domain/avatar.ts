import type { ID, Timestamps } from './common'

export type AvatarMood = 'chill' | 'sparkling' | 'curious' | 'witty' | 'cozy' | 'mystery'

export interface Avatar extends Timestamps {
  id: ID
  ownerId: ID
  mood: AvatarMood
  hue: string         // hex color, eg #B8336A
  pattern: 'solid' | 'gradient' | 'sparkle' | 'wave'
  emojiBadge: string  // single emoji
  faceSeed: string    // svg seed for deterministic illustration
}
