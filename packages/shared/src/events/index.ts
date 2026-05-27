/**
 * Socket.IO event 명세 — client ↔ server 공유.
 * room: `party:{partyId}` 에 join.
 */
import type { Order } from '../domain/order'
import type { LiveEvent } from '../domain/event'
import type { Round, FinalMatch } from '../domain/round'
import type { QuizQuestion, QuizLeaderboardEntry } from '../domain/quiz'
import type { QuestionCard } from '../domain/question-card'

export const PARTY_ROOM = (partyId: string) => `party:${partyId}`
export const USER_ROOM = (userId: string) => `user:${userId}`

/* ---------- Client → Server ---------- */
export interface ClientToServerEvents {
  'party:join': (payload: { partyId: string }) => void
  'party:leave': (payload: { partyId: string }) => void
  'host:round:start': (payload: { partyId: string }) => void
  'host:round:end': (payload: { partyId: string }) => void
  'host:event:fire': (payload: { partyId: string; kind: string; payload?: Record<string, unknown> }) => void
  'host:quiz:launch': (payload: { partyId: string; questionId: string }) => void
  'host:party:lock': (payload: { partyId: string }) => void
  'host:party:end': (payload: { partyId: string }) => void
  'participant:mid-match:like': (payload: { partyId: string; targetUserId: string }) => void
  'participant:final-match:vote': (payload: { partyId: string; targetUserId: string }) => void
  'participant:quiz:answer': (payload: {
    partyId: string
    questionId: string
    selectedOptionIndex?: number | null
    freeText?: string | null
  }) => void
  'participant:order:create': (payload: {
    partyId: string
    items: Array<{ menuItemId: string; quantity: number; note?: string | null }>
    note?: string | null
  }) => void
  'card:draw': (payload: { partyId: string; pairId?: string | null }) => void
}

/* ---------- Server → Client ---------- */
export interface ServerToClientEvents {
  'party:state': (payload: {
    partyId: string
    status: 'open' | 'live' | 'locked' | 'ended'
    currentRoundIndex: number | null
    participantCount: number
  }) => void
  'round:started': (payload: { round: Round; endsAtIso: string }) => void
  'round:ended': (payload: { roundIndex: number }) => void
  'round:tick': (payload: { roundIndex: number; remainingSec: number }) => void
  'pair:assigned': (payload: { roundIndex: number; partnerIds: string[]; seatLabel: string }) => void
  'event:fired': (payload: { event: LiveEvent }) => void
  'quiz:question': (payload: { question: QuizQuestion; endsAtIso: string }) => void
  'quiz:leaderboard': (payload: { entries: QuizLeaderboardEntry[] }) => void
  'card:drawn': (payload: { card: QuestionCard; pairId?: string | null }) => void
  'order:updated': (payload: { order: Order }) => void
  'final-match:revealed': (payload: { matches: FinalMatch[] }) => void
  'toast': (payload: { kind: 'info' | 'success' | 'warning' | 'error'; message: string }) => void
  'error': (payload: { code: string; message: string }) => void
}
