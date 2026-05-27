import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Module,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@/prisma/prisma.service'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'

@Controller()
class PhotosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('parties/:partyId/photos')
  async list(@Param('partyId') partyId: string) {
    const photos = await this.prisma.partyPhoto.findMany({
      where: { partyId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nickname: true, avatarId: true } },
      },
    })
    return photos.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      createdAt: p.createdAt.toISOString(),
      userId: p.userId,
      uploader: p.user,
    }))
  }

  @Post('parties/:partyId/photos')
  @UseGuards(AuthGuard('jwt'))
  async create(
    @CurrentUser() me: JwtUserPayload,
    @Param('partyId') partyId: string,
    @Body() body: { url?: string; caption?: string },
  ) {
    const url = body?.url?.trim()
    if (!url) {
      throw new BadRequestException({ code: 'invalid_url', message: '사진 URL이 필요해요' })
    }

    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party) {
      throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    }

    const isHost = party.hostId === me.sub
    const participation = await this.prisma.participation.findUnique({
      where: { partyId_userId: { partyId, userId: me.sub } },
    })
    const isParticipant =
      !!participation && ['confirmed', 'checked-in'].includes(participation.status)

    if (!isHost && !isParticipant) {
      throw new ForbiddenException({
        code: 'not_participant',
        message: '참가자만 사진을 추가할 수 있어요',
      })
    }

    const photo = await this.prisma.partyPhoto.create({
      data: {
        partyId,
        userId: me.sub,
        url,
        caption: body.caption?.trim() ? body.caption.trim() : null,
      },
      include: { user: { select: { id: true, nickname: true, avatarId: true } } },
    })
    return {
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      createdAt: photo.createdAt.toISOString(),
      userId: photo.userId,
      uploader: photo.user,
    }
  }

  @Delete('photos/:id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    const photo = await this.prisma.partyPhoto.findUnique({
      where: { id },
      include: { party: { select: { hostId: true } } },
    })
    if (!photo) {
      throw new NotFoundException({ code: 'photo_not_found', message: '사진을 찾을 수 없어요' })
    }
    const isUploader = photo.userId === me.sub
    const isHost = photo.party.hostId === me.sub
    if (!isUploader && !isHost) {
      throw new ForbiddenException({
        code: 'not_allowed',
        message: '본인이 올린 사진이거나 호스트만 삭제할 수 있어요',
      })
    }
    await this.prisma.partyPhoto.delete({ where: { id } })
    return { ok: true }
  }
}

@Module({ controllers: [PhotosController] })
export class PhotosModule {}
