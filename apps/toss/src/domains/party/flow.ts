import type { Participation, PartyStatus, User } from '@rotifolk/shared'

import type { PartyDetail } from '@/lib/api'

export type PartyActor = 'host' | 'member' | 'guest' | 'anonymous'

export interface PartyActorState {
  actor: PartyActor
  isLive: boolean
  isClosedForJoin: boolean
  canJoin: boolean
  canCancel: boolean
  canStart: boolean
  canEnd: boolean
  canLock: boolean
  canAddGuest: boolean
  participant: Participation | null
}

const MEMBER_JOINABLE_STATUSES: PartyStatus[] = ['open', 'full']
const GUEST_JOINABLE_STATUSES: PartyStatus[] = ['open']
const LIVE_STOP_STATUSES: PartyStatus[] = ['live']
const ACTIVE_PARTICIPATION_STATUSES: Participation['status'][] = ['confirmed', 'checked-in']
const RESTRICTED_PARTICIPANT_STATUSES: PartyStatus[] = ['ended', 'cancelled']

export function resolvePartyActorState(
  party: PartyDetail,
  members: Participation[],
  user: User | null,
  guestParticipation: Participation | null
): PartyActorState {
  const status = party.status
  const isLive = status === 'live'
  const isClosed = status === 'ended' || status === 'cancelled'
  const activeCount = members.filter((p) => ACTIVE_PARTICIPATION_STATUSES.includes(p.status)).length
  const isHost = Boolean(user && user.id === party.hostId)
  const userParticipation = user ? getMyParticipation(members, user.id) : null
  const hasRoom = activeCount < party.maxParticipants
  // 회원 참가는 모집 가능한 상태(open/full)에서만 — locked/live/ended/cancelled는 서버가 거부하므로 CTA도 막아요.
  const canJoinMember =
    MEMBER_JOINABLE_STATUSES.includes(status) && (status === 'full' ? true : hasRoom)

  if (isHost) {
    return {
      actor: 'host',
      isLive,
      isClosedForJoin: !MEMBER_JOINABLE_STATUSES.includes(status),
      canJoin: false,
      canCancel: false,
      canStart: ['open', 'full', 'locked'].includes(status),
      canEnd: status === 'live',
      canLock: ['open', 'full'].includes(status),
      canAddGuest: ['open', 'full'].includes(status) && hasRoom,
      participant: userParticipation,
    }
  }

  if (userParticipation) {
    return {
      actor: 'member',
      isLive,
      isClosedForJoin: !MEMBER_JOINABLE_STATUSES.includes(status) || !canJoinMember,
      canJoin: false,
      canCancel: !isClosed && !isLive,
      canStart: false,
      canEnd: false,
      canLock: false,
      canAddGuest: false,
      participant: userParticipation,
    }
  }

  if (guestParticipation) {
    return {
      actor: 'guest',
      isLive,
      isClosedForJoin: !GUEST_JOINABLE_STATUSES.includes(status),
      canJoin: false,
      canCancel: false,
      canStart: false,
      canEnd: false,
      canLock: false,
      canAddGuest: false,
      participant: guestParticipation,
    }
  }

  return {
    actor: 'anonymous',
    isLive,
    isClosedForJoin: user ? !canJoinMember : !GUEST_JOINABLE_STATUSES.includes(status),
    canJoin: user ? canJoinMember : GUEST_JOINABLE_STATUSES.includes(status) && hasRoom,
    canCancel: false,
    canStart: false,
    canEnd: false,
    canLock: false,
    canAddGuest: false,
    participant: null,
  }
}

export function statusBadge(status: PartyStatus): string {
  switch (status) {
    case 'draft':
      return '준비중'
    case 'open':
      return '모집중'
    case 'full':
      return '마감'
    case 'locked':
      return '잠금'
    case 'live':
      return '진행중'
    case 'ended':
      return '종료'
    case 'cancelled':
      return '취소'
    default:
      return status
  }
}

export function canShareByStatus(status: PartyStatus): boolean {
  return !RESTRICTED_PARTICIPANT_STATUSES.includes(status)
}

export function statusHint(status: PartyStatus): string {
  if (status === 'locked') return '개설자 잠금 상태: 운영자에서 해제할 수 없습니다.'
  if (LIVE_STOP_STATUSES.includes(status)) return '라이브 진행중에는 참여/취소가 불가능해요.'
  if (status === 'ended') return '종료된 모임입니다.'
  if (status === 'cancelled') return '취소된 모임입니다.'
  return ''
}

function getMyParticipation(parts: Participation[], userId: string) {
  return parts.find((p) => p.userId === userId || p.user?.id === userId) ?? null
}
