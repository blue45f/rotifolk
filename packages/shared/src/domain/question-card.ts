import type { ID, Timestamps } from './common'

export type QuestionCardDepth = 'icebreaker' | 'casual' | 'deeper' | 'spicy'

export interface QuestionCard extends Timestamps {
  id: ID
  partyId?: ID | null         // null = 글로벌 카드 풀
  depth: QuestionCardDepth
  prompt: string
  category?: string | null
  language: 'ko' | 'en'
  usedCount: number
}

export interface QuestionCardDraw {
  cardId: ID
  drawnAt: string
  pairId?: ID | null
}
