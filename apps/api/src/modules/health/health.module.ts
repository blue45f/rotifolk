import { Controller, Get, HttpStatus, Module, Res } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'

import { PrismaService } from '../../prisma/prisma.service'

import type { Response } from 'express'

/**
 * Health probes for hosted deploys (Docker / Fly / k8s).
 *
 * - `GET /health` and `GET /health/live` are cheap liveness checks that never
 *   touch the DB, so they stay green while the process is up.
 * - `GET /health/ready` pings the database and returns HTTP 503 when it is
 *   unreachable, so the platform can hold traffic until the API can serve.
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  ping() {
    return { ok: true, app: 'rotifolk-api', ts: new Date().toISOString() }
  }

  @Get('live')
  live() {
    return this.ping()
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    let database: boolean
    try {
      await this.prisma.$queryRaw`SELECT 1`
      database = true
    } catch {
      database = false
    }

    res.status(database ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
    return {
      ok: database,
      app: 'rotifolk-api',
      ts: new Date().toISOString(),
      checks: { database },
    }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
