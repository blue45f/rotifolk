import type { ID, ISODateString, Timestamps } from './common'

export type QuizQuestionKind = 'multiple-choice' | 'true-false' | 'open-text' | 'image-pick'

export interface QuizQuestion extends Timestamps {
  id: ID
  partyId: ID
  kind: QuizQuestionKind
  prompt: string
  options: string[]
  correctOptionIndex?: number | null
  durationSec: number
  imageUrl?: string | null
}

export interface QuizAnswer {
  id: ID
  questionId: ID
  userId: ID
  selectedOptionIndex?: number | null
  freeText?: string | null
  answeredAt: ISODateString
  isCorrect?: boolean | null
}

export interface QuizLeaderboardEntry {
  userId: ID
  nickname: string
  avatarId?: ID | null
  score: number
  correctCount: number
  averageResponseMs: number
}
