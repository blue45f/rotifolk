import { Injectable } from '@nestjs/common'
import { USER_ROOM } from '@rotifolk/shared'

import type { ServerToClientEvents, ClientToServerEvents } from '@rotifolk/shared'
import type { Server } from 'socket.io'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>

@Injectable()
export class NotificationsEmitter {
  private server?: IoServer

  setServer(srv: IoServer) {
    this.server = srv
  }

  toUser(userId: string, payload: { kind: string; title: string; body?: string; link?: string }) {
    this.server?.to(USER_ROOM(userId)).emit('notification:new', payload)
  }
}
