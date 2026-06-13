import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UsersService } from './users.service'

function makePrismaMock() {
  const tx = {
    user: {
      update: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
    },
    avatar: { deleteMany: vi.fn(async () => ({ count: 1 })) },
    follow: { deleteMany: vi.fn(async () => ({ count: 2 })) },
    userBlock: { deleteMany: vi.fn(async () => ({ count: 1 })) },
    savedParty: { deleteMany: vi.fn(async () => ({ count: 3 })) },
    notification: { deleteMany: vi.fn(async () => ({ count: 4 })) },
    avoidContact: { deleteMany: vi.fn(async () => ({ count: 1 })) },
    photoLike: { deleteMany: vi.fn(async () => ({ count: 2 })) },
    partyPhoto: { deleteMany: vi.fn(async () => ({ count: 1 })) },
    partyNote: { updateMany: vi.fn(async () => ({ count: 1 })) },
    contactExchangeRequest: { updateMany: vi.fn(async () => ({ count: 1 })) },
  }
  return {
    user: { delete: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    __tx: tx,
  }
}

describe('UsersService account withdrawal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-13T09:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('soft-withdraws and anonymizes the account instead of hard deleting it', async () => {
    const prisma = makePrismaMock()
    const service = new UsersService(prisma as never)

    await expect(service.deleteAccount('u_1')).resolves.toEqual({ ok: true })

    expect(prisma.user.delete).not.toHaveBeenCalled()
    expect(prisma.__tx.user.delete).not.toHaveBeenCalled()
    expect(prisma.__tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u_1' },
      data: expect.objectContaining({
        accountStatus: 'withdrawn',
        withdrawnAt: new Date('2026-06-13T09:00:00.000Z'),
        suspendedAt: null,
        email: 'withdrawn-u_1@withdrawn.rotifolk.invalid',
        passwordHash: null,
        provider: 'withdrawn',
        googleSub: null,
        nickname: '탈퇴한 사용자',
        role: 'participant',
        phone: null,
        phoneHash: null,
        shareContact: false,
        kakaoId: null,
        shareKakao: false,
        instagram: null,
        shareInstagram: false,
        profileJson: '{}',
        verifiedFieldsJson: '[]',
        visibilityJson: '{}',
        referralCode: 'withdrawn-u_1',
        pointsKRW: 0,
        avatarId: null,
      }),
    })
    expect(prisma.__tx.avatar.deleteMany).toHaveBeenCalledWith({ where: { ownerId: 'u_1' } })
    expect(prisma.__tx.follow.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ followerId: 'u_1' }, { followingId: 'u_1' }] },
    })
    expect(prisma.__tx.userBlock.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ blockerId: 'u_1' }, { blockedId: 'u_1' }] },
    })
    expect(prisma.__tx.avoidContact.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u_1' } })
    expect(prisma.__tx.partyNote.updateMany).toHaveBeenCalledWith({
      where: { fromUserId: 'u_1' },
      data: { shareContact: false },
    })
    expect(prisma.__tx.contactExchangeRequest.updateMany).toHaveBeenCalledWith({
      where: { OR: [{ requesterId: 'u_1' }, { receiverId: 'u_1' }], status: 'pending' },
      data: {
        status: 'rejected',
        decidedAt: new Date('2026-06-13T09:00:00.000Z'),
        decidedById: null,
      },
    })
  })
})
