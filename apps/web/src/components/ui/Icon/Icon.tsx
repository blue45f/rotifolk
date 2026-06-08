import type { ReactNode, SVGProps } from 'react'

/**
 * Rotifolk inline-icon set.
 *
 * A small, self-contained line-glyph family that replaces emoji-as-icon usage
 * in product chrome (hero CTA, discover filters). Every glyph is drawn on a
 * 24-unit grid, sized to `1em`, and inherits `currentColor` so it picks up the
 * burgundy / gold token of whatever control hosts it (outline Button = burgundy,
 * selected Chip = cream-on-burgundy). No color is baked in.
 *
 * Deliberately excludes the category glyphs (wine, coffee, tea ...): per the
 * design system, category emoji ARE brand identity and are kept as-is.
 */

export type IconName =
  | 'bolt' // 즉석 모임 (was ⚡)
  | 'sparkle' // 전체 / 모두 (was 🌟)
  | 'pin' // 지역 · 가까운 (was 📍)
  | 'clock' // 곧 시작 (was ⏰)
  | 'flame' // 인기 (was 🔥)
  | 'moon' // 모집 중 (was 🌙)
  | 'live' // 진행 중 (was 🔴)
  | 'archive' // 지난 모임 (was 📜)
  | 'music' // BGM (was 🎵)

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** Visual size in em (relative to current font-size). Default 1.1. */
  size?: number
  /** Stroke weight on the 24-grid. Default 1.75. */
  weight?: number
  /** Accessible label. When omitted the icon is decorative (aria-hidden). */
  title?: string
}

export function Icon({ name, size = 1.1, weight = 1.75, title, ...rest }: IconProps) {
  const decorative = !title
  return (
    <svg
      viewBox="0 0 24 24"
      width={`${size}em`}
      height={`${size}em`}
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {GLYPHS[name]}
    </svg>
  )
}

/**
 * Glyph geometry. Each entry is the inner SVG content for `name`.
 * Filled accents (the bolt core, the live dot) use `currentColor` fill so they
 * read as a single tinted mark rather than a hollow outline.
 */
const GLYPHS: Record<IconName, ReactNode> = {
  // A poured-spark bolt: angular, weighted toward the base like a decanter pour.
  bolt: (
    <path d="M13.5 3 5.5 13.2h5.1l-1.1 7.8 8-10.2h-5.1L13.5 3Z" fill="currentColor" stroke="none" />
  ),
  // Four-point sparkle, long vertical axis, with two faint satellite glints.
  sparkle: (
    <>
      <path d="M12 3.5c.5 3.6 1.4 4.5 5 5-3.6.5-4.5 1.4-5 5-.5-3.6-1.4-4.5-5-5 3.6-.5 4.5-1.4 5-5Z" />
      <path d="M18.5 14.5c.2 1.4.6 1.8 2 2-1.4.2-1.8.6-2 2-.2-1.4-.6-1.8-2-2 1.4-.2 1.8-.6 2-2Z" />
    </>
  ),
  // Map pin with hollow center, grounded on a short shadow tick.
  pin: (
    <>
      <path d="M12 21c4-3.6 6-6.6 6-9.5A6 6 0 0 0 6 11.5C6 14.4 8 17.4 12 21Z" />
      <circle cx="12" cy="11" r="2.25" />
    </>
  ),
  // Clock, hands set near the top to read "soon".
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 1.6" />
    </>
  ),
  // Single tapered flame, no cartoon lobes.
  flame: (
    <path d="M12.5 3c.6 2.8-1.5 3.9-2.9 5.6-1.4 1.7-2.6 3.6-2.6 5.7a7 7 0 0 0 14 0c0-2.3-1.1-3.9-2.4-5.1-.6 1.3-1.5 1.7-2.3 1.7 1-2.1.5-4.6-1.8-7.9Z" />
  ),
  // Crescent moon, the recruiting / quiet-evening state.
  moon: <path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5Z" />,
  // Live: a filled core inside a broadcast ring.
  live: (
    <>
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      <path d="M6.5 6.5a7.8 7.8 0 0 0 0 11M17.5 6.5a7.8 7.8 0 0 1 0 11" />
    </>
  ),
  // Archive scroll: a furled record of past rounds.
  archive: (
    <>
      <path d="M7 4h8a2.5 2.5 0 0 1 2.5 2.5V18a2 2 0 0 1-2 2H7" />
      <path d="M7 4a2.5 2.5 0 0 0-2.5 2.5V7H7" />
      <path d="M9.5 9.5h5M9.5 13h5M9.5 16.5h3" />
    </>
  ),
  // Lounge BGM Double Note
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" fill="currentColor" />
      <circle cx="18" cy="16" r="3" fill="currentColor" />
    </>
  ),
}

export default Icon
