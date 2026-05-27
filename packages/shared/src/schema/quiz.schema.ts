import { z } from 'zod'

export const QuizKindEnum = z.enum(['multiple-choice', 'true-false', 'open-text', 'image-pick'])

export const CreateQuizSchema = z.object({
  partyId: z.string(),
  kind: QuizKindEnum,
  prompt: z.string().min(2).max(300),
  options: z.array(z.string()).max(6).default([]),
  correctOptionIndex: z.number().int().min(0).max(5).optional().nullable(),
  durationSec: z.number().int().min(5).max(120).default(20),
  imageUrl: z.string().url().optional().nullable(),
})
export type CreateQuizDto = z.infer<typeof CreateQuizSchema>

export const SubmitQuizAnswerSchema = z.object({
  questionId: z.string(),
  selectedOptionIndex: z.number().int().min(0).max(5).optional().nullable(),
  freeText: z.string().max(300).optional().nullable(),
})
export type SubmitQuizAnswerDto = z.infer<typeof SubmitQuizAnswerSchema>
