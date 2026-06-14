import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import { AuthService } from '../auth/auth.service'

import { PartiesService } from './parties.service'

/**
 * 게스트(비로그인) 합류 핵심 흐름 테스트 — Prisma는 모킹(무DB).
 *  - 링크 합류: 참가 행 생성 + 합성 키 노출 + 토큰 멱등
 *  - 정원 검사: full이면 거절(게스트는 대기열 없음)
 *  - 현장 합류: 호스트만, 즉시 체크인
 *  - 클레임: 가입 시 guestToken으로 이력 연결·토큰 소진·중복 파티는 취소 처리
 */

type GuestRow = {
  id: string
  partyId: string
  userId: string | null
  status: string
  seatNumber: number | null
  checkedInAt: Date | null
  note: string | null
  guestName: string | null
  guestAvatarJson: string | null
  guestToken: string | null
  createdAt: Date
  updatedAt: Date
}

const NOW = new Date('2026-06-11T10:00:00.000Z')

function makeGuestRow(overrides: Partial<GuestRow> = {}): GuestRow {
  return {
    id: 'pt_g1',
    partyId: 'p_1',
    userId: null,
    status: 'confirmed',
    seatNumber: null,
    checkedInAt: null,
    note: null,
    guestName: '하늘',
    guestAvatarJson: '{"emoji":"🌙","hue":"#7A1F3D"}',
    guestToken: 'tok_abcdefgh',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

const party = {
  id: 'p_1',
  hostId: 'u_host',
  title: '한남 와인 로테이션',
  status: 'open',
  maxParticipants: 8,
}

function makePrismaMock(opts: {
  party?: Partial<typeof party> | null
  existingGuest?: GuestRow | null
  confirmedCount?: number
}) {
  const tx = {
    participation: {
      count: vi.fn(async () => opts.confirmedCount ?? 2),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) =>
        makeGuestRow({
          id: 'pt_new',
          partyId: data.partyId as string,
          status: data.status as string,
          checkedInAt: (data.checkedInAt as Date | undefined) ?? null,
          guestName: data.guestName as string,
          guestAvatarJson: data.guestAvatarJson as string,
          guestToken: (data.guestToken as string | null) ?? null,
        })
      ),
      findUnique: vi.fn(async () => null),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) =>
        makeGuestRow({ ...(data as Partial<GuestRow>) })
      ),
    },
    party: { updateMany: vi.fn(async () => ({ count: 1 })) },
    user: { update: vi.fn(async () => ({})) },
  }
  return {
    party: {
      findUnique: vi.fn(async () => (opts.party === null ? null : { ...party, ...opts.party })),
    },
    participation: {
      findFirst: vi.fn(async () => opts.existingGuest ?? null),
      findMany: vi.fn(async () => []),
      update: vi.fn(async ({ data }: { where: { id: string }; data: Record<string, unknown> }) =>
        makeGuestRow({ ...(opts.existingGuest ?? {}), ...(data as Partial<GuestRow>) })
      ),
    },
    notification: { create: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    __tx: tx,
  }
}

const notifMock = { toUser: vi.fn() }

