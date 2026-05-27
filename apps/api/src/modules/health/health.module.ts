import { Controller, Get, Module } from '@nestjs/common'

@Controller('health')
class HealthController {
  @Get()
  ping() {
    return { ok: true, app: 'rotifolk-api', ts: new Date().toISOString() }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
