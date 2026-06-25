import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import { PartiesService } from './parties.service'

/**
 * 파티 상태 전이 가드 테스트 — Prisma는 모킹(무DB).
 *  - lock/start/end: 호스트 권한 + 허용 상태 화이트리스트 + 멱등 조기 반환
 *  - cancel: live/ended/cancelled 파티는 취소 거절(상태별 메시지)
 * 새로 추가된 가드를 잠가, includes(...) 상태 집합이 바뀌면 회귀로 잡히게 한다.
 */

const NOW = new Date('2026-06-11T10:00:00.000Z')
const notifMock = { toUser: vi.fn() }

function makeLifecyclePrisma(partyStatus: string, hostId = 'u_host') {
  const party = {
    id: 'p_1',
    hostId,
    title: '한남 와인 로테이션',
    status: partyStatus,
    maxParticipants: 8,
    startAt: NOW,
    refundDeadlineHours: 24,
  }
  return {
    party: {
      findUnique: vi.fn(async () => party),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...party, ...data })),
    },
    participation: { findMany: vi.fn(async () => []) },
    notification: { createMany: vi.fn(async () => ({ count: 0 })) },
  }
}

describe('PartiesService.lock (상태 전이 가드)', () => {
  it('호스트가 아니면 ForbiddenException', async () => {
    const prisma = makeLifecyclePrisma('open')
    const service = new PartiesService(prisma as never, notifMock as never)
    await expect(service.lock('u_other', 'p_1')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('종료/취소/진행중 파티는 party_closed', async () => {
    for (const status of ['ended', 'cancelled', 'live']) {
      const prisma = makeLifecyclePrisma(status)
      const service = new PartiesService(prisma as never, notifMock as never)
      const err = await service.lock('u_host', 'p_1').catch((e) => e)
      expect(err).toBeInstanceOf(BadRequestException)
      expect((err.getResponse() as { code: string }).code).toBe('party_closed')
    }
  })

  it('open/full 외 상태(draft)는 invalid_party_status', async () => {
    const prisma = makeLifecyclePrisma('draft')
    const service = new PartiesService(prisma as never, notifMock as never)
    const err = await service.lock('u_host', 'p_1').catch((e) => e)
    expect(err).toBeInstanceOf(BadRequestException)
    expect((err.getResponse() as { code: string }).code).toBe('invalid_party_status')
  })

  it('이미 locked면 update 없이 멱등 반환', async () => {
    const prisma = makeLifecyclePrisma('locked')
    const service = new PartiesService(prisma as never, notifMock as never)
    const result = await service.lock('u_host', 'p_1')
    expect((result as { status: string }).status).toBe('locked')
    expect(prisma.party.update).not.toHaveBeenCalled()
  })

  it('open이면 locked로 전이', async () => {
    const prisma = makeLifecyclePrisma('open')
    const service = new PartiesService(prisma as never, notifMock as never)
    const result = await service.lock('u_host', 'p_1')
    expect((result as { status: string }).status).toBe('locked')
    expect(prisma.party.update).toHaveBeenCalledTimes(1)
  })
})

describe('PartiesService.start (상태 전이 가드)', () => {
  it('종료/취소 파티는 party_closed', async () => {
    for (const status of ['ended', 'cancelled']) {
      const prisma = makeLifecyclePrisma(status)
      const service = new PartiesService(prisma as never, notifMock as never)
      const err = await service.start('u_host', 'p_1').catch((e) => e)
      expect(err).toBeInstanceOf(BadRequestException)
      expect((err.getResponse() as { code: string }).code).toBe('party_closed')
    }
  })

  it('open/full/locked 외 상태(draft)는 invalid_party_status', async () => {
    const prisma = makeLifecyclePrisma('draft')
    const service = new PartiesService(prisma as never, notifMock as never)
    const err = await service.start('u_host', 'p_1').catch((e) => e)
    expect(err).toBeInstanceOf(BadRequestException)
    expect((err.getResponse() as { code: string }).code).toBe('invalid_party_status')
  })

  it('이미 live면 update 없이 멱등 반환', async () => {
    const prisma = makeLifecyclePrisma('live')
    const service = new PartiesService(prisma as never, notifMock as never)
    const result = await service.start('u_host', 'p_1')
    expect((result as { status: string }).status).toBe('live')
    expect(prisma.party.update).not.toHaveBeenCalled()
  })

  it('locked면 live로 전이', async () => {
    const prisma = makeLifecyclePrisma('locked')
    const service = new PartiesService(prisma as never, notifMock as never)
    const result = await service.start('u_host', 'p_1')
    expect((result as { status: string }).status).toBe('live')
    expect(prisma.party.update).toHaveBeenCalledTimes(1)
  })
})

describe('PartiesService.end (상태 전이 가드)', () => {
  it('진행중이 아니면 invalid_party_status', async () => {
    const prisma = makeLifecyclePrisma('open')
    const service = new PartiesService(prisma as never, notifMock as never)
    const err = await service.end('u_host', 'p_1').catch((e) => e)
    expect(err).toBeInstanceOf(BadRequestException)
    expect((err.getResponse() as { code: string }).code).toBe('invalid_party_status')
  })

  it('이미 ended면 update 없이 멱등 반환', async () => {
    const prisma = makeLifecyclePrisma('ended')
    const service = new PartiesService(prisma as never, notifMock as never)
    const result = await service.end('u_host', 'p_1')
    expect((result as { status: string }).status).toBe('ended')
    expect(prisma.party.update).not.toHaveBeenCalled()
  })

  it('live면 ended로 전이', async () => {
    const prisma = makeLifecyclePrisma('live')
    const service = new PartiesService(prisma as never, notifMock as never)
    const result = await service.end('u_host', 'p_1')
    expect((result as { status: string }).status).toBe('ended')
    expect(prisma.party.update).toHaveBeenCalledTimes(1)
  })
})

describe('PartiesService.cancel (파티 상태 가드)', () => {
  function makeCancelPrisma(participationStatus: string, partyStatus: string) {
    return {
      participation: {
        findUnique: vi.fn(async () => ({
          id: 'pt_1',
          partyId: 'p_1',
          userId: 'u_1',
          status: participationStatus,
        })),
        update: vi.fn(async () => ({})),
        findMany: vi.fn(async () => []),
      },
      party: {
        findUnique: vi.fn(async () => ({
          id: 'p_1',
          hostId: 'u_host',
          status: partyStatus,
          startAt: NOW,
          refundDeadlineHours: 24,
          maxParticipants: 8,
          title: '한남 와인 로테이션',
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      payment: { findFirst: vi.fn(async () => null) },
      $transaction: vi.fn(async (cb: (t: unknown) => unknown) =>
        cb({
          payment: { update: vi.fn(async () => ({})) },
          participation: { update: vi.fn(async () => ({})) },
          party: { updateMany: vi.fn(async () => ({ count: 1 })) },
        })
      ),
    }
  }

  it('진행중(live) 파티는 party_closed + 진행중 메시지', async () => {
    const prisma = makeCancelPrisma('confirmed', 'live')
    const service = new PartiesService(prisma as never, notifMock as never)
    const err = await service.cancel('u_1', 'p_1').catch((e) => e)
    expect(err).toBeInstanceOf(BadRequestException)
    const body = err.getResponse() as { code: string; message: string }
    expect(body.code).toBe('party_closed')
    expect(body.message).toBe('진행중인 모임은 취소할 수 없어요.')
  })

  it('종료/취소된 파티는 party_closed + 종료 메시지', async () => {
    for (const status of ['ended', 'cancelled']) {
      const prisma = makeCancelPrisma('confirmed', status)
      const service = new PartiesService(prisma as never, notifMock as never)
      const err = await service.cancel('u_1', 'p_1').catch((e) => e)
      expect(err).toBeInstanceOf(BadRequestException)
      const body = err.getResponse() as { code: string; message: string }
      expect(body.code).toBe('party_closed')
      expect(body.message).toBe('종료된 모임은 취소할 수 없어요.')
    }
  })

  it('모집중(open) 파티는 취소가 진행된다', async () => {
    const prisma = makeCancelPrisma('waitlist', 'open')
    const service = new PartiesService(prisma as never, notifMock as never)
    const result = await service.cancel('u_1', 'p_1')
    expect(result).toEqual({ ok: true, refund: null })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})
