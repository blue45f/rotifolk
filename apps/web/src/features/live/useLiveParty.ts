import { useEffect, useMemo, useState } from 'react'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Round,
  Order,
  QuestionCard,
} from '@rotifolk/shared'
import { getSocket } from './socket'

export interface LivePartyState {
  status: 'open' | 'live' | 'locked' | 'ended'
  participantCount: number
  currentRoundIndex: number | null
  currentRound: Round | null
  remainingSec: number
  myPair: { id: string; seatLabel: string; memberIds: string[] } | null
  lastEvent: { kind: string; payload?: Record<string, unknown> } | null
  lastCard: QuestionCard | null
  orders: Order[]
  leaderboard: { userId: string; nickname: string; score: number; correctCount: number }[]
  activeQuiz: {
    questionId: string
    prompt: string
    options: string[]
    kind: string
    endsAtIso: string
  } | null
  finalMatches: Array<{ userAId: string; userBId: string }>
}

const initial: LivePartyState = {
  status: 'open',
  participantCount: 0,
  currentRoundIndex: null,
  currentRound: null,
  remainingSec: 0,
  myPair: null,
  lastEvent: null,
  lastCard: null,
  orders: [],
  leaderboard: [],
  activeQuiz: null,
  finalMatches: [],
}

export function useLiveParty(partyId: string | undefined, currentUserId: string | undefined) {
  const [state, setState] = useState<LivePartyState>(initial)

  const socket = useMemo(() => (partyId ? getSocket() : null), [partyId])

  useEffect(() => {
    if (!socket || !partyId) return

    socket.emit('party:join', { partyId })

    const onState: ServerToClientEvents['party:state'] = (p) => {
      setState((s) => ({
        ...s,
        status: p.status,
        participantCount: p.participantCount,
        currentRoundIndex: p.currentRoundIndex,
      }))
    }
    const onRoundStarted: ServerToClientEvents['round:started'] = ({ round }) => {
      const myPair =
        currentUserId &&
        round.pairs.find((p) => p.memberIds.includes(currentUserId))
      setState((s) => ({
        ...s,
        currentRoundIndex: round.index,
        currentRound: round,
        remainingSec: round.durationSec,
        myPair: myPair
          ? { id: myPair.id, seatLabel: myPair.seatLabel, memberIds: myPair.memberIds }
          : null,
        status: 'live',
      }))
    }
    const onTick: ServerToClientEvents['round:tick'] = ({ remainingSec }) => {
      setState((s) => ({ ...s, remainingSec }))
    }
    const onRoundEnded: ServerToClientEvents['round:ended'] = () => {
      setState((s) => ({ ...s, remainingSec: 0 }))
    }
    const onEventFired: ServerToClientEvents['event:fired'] = ({ event }) => {
      setState((s) => ({ ...s, lastEvent: { kind: event.kind, payload: event.payload } }))
    }
    const onCardDrawn: ServerToClientEvents['card:drawn'] = ({ card }) => {
      setState((s) => ({ ...s, lastCard: card }))
    }
    const onOrderUpdated: ServerToClientEvents['order:updated'] = ({ order }) => {
      setState((s) => {
        const idx = s.orders.findIndex((o) => o.id === order.id)
        const next = idx >= 0 ? s.orders.map((o, i) => (i === idx ? order : o)) : [order, ...s.orders]
        return { ...s, orders: next }
      })
    }
    const onQuiz: ServerToClientEvents['quiz:question'] = ({ question, endsAtIso }) => {
      setState((s) => ({
        ...s,
        activeQuiz: {
          questionId: question.id,
          prompt: question.prompt,
          options: question.options,
          kind: question.kind,
          endsAtIso,
        },
      }))
    }
    const onLeaderboard: ServerToClientEvents['quiz:leaderboard'] = ({ entries }) => {
      setState((s) => ({
        ...s,
        activeQuiz: null,
        leaderboard: entries.map((e) => ({
          userId: e.userId,
          nickname: e.nickname,
          score: e.score,
          correctCount: e.correctCount,
        })),
      }))
    }
    const onFinal: ServerToClientEvents['final-match:revealed'] = ({ matches }) => {
      setState((s) => ({
        ...s,
        finalMatches: matches.map((m) => ({ userAId: m.userAId, userBId: m.userBId })),
        status: 'ended',
      }))
    }

    socket.on('party:state', onState)
    socket.on('round:started', onRoundStarted)
    socket.on('round:tick', onTick)
    socket.on('round:ended', onRoundEnded)
    socket.on('event:fired', onEventFired)
    socket.on('card:drawn', onCardDrawn)
    socket.on('order:updated', onOrderUpdated)
    socket.on('quiz:question', onQuiz)
    socket.on('quiz:leaderboard', onLeaderboard)
    socket.on('final-match:revealed', onFinal)

    return () => {
      socket.emit('party:leave', { partyId })
      socket.off('party:state', onState)
      socket.off('round:started', onRoundStarted)
      socket.off('round:tick', onTick)
      socket.off('round:ended', onRoundEnded)
      socket.off('event:fired', onEventFired)
      socket.off('card:drawn', onCardDrawn)
      socket.off('order:updated', onOrderUpdated)
      socket.off('quiz:question', onQuiz)
      socket.off('quiz:leaderboard', onLeaderboard)
      socket.off('final-match:revealed', onFinal)
    }
  }, [socket, partyId, currentUserId])

  const send = <K extends keyof ClientToServerEvents>(
    type: K,
    payload: Parameters<ClientToServerEvents[K]>[0],
  ) => {
    if (!socket) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(socket as any).emit(type, payload)
  }

  return { state, send }
}
