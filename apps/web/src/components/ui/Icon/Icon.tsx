import type { ReactNode, SVGProps } from 'react'

/**
 * Rotifolk inline-icon set.
 *
 * A small, self-contained line-glyph family that replaces emoji-as-icon usage
 * in product chrome (nav, hero CTA, discover filters, dialogs). Every glyph is
 * drawn on a 24-unit grid, sized to `1em`, and inherits `currentColor` so it
 * picks up the apricot / teal token of whatever control hosts it (outline
 * Button = apricot, selected Chip = paper-on-apricot). No color is baked in.
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
  | 'sliders' // 필터 더보기
  | 'music' // BGM (was 🎵)
  | 'close' // 닫기 (was ✕)
  | 'home' // 홈 (was 🏠)
  | 'compass' // 둘러보기 (was 🧭)
  | 'chat' // 채팅 (was 💬)
  | 'mail' // 초대 (was 💌)
  | 'user' // 프로필 (was 👤)
  | 'shield' // 호스트/관리 (was 🛡️)
  | 'search' // 검색 (was 🔍)
  | 'bookmark' // 저장 (was 🔖)
  | 'bell' // 알림 (was 🔔)
  | 'check' // 확인
  | 'plus' // 추가
  | 'settings' // 설정 (was ⚙️)
  | 'chevron-right' // 이동
  | 'sun' // 라이트 테마 (was ☀️)
  | 'monitor' // 시스템 테마 (was 🖥️)

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
  // Sliders: three rails with knobs — the "more filters" control.
  sliders: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17" r="2.4" fill="currentColor" stroke="none" />
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
  // Close: a clean X.
  close: <path d="M6 6l12 12M18 6 6 18" />,
  // Home: roofline over a doorway.
  home: <path d="M4 11.5 12 4l8 7.5M6 10v9.5h12V10" />,
  // Compass: discovery needle in a ring.
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.5 8.5 13.5 13l-4.5 2 2-4.5 4.5-2Z" fill="currentColor" stroke="none" />
    </>
  ),
  // Chat: a rounded speech bubble with a small tail.
  chat: (
    <path d="M5 17.5V7a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 7v6a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.5v-2Z" />
  ),
  // Mail / invite: an open envelope flap.
  mail: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="2.5" />
      <path d="M4.5 7.5 12 13l7.5-5.5" />
    </>
  ),
  // User: head and shoulders.
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  // Shield: host / moderation crest.
  shield: <path d="M12 3.5 19 6v5.5c0 4.4-3 7.5-7 9-4-1.5-7-4.6-7-9V6l7-2.5Z" />,
  // Search: lens and handle.
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
  // Bookmark: a saved ribbon.
  bookmark: <path d="M7 4.5h10V20l-5-3.5L7 20V4.5Z" />,
  // Bell: notifications.
  bell: (
    <>
      <path d="M6.5 17.5c1-1 1.5-2.3 1.5-3.8v-2.2a4 4 0 1 1 8 0v2.2c0 1.5.5 2.8 1.5 3.8H6.5Z" />
      <path d="M10.5 20.5a2 2 0 0 0 3 0" />
    </>
  ),
  // Check: a confirm tick.
  check: <path d="M5 12.5 10 17.5 19 7" />,
  // Plus: add.
  plus: <path d="M12 5v14M5 12h14" />,
  // Settings: a six-spoke gear.
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M21 12h-3M6 12H3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7 5.6 5.6" />
    </>
  ),
  // Chevron-right: navigate forward.
  'chevron-right': <path d="m9.5 6 6 6-6 6" />,
  // Sun: light theme, core disc with rays.
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.1 5.1l1.8 1.8M17.1 17.1l1.8 1.8M18.9 5.1l-1.8 1.8M6.9 17.1l-1.8 1.8" />
    </>
  ),
  // Monitor: system theme, a screen on a stand.
  monitor: (
    <>
      <rect x="3.5" y="4.5" width="17" height="11" rx="2" />
      <path d="M9.5 19.5h5M12 15.5v4" />
    </>
  ),
}

export default Icon
