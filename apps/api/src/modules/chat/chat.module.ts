import { Module } from '@nestjs/common'
import { ChatService } from './chat.service'
import { ChatController } from './chat.controller'
import { ChatEventsEmitter } from './chat-events.emitter'

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatEventsEmitter],
  exports: [ChatService, ChatEventsEmitter],
})
export class ChatModule {}
