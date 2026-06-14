import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PrismaService } from './prisma.service'

const mocks = vi.hoisted(() => ({
  adapterConstructor: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  prismaClientConstructor: vi.fn(),
}))

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class PrismaPg {
    constructor(options: unknown) {
      mocks.adapterConstructor(options)
    }
  },
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {
    constructor(options: unknown) {
      mocks.prismaClientConstructor(options)
    }

    $connect = mocks.connect
    $disconnect = mocks.disconnect
  },
}))

describe('PrismaService', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL

  beforeEach(() => {
    vi.clearAllMocks()
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl
    }
  })

  it('passes DATABASE_URL to the pg adapter', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@host/db?sslmode=require'

    new PrismaService()

    expect(mocks.adapterConstructor).toHaveBeenCalledWith({
      connectionString: 'postgresql://user:pass@host/db?sslmode=require',
    })
    expect(mocks.prismaClientConstructor).toHaveBeenCalledWith({
      adapter: expect.any(Object),
    })
  })

  it('falls back to the local development database URL', () => {
    delete process.env.DATABASE_URL

    new PrismaService()

    expect(mocks.adapterConstructor).toHaveBeenCalledWith({
      connectionString: 'postgresql://localhost:5432/rotifolk',
    })
  })

  it('connects and disconnects through the Nest lifecycle hooks', async () => {
    const service = new PrismaService()

    await service.onModuleInit()
    await service.onModuleDestroy()

    expect(mocks.connect).toHaveBeenCalledTimes(1)
    expect(mocks.disconnect).toHaveBeenCalledTimes(1)
  })
})
