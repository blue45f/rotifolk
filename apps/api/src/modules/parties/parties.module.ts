import { Module } from '@nestjs/common'

import { NotificationsModule } from '../notifications/notifications.module'

import { PartiesController } from './parties.controller'
import { PartiesService } from './parties.service'

@Module({
  imports: [NotificationsModule],
  controllers: [PartiesController],
  providers: [PartiesService],
  exports: [PartiesService],
})
export class PartiesModule {}
