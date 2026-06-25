import type { PartyActorState } from '@/domains/party/flow'
import { canShareByStatus } from '@/domains/party/flow'
import type { PartyStatus } from '@rotifolk/shared'

export type ActionKey =
  | 'join'
  | 'cancel'
  | 'guest-join'
  | 'host-lock'
  | 'host-start'
  | 'host-end'
  | 'host-add'
  | 'refresh'

export type ActionBusyState = Record<ActionKey, boolean>

export interface ActionPayload {
  join: () => Promise<unknown>
  leave: () => Promise<unknown>
  openGuestJoin: () => void
  guestJoin: () => Promise<unknown>
  hostLock: () => Promise<unknown>
  hostStart: () => Promise<unknown>
  hostEnd: () => Promise<unknown>
  busy: ActionBusyState
}

export interface HeroAction {
  key: ActionKey
  label: string
  onClick?: () => Promise<unknown> | void
  busy: boolean
  disabled?: boolean
  warning?: boolean
}

export interface ActionContext {
  actor: PartyActorState
  status: PartyStatus
  isMember: boolean
  callbacks: ActionPayload
}

export function buildPartyHeroActions(context: ActionContext): HeroAction[] {
  const { actor, status, isMember, callbacks } = context

  const joinActionDisabled = !actor.canJoin

  if (actor.actor === 'host') {
    const hostLockAction: HeroAction = {
      key: 'host-lock',
      label: '모집 잠금',
      onClick: callbacks.hostLock,
      busy: callbacks.busy['host-lock'],
    }
    const hostStartAction: HeroAction = {
      key: 'host-start',
      label: '파티 시작',
      onClick: callbacks.hostStart,
      busy: callbacks.busy['host-start'],
    }
    const hostEndAction: HeroAction = {
      key: 'host-end',
      label: '파티 종료',
      onClick: callbacks.hostEnd,
      busy: callbacks.busy['host-end'],
      warning: true,
    }

    return [
      ...(actor.canLock ? [hostLockAction] : []),
      ...(actor.canStart ? [hostStartAction] : []),
      ...(actor.canEnd ? [hostEndAction] : []),
    ]
  }

  if (actor.actor === 'member') {
    const memberStatus = actor.participant?.status
    const isWaitlist = memberStatus === 'waitlist'
    const isConfirmed = memberStatus === 'confirmed' || memberStatus === 'checked-in'
    const actions: HeroAction[] = []
    if (actor.canCancel) {
      actions.push({
        key: 'cancel',
        label: '참여 취소',
        onClick: callbacks.leave,
        busy: callbacks.busy.cancel,
        warning: true,
      })
    }
    actions.push({
      key: 'join',
      label: isWaitlist
        ? '대기 중입니다'
        : status === 'live'
          ? '참가 중'
          : isConfirmed
            ? '참여 완료'
            : '모집 상태를 확인해 주세요',
      busy: false,
      disabled: true,
    })
    return actions
  }

  if (actor.actor === 'guest') {
    return [
      {
        key: 'guest-join',
        label: canShareByStatus(status) ? '비회원 참가 중' : '비회원 참여 종료',
        busy: false,
        disabled: true,
      },
    ]
  }

  if (isMember) {
    return [
      {
        key: 'join',
        label: actor.canJoin
          ? context.status === 'full'
            ? '대기 신청'
            : '참가 신청'
          : '모집이 마감되었어요',
        onClick: actor.canJoin ? callbacks.join : undefined,
        busy: callbacks.busy.join,
        disabled: joinActionDisabled,
      },
    ]
  }

  return [
    {
      key: 'guest-join',
      label: actor.canJoin ? '비회원으로 참가' : '마감됨',
      onClick: actor.canJoin ? callbacks.openGuestJoin : undefined,
      busy: callbacks.busy['guest-join'],
      disabled: !actor.canJoin,
    },
  ]
}
