import { HttpStatus } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import { HealthController } from './health.module'

import type { PrismaService } from '../../prisma/prisma.service'
import type { Response } from 'express'

const makePrisma = (queryImpl: () => Promise<unknown>) =>
  ({ $queryRaw: vi.fn(queryImpl) }) as unknown as PrismaService

const makeRes = () => ({ status: vi.fn() }) as unknown as Response

describe('HealthController', () => {
  it('liveness returns ok without touching the DB', () => {
    const prisma = makePrisma(() => Promise.reject(new Error('must not be called')))

    expect(new HealthController(prisma).ping()).toMatchObject({ ok: true, app: 'rotifolk-api' })
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
  })

  it('live() aliases the liveness check', () => {
    const prisma = makePrisma(() => Promise.resolve([{ 1: 1 }]))

    expect(new HealthController(prisma).live()).toMatchObject({ ok: true, app: 'rotifolk-api' })
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
  })

  it('readiness reports ok + 200 when the DB responds', async () => {
    const prisma = makePrisma(() => Promise.resolve([{ '?column?': 1 }]))
    const res = makeRes()

    const body = await new HealthController(prisma).ready(res)

    expect(body).toMatchObject({ ok: true, checks: { database: true } })
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK)
  })

  it('readiness reports not-ok + 503 when the DB is unreachable', async () => {
    const prisma = makePrisma(() => Promise.reject(new Error('db down')))
    const res = makeRes()

    const body = await new HealthController(prisma).ready(res)

    expect(body).toMatchObject({ ok: false, checks: { database: false } })
    expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE)
  })
})
