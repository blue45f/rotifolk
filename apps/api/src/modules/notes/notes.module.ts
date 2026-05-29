import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { NotesService } from './notes.service'
import { NotesController } from './notes.controller'

@Module({
  imports: [NotificationsModule],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
