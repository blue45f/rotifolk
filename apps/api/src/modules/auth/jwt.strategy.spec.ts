import { UnauthorizedException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { JwtUserPayload } from '@/common/current-user.decorator'
import { JwtStrategy } from './jwt.strategy'

const cfgMock = {
  get: vi.fn((_key: string, fallback: string) => fallback),
}

function makePrismaMock(user: unknown) {
  return {
    user: {
      findUnique: vi.fn(async () => user),
    },
  }
}

const payload: JwtUserPayload = {
  sub: 'u_1',
  email: 'stale@example.com',
  role: 'participant',
  nickname: 'stale',
}

describe('JwtStrategy', () => {
  it('returns current user claims for active accounts', async () => {
    const prisma = makePrismaMock({
      id: 'u_1',
      email: 'alice@example.com',
      role: 'host',
      nickname: 'alice',
      accountStatus: 'active',
    })
    const strategy = new JwtStrategy(cfgMock as never, prisma as never)

    await expect(strategy.validate(payload)).resolves.toEqual({
      sub: 'u_1',
      email: 'alice@example.com',
      role: 'host',
      nickname: 'alice',
    })
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u_1' },
      select: { id: true, email: true, role: true, nickname: true, accountStatus: true },
    })
  })

  it.each(['withdrawn', 'suspended'])('rejects %s accounts', async (accountStatus) => {
    const prisma = makePrismaMock({
      id: 'u_1',
      email: 'alice@example.com',
      role: 'host',
      nickname: 'alice',
      accountStatus,
    })
    const strategy = new JwtStrategy(cfgMock as never, prisma as never)

    const err = await strategy.validate(payload).catch((e) => e)

    expect(err).toBeInstanceOf(UnauthorizedException)
    expect((err.getResponse() as { code: string }).code).toBe('account_inactive')
  })

  it('rejects tokens for deleted or missing users', async () => {
    const strategy = new JwtStrategy(cfgMock as never, makePrismaMock(null) as never)

    const err = await strategy.validate(payload).catch((e) => e)

    expect(err).toBeInstanceOf(UnauthorizedException)
    expect((err.getResponse() as { code: string }).code).toBe('account_inactive')
  })
})
