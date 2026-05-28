import { Module } from '@nestjs/common'
import { SafetyService } from './safety.service'
import { SafetyController } from './safety.controller'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [NotificationsModule],
  controllers: [SafetyController],
  providers: [SafetyService],
  exports: [SafetyService],
})
export class SafetyModule {}
