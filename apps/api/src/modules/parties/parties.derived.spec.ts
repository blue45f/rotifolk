import { describe, expect, it, vi } from 'vitest'
import { ForbiddenException } from '@nestjs/common'
import { PartiesService } from './parties.service'

const notifMock = { toUser: vi.fn() }

function makeService(prisma: Record<string, unknown>) {
  return new PartiesService(prisma as never, notifMock as never)
}

describe('PartiesService derived party campaigns', () => {
  it('ranks checked-in participants by distinct likes and hides private like counts', async () => {
    const prisma = {
      party: {
        findUnique: vi.fn(async () => ({ id: 'p_1', hostId: 'u_host' })),
      },
      midMatchVote: {
        findMany: vi.fn(async () => [
          { fromUserId: 'u_a', toUserId: 'u_m' },
          { fromUserId: 'u_b', toUserId: 'u_f' },
        ]),
      },
      finalMatchVote: {
        findMany: vi.fn(async () => [
          { fromUserId: 'u_a', toUserId: 'u_m' },
          { fromUserId: 'u_c', toUserId: 'u_m' },
        ]),
      },
      participation: {
        findMany: vi.fn(async () => [
          {
            user: {
              id: 'u_f',
              nickname: '윤슬',
              avatarId: null,
              avatar: null,
              gender: 'female',
              phone: null,
              showLikesReceived: false,
              joinPopularityRanking: true,
            },
          },
          {
            user: {
              id: 'u_m',
              nickname: '도현',
              avatarId: 'a_m',
              avatar: { imageData: 'data:image/webp;base64,AAA' },
              gender: 'male',
              phone: '010-1234-5678',
              showLikesReceived: true,
              joinPopularityRanking: true,
            },
          },
          {
            user: {
              id: 'u_optout',
              nickname: '비공개',
              avatarId: null,
              avatar: null,
              gender: 'male',
              phone: null,
              showLikesReceived: true,
              joinPopularityRanking: false,
            },
          },
        ]),
      },
      review: {
        findMany: vi.fn(async () => [
          { targetUserId: 'u_m', rating: 5, tagsJson: '["대화가 좋아요","매너"]' },
          { targetUserId: 'u_m', rating: 4, tagsJson: '["대화가 좋아요"]' },
          { targetUserId: 'u_f', rating: 4, tagsJson: '["분위기"]' },
        ]),
      },
    }

    const rows = await makeService(prisma).listDerivedCandidates('u_host', 'p_1')

    expect(rows.map((row) => row.id)).toEqual(['u_m', 'u_f'])
    expect(rows[0]).toMatchObject({
      id: 'u_m',
      rank: 1,
      inviteScore: 2,
      voteCount: 2,
      rating: 4.5,
      topTags: ['대화가 좋아요', '매너'],
      hasPhone: true,
    })
    expect(rows[1]).toMatchObject({ id: 'u_f', inviteScore: 1, voteCount: null })
  })

  it('guards derived analysis to the origin party host', async () => {
    const prisma = {
      party: { findUnique: vi.fn(async () => ({ id: 'p_1', hostId: 'u_host' })) },
    }

    await expect(
      makeService(prisma).listDerivedCandidates('u_other', 'p_1'),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('queues sms invitations only for selected users with phone numbers', async () => {
    const prisma = {
      party: {
        findUnique: vi.fn(async () => ({
          id: 'p_derived',
          hostId: 'u_host',
          title: '앵콜 모임',
          quickCode: 'ABC123',
        })),
      },
      user: {
        findMany: vi.fn(async () => [
          { id: 'u_1', nickname: '윤슬', phone: '010-1111-2222' },
          { id: 'u_2', nickname: '도현', phone: null },
          { id: 'u_3', nickname: '민서', phone: '010-3333-4444' },
        ]),
      },
      notification: { createMany: vi.fn(async () => ({ count: 3 })) },
      chatRoom: { create: vi.fn() },
      chatMessage: { create: vi.fn() },
    }

    const result = await makeService(prisma).sendInvitations('u_host', 'p_derived', {
      targetUserIds: ['u_1', 'u_2', 'u_3'],
      channel: 'sms',
      message: '초대합니다',
    })

    expect(result).toMatchObject({
      ok: true,
      count: 2,
      totalTargets: 3,
      channel: 'sms',
      queuedSms: 2,
      skippedNoPhone: 1,
      invitePath: '/invite/ABC123',
    })
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ userId: 'u_1', kind: 'party_invite' }),
        expect.objectContaining({ userId: 'u_2', kind: 'party_invite' }),
        expect.objectContaining({ userId: 'u_3', kind: 'party_invite' }),
      ]),
    })
    expect(prisma.chatRoom.create).not.toHaveBeenCalled()
  })
})
