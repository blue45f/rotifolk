import { z } from 'zod'

export const CreateNoteSchema = z.object({
  partyId: z.string().min(1),
  toUserId: z.string().min(1),
  roundIndex: z.number().int().min(0).max(50).optional().nullable(),
  body: z.string().min(1).max(300),
  emoji: z.string().max(8).optional().nullable(),
  shareContact: z.boolean().default(false),
})
export type CreateNoteDto = z.infer<typeof CreateNoteSchema>
