import { Controller, Get, Module, Param, Post, Query, UseGuards } from '@nestjs/common'
import { NotificationsEmitter } from './notifications.emitter'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@/prisma/prisma.service'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() me: JwtUserPayload, @Query('unread') unread?: string) {
    const items = await this.prisma.notification.findMany({
      where: { userId: me.sub, ...(unread === 'true' ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return items.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      isRead: !!n.readAt,
      createdAt: n.createdAt.toISOString(),
    }))
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() me: JwtUserPayload) {
    const count = await this.prisma.notification.count({
      where: { userId: me.sub, readAt: null },
    })
    return { count }
  }

  @Post(':id/read')
  async markRead(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId: me.sub },
      data: { readAt: new Date() },
    })
    return { ok: true }
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() me: JwtUserPayload) {
    await this.prisma.notification.updateMany({
      where: { userId: me.sub, readAt: null },
      data: { readAt: new Date() },
    })
    return { ok: true }
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsEmitter],
  exports: [NotificationsEmitter],
})
export class NotificationsModule {}