describe('PartiesService.guestJoin (시나리오 A — 링크 합류)', () => {
  it('닉네임+아바타만으로 confirmed 참가를 만들고 합성 키와 토큰을 돌려준다', async () => {
    const prisma = makePrismaMock({})
    const service = new PartiesService(prisma as never, notifMock as never)

    const result = await service.guestJoin('p_1', {
      nickname: '하늘',
      avatar: { emoji: '🌙', hue: '#7A1F3D' },
    })

    const createArgs = prisma.__tx.participation.create.mock.calls[0][0]
    expect(createArgs.data.userId).toBeNull()
    expect(createArgs.data.guestName).toBe('하늘')
    expect(typeof createArgs.data.guestToken).toBe('string')

    expect(result.guestToken).toBeTruthy()
    expect(result.participation.isGuest).toBe(true)
    expect(result.participation.userId).toBe('guest:pt_new')
    expect(result.participation.guestName).toBe('하늘')
    expect(result.participation.guestAvatar).toEqual({
      emoji: '🌙',
      hue: '#7A1F3D',
      imageData: null,
    })
    // 호스트에게 실시간 알림
    expect(notifMock.toUser).toHaveBeenCalledWith(
      'u_host',
      expect.objectContaining({ kind: 'party_join' })
    )
  })

  it('같은 토큰 재방문이면 새 행을 만들지 않고 기존 참가를 돌려준다(멱등)', async () => {
    const existing = makeGuestRow()
    const prisma = makePrismaMock({ existingGuest: existing })
    const service = new PartiesService(prisma as never, notifMock as never)

    const result = await service.guestJoin('p_1', { nickname: '하늘', token: 'tok_abcdefgh' })

    expect(result.participation.id).toBe('pt_g1')
    expect(result.guestToken).toBe('tok_abcdefgh')
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.participation.update).not.toHaveBeenCalled()
  })

  it('업로드 사진(imageData)을 게스트 아바타로 저장하고 응답에 그대로 돌려준다', async () => {
    const prisma = makePrismaMock({})
    const service = new PartiesService(prisma as never, notifMock as never)

    const result = await service.guestJoin('p_1', {
      nickname: '하늘',
      avatar: { emoji: '🌙', hue: '#7A1F3D', imageData: 'data:image/webp;base64,QUJD' },
    })

    const createArgs = prisma.__tx.participation.create.mock.calls[0][0]
    expect(createArgs.data.guestAvatarJson).toContain('data:image/webp;base64,QUJD')
    expect(result.participation.guestAvatar).toEqual({
      emoji: '🌙',
      hue: '#7A1F3D',
      imageData: 'data:image/webp;base64,QUJD',
    })
  })

  it('재방문에서 아바타를 명시하면 새 행 없이 그 자리에서 갱신한다(사진 수정/삭제 경로)', async () => {
    const existing = makeGuestRow()
    const prisma = makePrismaMock({ existingGuest: existing })
    const service = new PartiesService(prisma as never, notifMock as never)
    const notifCallsBefore = notifMock.toUser.mock.calls.length

    const result = await service.guestJoin('p_1', {
      nickname: '하늘',
      token: 'tok_abcdefgh',
      avatar: { emoji: '✨', hue: '#D4A24C', imageData: 'data:image/jpeg;base64,Tk9X' },
    })

    // 새 행 생성·정원 검사·호스트 알림 없이 기존 행만 갱신된다.
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(notifMock.toUser.mock.calls.length).toBe(notifCallsBefore)
    const updateArgs = prisma.participation.update.mock.calls[0][0]
    expect(updateArgs.where).toEqual({ id: 'pt_g1' })
    expect(updateArgs.data.guestAvatarJson).toContain('data:image/jpeg;base64,Tk9X')
    expect(result.participation.guestAvatar?.imageData).toBe('data:image/jpeg;base64,Tk9X')
  })

  it('재방문에서 사진 없는 프리셋을 보내면 사진이 제거된다(삭제 폴백)', async () => {
    const existing = makeGuestRow({
      guestAvatarJson: '{"emoji":"🌙","hue":"#7A1F3D","imageData":"data:image/webp;base64,QUJD"}',
    })
    const prisma = makePrismaMock({ existingGuest: existing })
    const service = new PartiesService(prisma as never, notifMock as never)

    const result = await service.guestJoin('p_1', {
      nickname: '하늘',
      token: 'tok_abcdefgh',
      avatar: { emoji: '🌙', hue: '#7A1F3D' },
    })

    const updateArgs = prisma.participation.update.mock.calls[0][0]
    expect(updateArgs.data.guestAvatarJson).not.toContain('imageData')
    expect(result.participation.guestAvatar?.imageData).toBeNull()
  })

  it('정원이 가득 차면 party_full로 거절한다(게스트는 대기열 없음)', async () => {
    const prisma = makePrismaMock({ confirmedCount: 8 })
    const service = new PartiesService(prisma as never, notifMock as never)

    const err = await service.guestJoin('p_1', { nickname: '늦은게스트' }).catch((e) => e)
    expect(err).toBeInstanceOf(BadRequestException)
    expect((err.getResponse() as { code: string }).code).toBe('party_full')
  })

  it('마감(locked/ended) 파티는 party_closed로 거절한다', async () => {
    const prisma = makePrismaMock({ party: { status: 'ended' } })
    const service = new PartiesService(prisma as never, notifMock as never)
    const err = await service.guestJoin('p_1', { nickname: '게스트' }).catch((e) => e)
    expect(err).toBeInstanceOf(BadRequestException)
    expect((err.getResponse() as { code: string }).code).toBe('party_closed')
  })
})

