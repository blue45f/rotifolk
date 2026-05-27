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

export const CATEGORY_META: Record<PartyCategory, CategoryMeta> = {
  wine: {
    value: 'wine',
    label: '와인 로테이션',
    shortLabel: '와인',
    emoji: '🍷',
    description: '6 라운드, 6 잔의 와인. 마지막 라운드에 최종 매칭.',
    accentHex: '#7A1F3D',
    bgGradient: 'linear-gradient(135deg, #4A0E25 0%, #7A1F3D 50%, #C9627F 100%)',
  },
  'natural-wine': {
    value: 'natural-wine',
    label: '내추럴 와인',
    shortLabel: '내추럴',
    emoji: '🌿',
    description: '자연 그대로의 와인, 약간 거친 맛으로 시작하는 대화.',
    accentHex: '#8E6B27',
    bgGradient: 'linear-gradient(135deg, #5C4A22 0%, #B47433 100%)',
  },
  coffee: {
    value: 'coffee',
    label: '커피 시음',
    shortLabel: '커피',
    emoji: '☕️',
    description: '스페셜티 빈을 두고, 같은 잔을 두고 농담하다 보면 친해져요.',
    accentHex: '#6B4226',
    bgGradient: 'linear-gradient(135deg, #4A2D1A 0%, #6B4226 50%, #C49A6A 100%)',
  },
  tea: {
    value: 'tea',
    label: '차 다실',
    shortLabel: '차',
    emoji: '🍵',
    description: '한옥 다실에서 깊고 조용한 4단계 질문 카드.',
    accentHex: '#6B8E5A',
    bgGradient: 'linear-gradient(135deg, #3F5C36 0%, #6B8E5A 50%, #B5CFA3 100%)',
  },
  whisky: {
    value: 'whisky',
    label: '위스키 페어링',
    shortLabel: '위스키',
    emoji: '🥃',
    description: '6종 싱글몰트와 다크초콜릿. 라운드마다 글래스가 바뀝니다.',
    accentHex: '#B47433',
    bgGradient: 'linear-gradient(135deg, #5B3A18 0%, #B47433 50%, #E2B978 100%)',
  },
  cocktail: {
    value: 'cocktail',
    label: '시그니처 칵테일',
    shortLabel: '칵테일',
    emoji: '🍸',
    description: '바텐더가 라운드마다 새 시그니처를 따라줘요.',
    accentHex: '#2F7884',
    bgGradient: 'linear-gradient(135deg, #1E4D55 0%, #2F7884 50%, #7FBFC9 100%)',
  },
  beer: {
    value: 'beer',
    label: '크래프트 비어',
    shortLabel: '비어',
    emoji: '🍺',
    description: 'IPA부터 스타우트까지, 가볍게 시작하는 라운드.',
    accentHex: '#C89E2A',
    bgGradient: 'linear-gradient(135deg, #6B5310 0%, #C89E2A 50%, #F2D77E 100%)',
  },
  sake: {
    value: 'sake',
    label: '사케 한 잔',
    shortLabel: '사케',
    emoji: '🍶',
    description: '차게, 데우게, 그리고 새로 만난 사람과.',
    accentHex: '#5E7575',
    bgGradient: 'linear-gradient(135deg, #303D3D 0%, #5E7575 50%, #B7C8C8 100%)',
  },
  dessert: {
    value: 'dessert',
    label: '디저트 페어링',
    shortLabel: '디저트',
    emoji: '🍰',
    description: '달콤한 한 입과 함께, 가볍고 빠른 라운드.',
    accentHex: '#C9628E',
    bgGradient: 'linear-gradient(135deg, #80365A 0%, #C9628E 50%, #F6BFD3 100%)',
  },
  custom: {
    value: 'custom',
    label: '커스텀',
    shortLabel: '커스텀',
    emoji: '✨',
    description: '직접 정하는 테마 파티.',
    accentHex: '#6E5BB3',
    bgGradient: 'linear-gradient(135deg, #3F326E 0%, #6E5BB3 50%, #B7AAE3 100%)',
  },
}

export const ALL_CATEGORIES = Object.values(CATEGORY_META)
