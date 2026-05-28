import { Module } from '@nestjs/common'
import { PartiesService } from './parties.service'
import { PartiesController } from './parties.controller'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [NotificationsModule],
  controllers: [PartiesController],
  providers: [PartiesService],
  exports: [PartiesService],
})
export class PartiesModule {}
