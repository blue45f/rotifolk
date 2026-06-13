import { Module } from '@nestjs/common'

import { ChatEventsEmitter } from './chat-events.emitter'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatEventsEmitter],
  exports: [ChatService, ChatEventsEmitter],
})
export class ChatModule {}