describe('PartiesService.hostAddGuest (시나리오 B — 현장 합류)', () => {
  it('호스트가 이름만 입력하면 즉시 체크인 게스트가 등록된다(아바타 자동 배정)', async () => {
    const prisma = makePrismaMock({})
    const service = new PartiesService(prisma as never, notifMock as never)

    const result = await service.hostAddGuest('u_host', 'p_1', { name: '현장님' })

    const createArgs = prisma.__tx.participation.create.mock.calls[0][0]
    expect(createArgs.data.status).toBe('checked-in')
    expect(createArgs.data.guestToken).toBeNull()
    expect(createArgs.data.guestAvatarJson).toContain('emoji')
    expect(result.status).toBe('checked-in')
    expect(result.isGuest).toBe(true)
  })

  it('호스트가 아니면 거절한다', async () => {
    const prisma = makePrismaMock({})
    const service = new PartiesService(prisma as never, notifMock as never)
    await expect(service.hostAddGuest('u_other', 'p_1', { name: '현장님' })).rejects.toBeInstanceOf(
      ForbiddenException
    )
  })
})

describe('AuthService.claimGuestParticipations (시나리오 C — 가입 전환)', () => {
  const jwtMock = { sign: vi.fn(() => 'jwt') }
  const configMock = { get: vi.fn(() => undefined) }

  function makeClaimPrisma(rows: GuestRow[], alreadyJoinedPartyIds: string[] = []) {
    const tx = {
      participation: {
        findUnique: vi.fn(
          async ({ where }: { where: { partyId_userId: { partyId: string; userId: string } } }) =>
            alreadyJoinedPartyIds.includes(where.partyId_userId.partyId) ? { id: 'pt_mine' } : null
        ),
        update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...data })),
      },
      user: { update: vi.fn(async () => ({})) },
    }
    return {
      participation: { findMany: vi.fn(async () => rows) },
      $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
      __tx: tx,
    }
  }

  it('토큰의 게스트 행을 내 계정에 연결하고 토큰을 소진한다', async () => {
    const rows = [makeGuestRow({ id: 'pt_a', partyId: 'p_1' })]
    const prisma = makeClaimPrisma(rows)
    const service = new AuthService(
      prisma as never,
      jwtMock as never,
      {} as never,
      configMock as never,
      null
    )

    const result = await service.claimGuestParticipations('u_me', 'tok_abcdefgh')

    expect(result.claimed).toBe(1)
    const updateArgs = prisma.__tx.participation.update.mock.calls[0][0]
    expect(updateArgs.data.userId).toBe('u_me')
    expect(updateArgs.data.guestToken).toBeNull()
    expect(prisma.__tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { joinedCount: { increment: 1 } } })
    )
  })

  it('이미 회원으로 참여한 파티의 게스트 행은 취소 처리해 로스터 중복을 막는다', async () => {
    const rows = [makeGuestRow({ id: 'pt_dup', partyId: 'p_joined' })]
    const prisma = makeClaimPrisma(rows, ['p_joined'])
    const service = new AuthService(
      prisma as never,
      jwtMock as never,
      {} as never,
      configMock as never,
      null
    )

    const result = await service.claimGuestParticipations('u_me', 'tok_abcdefgh')

    expect(result.claimed).toBe(0)
    const updateArgs = prisma.__tx.participation.update.mock.calls[0][0]
    expect(updateArgs.data.status).toBe('cancelled')
    expect(prisma.__tx.user.update).not.toHaveBeenCalled()
  })

  it('해당 토큰의 게스트 행이 없으면 0건으로 끝난다', async () => {
    const prisma = makeClaimPrisma([])
    const service = new AuthService(
      prisma as never,
      jwtMock as never,
      {} as never,
      configMock as never,
      null
    )
    await expect(service.claimGuestParticipations('u_me', 'tok_none')).resolves.toEqual({
      claimed: 0,
    })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
