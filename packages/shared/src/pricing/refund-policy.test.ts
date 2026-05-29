import { describe, expect, it } from 'vitest'
import { participantRefundRate, quoteRefund } from './refund-policy'

const start = '2026-06-01T19:00:00.000Z'

describe('participantRefundRate', () => {
  it('마감(24h) 전 본인 취소는 전액', () => {
    expect(participantRefundRate({ startAt: start, now: '2026-05-30T19:00:00.000Z' })).toBe(1)
  })

  it('마감~시작 사이 본인 취소는 50%', () => {
    expect(participantRefundRate({ startAt: start, now: '2026-06-01T10:00:00.000Z' })).toBe(0.5)
  })

  it('시작 이후 본인 취소는 0%', () => {
    expect(participantRefundRate({ startAt: start, now: '2026-06-01T20:00:00.000Z' })).toBe(0)
  })

  it('주최자/자동 취소는 시점 무관 전액', () => {
    expect(
      participantRefundRate({
        startAt: start,
        now: '2026-06-01T20:00:00.000Z',
        reason: 'host-cancelled',
      }),
    ).toBe(1)
    expect(
      participantRefundRate({
        startAt: start,
        now: '2026-06-01T20:00:00.000Z',
        reason: 'auto-cancelled',
      }),
    ).toBe(1)
  })

  it('노쇼는 환불 불가', () => {
    expect(
      participantRefundRate({ startAt: start, now: '2026-05-01T00:00:00.000Z', reason: 'no-show' }),
    ).toBe(0)
  })

  it('refundDeadlineHours를 존중', () => {
    // 마감 72h: 시작 48h 전이면 이미 마감 지나 50%
    expect(
      participantRefundRate({
        startAt: start,
        now: '2026-05-30T19:00:00.000Z',
        refundDeadlineHours: 72,
      }),
    ).toBe(0.5)
  })
})

describe('quoteRefund', () => {
  it('금액에 환불율을 적용해 내역 산출', () => {
    const out = quoteRefund(30000, { startAt: start, now: '2026-06-01T10:00:00.000Z' })
    expect(out.refundKRW).toBe(15000)
    expect(out.retainedKRW).toBe(15000)
    expect(out.rate).toBe(0.5)
  })
})
