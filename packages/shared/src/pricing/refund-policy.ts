// 참가비 환불 정책 — 시작 시각 대비 취소 시점 + 사유로 환불율 산정.
// 파티별 전액환불 마감(refundDeadlineHours)을 기준으로 단계 적용.

const MS_PER_HOUR = 3_600_000

/** 환불 사유. */
export type RefundReason =
  | 'participant-cancel' // 참가자 본인 취소
  | 'host-cancelled' // 주최자 취소
  | 'auto-cancelled' // 성비/인원 미달 자동 취소
  | 'no-show' // 노쇼

export const REFUND_REASON_LABEL: Record<RefundReason, string> = {
  'participant-cancel': '본인 취소',
  'host-cancelled': '주최자 취소',
  'auto-cancelled': '자동 취소(성비·인원 미달)',
  'no-show': '노쇼',
}

export interface RefundPolicyInput {
  startAt: Date | string
  now?: Date | string
  /** 파티별 전액 환불 마감(시작 N시간 전). 기본 24. */
  refundDeadlineHours?: number
  reason?: RefundReason
}

/**
 * 참가비 환불율 (0~1).
 * - 주최자/자동 취소: 항상 100% (참가자 귀책 아님)
 * - 노쇼: 0%
 * - 본인 취소: 마감 전 100% · 마감~시작 50% · 시작 후 0%
 */
export function participantRefundRate(input: RefundPolicyInput): number {
  const reason = input.reason ?? 'participant-cancel'
  if (reason === 'host-cancelled' || reason === 'auto-cancelled') return 1
  if (reason === 'no-show') return 0

  const deadlineH = Math.max(0, input.refundDeadlineHours ?? 24)
  const now = input.now ?? new Date()
  const hoursUntil = (new Date(input.startAt).getTime() - new Date(now).getTime()) / MS_PER_HOUR
  if (hoursUntil >= deadlineH) return 1
  if (hoursUntil >= 0) return 0.5
  return 0
}

export interface RefundBreakdown {
  rate: number
  refundKRW: number
  /** 환불되지 않고 차감되는 금액. */
  retainedKRW: number
  reason: RefundReason
  label: string
}

function refundLabel(rate: number, reason: RefundReason): string {
  if (reason === 'host-cancelled') return '주최자 취소 — 전액 환불'
  if (reason === 'auto-cancelled') return '자동 취소 — 전액 환불'
  if (reason === 'no-show') return '노쇼 — 환불 불가'
  if (rate >= 1) return '전액 환불'
  if (rate <= 0) return '환불 불가'
  return `${Math.round(rate * 100)}% 환불`
}

/** 금액 + 정책으로 환불 내역 산출. */
export function quoteRefund(amountKRW: number, input: RefundPolicyInput): RefundBreakdown {
  const reason = input.reason ?? 'participant-cancel'
  const rate = participantRefundRate(input)
  const refundKRW = Math.round(amountKRW * rate)
  return {
    rate,
    refundKRW,
    retainedKRW: Math.max(0, amountKRW - refundKRW),
    reason,
    label: refundLabel(rate, reason),
  }
}

export interface RefundTier {
  /** 시작 몇 시간 전까지인지(상한). null이면 시작 이후. */
  beforeStartHours: number | null
  rate: number
  label: string
}

/** 표시용 환불 단계표 (마감 시간 기준). */
export function refundSchedule(refundDeadlineHours = 24): RefundTier[] {
  return [
    {
      beforeStartHours: refundDeadlineHours,
      rate: 1,
      label: `시작 ${refundDeadlineHours}시간 전까지`,
    },
    { beforeStartHours: 0, rate: 0.5, label: `시작 ${refundDeadlineHours}시간 전 ~ 시작 직전` },
    { beforeStartHours: null, rate: 0, label: '시작 이후 · 노쇼' },
  ]
}
