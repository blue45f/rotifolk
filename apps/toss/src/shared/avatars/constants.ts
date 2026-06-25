export const AVATAR_EMOJIS = ['🍷', '🍹', '☕', '✨', '🌙', '🎲', '📿', '🧃', '🎧', '🍰'] as const

export const AVATAR_HUES = [
  '#7A1F3D',
  '#D4A24C',
  '#2F7884',
  '#6E5BB3',
  '#C9627F',
  '#6B8E5A',
  '#F7A23A',
  '#3D5A80',
] as const

export type GuestAvatar = {
  emoji: string
  hue: string
  imageData?: string | null
}

export function makeGuestAvatar(name: string, fallback: number = 0): GuestAvatar {
  const seed = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const idx = Math.abs(seed + fallback) % AVATAR_EMOJIS.length
  const hue = AVATAR_HUES[(seed + fallback) % AVATAR_HUES.length] ?? AVATAR_HUES[0]!
  return {
    emoji: AVATAR_EMOJIS[idx] ?? AVATAR_EMOJIS[0]!,
    hue,
  }
}
