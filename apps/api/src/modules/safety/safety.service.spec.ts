import { BadRequestException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SafetyService } from './safety.service'

const createdAt = new Date('2026-06-01T09:00:00.000Z')

function expectedPhoneHash(phone: string) {
  const normalized = phone.replace(/\D/g, '').replace(/^82/, '0')
  return createHash('sha256').update(`rotifolk-pepper${normalized}`).digest('hex')
}

function makeService() {
  const prisma = {
    avoidContact: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    userBlock: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  }
  const notifEmitter = {}
  return {
    prisma,
    service: new SafetyService(prisma as never, notifEmitter as never),
  }
}

describe('SafetyService phone blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stores contact avoidance as a peppered hash and never returns the raw phone', async () => {
    const { prisma, service } = makeService()
    prisma.avoidContact.upsert.mockResolvedValue({
      id: 'avoid_1',
      label: '전 직장 동료',
      createdAt,
    })

    const result = await service.blockPhone('u_1', '+82 10-1234-5678', '전 직장 동료')

    expect(prisma.avoidContact.upsert).toHaveBeenCalledWith({
      where: {
        userId_phoneHash: {
          userId: 'u_1',
          phoneHash: expectedPhoneHash('010-1234-5678'),
        },
      },
      create: {
        userId: 'u_1',
        phoneHash: expectedPhoneHash('010-1234-5678'),
        label: '전 직장 동료',
      },
      update: { label: '전 직장 동료' },
    })
    expect(result).toEqual({
      id: 'avoid_1',
      label: '전 직장 동료',
      createdAt: '2026-06-01T09:00:00.000Z',
    })
    expect(result).not.toHaveProperty('phone')
    expect(result).not.toHaveProperty('phoneHash')
  })

  it('lists contact avoidance rows without exposing phone hashes', async () => {
    const { prisma, service } = makeService()
    prisma.avoidContact.findMany.mockResolvedValue([
      { id: 'avoid_2', phoneHash: 'secret-hash', label: null, createdAt },
    ])

    await expect(service.listMyPhoneBlocks('u_1')).resolves.toEqual([
      { id: 'avoid_2', label: null, createdAt: '2026-06-01T09:00:00.000Z' },
    ])
  })

  it('rejects invalid phone input before writing avoidance rows', async () => {
    const { prisma, service } = makeService()

    await expect(service.blockPhone('u_1', '123', '메모')).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(prisma.avoidContact.upsert).not.toHaveBeenCalled()
  })

  it('returns blocked users in the flat shape consumed by the web page', async () => {
    const { prisma, service } = makeService()
    prisma.userBlock.findMany.mockResolvedValue([
      {
        id: 'block_1',
        blockedId: 'u_blocked',
        reason: '비매너',
        createdAt,
        blocked: {
          id: 'u_blocked',
          nickname: '민우',
          avatarId: 'avatar_3',
          avatar: { imageData: 'data:image/webp;base64,QUJD' },
        },
      },
      {
        id: 'block_2',
        blockedId: 'u_blocked2',
        reason: null,
        createdAt,
        blocked: {
          id: 'u_blocked2',
          nickname: '지수',
          avatarId: 'avatar_4',
          avatar: null,
        },
      },
    ])

    await expect(service.listMyBlocks('u_1')).resolves.toEqual([
      {
        id: 'u_blocked',
        nickname: '민우',
        avatarId: 'avatar_3',
        // 업로드한 프로필 사진은 평탄화해 내려준다 — 차단 목록에서도 사진으로 식별.
        avatarImage: 'data:image/webp;base64,QUJD',
        reason: '비매너',
        blockedAt: '2026-06-01T09:00:00.000Z',
      },
      {
        id: 'u_blocked2',
        nickname: '지수',
        avatarId: 'avatar_4',
        // 아바타(또는 사진)가 없으면 null — 프런트가 프리셋으로 폴백.
        avatarImage: null,
        reason: null,
        blockedAt: '2026-06-01T09:00:00.000Z',
      },
    ])
  })
})
