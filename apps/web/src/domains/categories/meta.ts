import type { PartyCategory } from '@rotifolk/shared'

export interface CategoryMeta {
  value: PartyCategory
  label: string
  shortLabel: string
  emoji: string
  description: string
  accentHex: string
  bgGradient: string
}

/**
 * Category identity. `accentHex` / `bgGradient` are injected as inline CSS
 * values (e.g. `--chip-accent`, `background`), so they reference the
 * Aperitivo `--cat-*` design tokens directly — a single source of truth that
 * also follows light/dark. The names keep the historical `*Hex` shape for
 * compatibility, but hold token references rather than raw hex.
 *
 * Per the design system, the category EMOJI are intentional brand identity and
 * are kept as-is (they are not replaced by line icons).
 */
const drench = (token: string) =>
  `linear-gradient(135deg, color-mix(in oklab, ${token} 60%, var(--brand-clay-900)) 0%, ${token} 52%, color-mix(in oklab, ${token} 42%, var(--brand-paper-100)) 100%)`

export const CATEGORY_META: Record<PartyCategory, CategoryMeta> = {
  wine: {
    value: 'wine',
    label: '와인 로테이션',
    shortLabel: '와인',
    emoji: '🍷',
    description: '6 라운드, 6 잔의 와인. 마지막 라운드에 최종 매칭.',
    accentHex: 'var(--cat-wine)',
    bgGradient: drench('var(--cat-wine)'),
  },
  'natural-wine': {
    value: 'natural-wine',
    label: '내추럴 와인',
    shortLabel: '내추럴',
    emoji: '🌿',
    description: '자연 그대로의 와인, 약간 거친 맛으로 시작하는 대화.',
    accentHex: 'var(--cat-tea)',
    bgGradient: drench('var(--cat-tea)'),
  },
  coffee: {
    value: 'coffee',
    label: '커피 시음',
    shortLabel: '커피',
    emoji: '☕️',
    description: '스페셜티 빈을 두고, 같은 잔을 두고 농담하다 보면 친해져요.',
    accentHex: 'var(--cat-coffee)',
    bgGradient: drench('var(--cat-coffee)'),
  },
  tea: {
    value: 'tea',
    label: '차 다실',
    shortLabel: '차',
    emoji: '🍵',
    description: '한옥 다실에서 깊고 조용한 4단계 질문 카드.',
    accentHex: 'var(--cat-tea)',
    bgGradient: drench('var(--cat-tea)'),
  },
  whisky: {
    value: 'whisky',
    label: '위스키 페어링',
    shortLabel: '위스키',
    emoji: '🥃',
    description: '6종 싱글몰트와 다크초콜릿. 라운드마다 글래스가 바뀝니다.',
    accentHex: 'var(--cat-whisky)',
    bgGradient: drench('var(--cat-whisky)'),
  },
  cocktail: {
    value: 'cocktail',
    label: '시그니처 칵테일',
    shortLabel: '칵테일',
    emoji: '🍸',
    description: '바텐더가 라운드마다 새 시그니처를 따라줘요.',
    accentHex: 'var(--cat-cocktail)',
    bgGradient: drench('var(--cat-cocktail)'),
  },
  beer: {
    value: 'beer',
    label: '크래프트 비어',
    shortLabel: '비어',
    emoji: '🍺',
    description: 'IPA부터 스타우트까지, 가볍게 시작하는 라운드.',
    accentHex: 'var(--cat-beer)',
    bgGradient: drench('var(--cat-beer)'),
  },
  sake: {
    value: 'sake',
    label: '사케 한 잔',
    shortLabel: '사케',
    emoji: '🍶',
    description: '차게, 데우게, 그리고 새로 만난 사람과.',
    accentHex: 'var(--cat-sake)',
    bgGradient: drench('var(--cat-sake)'),
  },
  dessert: {
    value: 'dessert',
    label: '디저트 페어링',
    shortLabel: '디저트',
    emoji: '🍰',
    description: '달콤한 한 입과 함께, 가볍고 빠른 라운드.',
    accentHex: 'var(--cat-dessert)',
    bgGradient: drench('var(--cat-dessert)'),
  },
  custom: {
    value: 'custom',
    label: '커스텀',
    shortLabel: '커스텀',
    emoji: '✨',
    description: '직접 정하는 테마 파티.',
    accentHex: 'var(--cat-custom)',
    bgGradient: drench('var(--cat-custom)'),
  },
}

export const ALL_CATEGORIES = Object.values(CATEGORY_META)
