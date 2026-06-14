import { Injectable } from '@nestjs/common'
import { USER_ROOM, type ClientToServerEvents, type ServerToClientEvents } from '@rotifolk/shared'

import type { Server } from 'socket.io'

export interface RealtimeChatMessage {
  id: string
  roomId: string
  userId: string
  nickname: string
  body: string
  kind: 'text' | 'system' | 'split-bill'
  meta?: Record<string, unknown> | null
  createdAt: string
}

@Injectable()
export class ChatEventsEmitter {
  private server: Server<ClientToServerEvents, ServerToClientEvents> | null = null

  setServer(server: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.server = server
  }

  emitMessage(message: RealtimeChatMessage, memberIds: string[]) {
    if (!this.server) return
    for (const memberId of memberIds) {
      this.server.to(USER_ROOM(memberId)).emit('chat:message:new', { message })
    }
  }

  emitRead(userId: string, roomId: string) {
    if (!this.server) return
    this.server.to(USER_ROOM(userId)).emit('chat:room:read', { roomId })
  }
}
