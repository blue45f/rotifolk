import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

import { ChatEventsEmitter } from './chat-events.emitter'
import { ChatService } from './chat.service'

import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly chatEvents: ChatEventsEmitter
  ) {}

  @Get('rooms')
  rooms(@CurrentUser() me: JwtUserPayload) {
    return this.chat.listMyRooms(me.sub)
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() me: JwtUserPayload) {
    return this.chat.unreadCount(me.sub)
  }

  @Get('rooms/:roomId/messages')
  messages(
    @CurrentUser() me: JwtUserPayload,
    @Param('roomId') roomId: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string
  ) {
    return this.chat.listMessages(me.sub, roomId, limit ? Number(limit) : 60, before)
  }

  @Post('rooms/:roomId/messages')
  async send(
    @CurrentUser() me: JwtUserPayload,
    @Param('roomId') roomId: string,
    @Body() body: { body: string; kind?: 'text' | 'split-bill'; meta?: Record<string, unknown> }
  ) {
    const message = await this.chat.postMessage({
      userId: me.sub,
      roomId,
      body: body.body,
      kind: body.kind ?? 'text',
      meta: body.meta ?? null,
    })
    const memberIds = await this.chat.roomMemberIds(roomId)
    this.chatEvents.emitMessage(message, memberIds)
    return message
  }

  @Post('rooms/:roomId/read')
  async markRead(@CurrentUser() me: JwtUserPayload, @Param('roomId') roomId: string) {
    const result = await this.chat.markRead(me.sub, roomId)
    this.chatEvents.emitRead(me.sub, roomId)
    return result
  }

  @Post('parties/:partyId/ensure')
  ensureGroupRoom(@CurrentUser() me: JwtUserPayload, @Param('partyId') partyId: string) {
    return this.chat.ensurePartyGroupRoom(partyId, me.sub)
  }
}
