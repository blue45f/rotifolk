import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { ChatService } from './chat.service'

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chat: ChatService) {}

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
    @Query('limit') limit?: string,
  ) {
    return this.chat.listMessages(me.sub, roomId, limit ? Number(limit) : 60, before)
  }

  @Post('rooms/:roomId/messages')
  send(
    @CurrentUser() me: JwtUserPayload,
    @Param('roomId') roomId: string,
    @Body() body: { body: string; kind?: 'text' | 'split-bill'; meta?: Record<string, unknown> },
  ) {
    return this.chat.postMessage({
      userId: me.sub,
      roomId,
      body: body.body,
      kind: body.kind ?? 'text',
      meta: body.meta ?? null,
    })
  }

  @Post('rooms/:roomId/read')
  markRead(@CurrentUser() me: JwtUserPayload, @Param('roomId') roomId: string) {
    return this.chat.markRead(me.sub, roomId)
  }

  @Post('parties/:partyId/ensure')
  ensureGroupRoom(@CurrentUser() _me: JwtUserPayload, @Param('partyId') partyId: string) {
    return this.chat.ensurePartyGroupRoom(partyId)
  }
}
