import { Controller, Delete, Get, Module, Param, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

import { toPartySummary } from '../parties/party.mapper'

import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { PrismaService } from '@/prisma/prisma.service'

@Controller('saved')
@UseGuards(AuthGuard('jwt'))
class SavedController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() me: JwtUserPayload) {
    const items = await this.prisma.savedParty.findMany({
      where: { userId: me.sub },
      include: {
        party: {
          include: {
            venue: true,
            host: { select: { id: true, nickname: true } },
            _count: { select: { participations: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return items.map((s) => toPartySummary(s.party as never))
  }

  @Post(':partyId')
  async save(@CurrentUser() me: JwtUserPayload, @Param('partyId') partyId: string) {
    return this.prisma.savedParty.upsert({
      where: { userId_partyId: { userId: me.sub, partyId } },
      create: { userId: me.sub, partyId },
      update: {},
    })
  }

  @Delete(':partyId')
  async unsave(@CurrentUser() me: JwtUserPayload, @Param('partyId') partyId: string) {
    await this.prisma.savedParty.deleteMany({
      where: { userId: me.sub, partyId },
    })
    return { ok: true }
  }
}

@Module({ controllers: [SavedController] })
export class SavedModule {}
