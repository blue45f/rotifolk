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
  Req,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { JwtService } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PrismaService } from '@/prisma/prisma.service'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'

@Controller()
class PhotosController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private viewerIdFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null
    try {
      const payload = this.jwt.verify<JwtUserPayload>(authHeader.slice(7))
      return payload.sub
    } catch {
      return null
    }
  }

  @Get('parties/:partyId/photos')
  async list(
    @Param('partyId') partyId: string,
    @Req() req: { headers: { authorization?: string } },
  ) {
    const viewerId = this.viewerIdFromHeader(req.headers.authorization)
    const photos = await this.prisma.partyPhoto.findMany({
      where: { partyId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nickname: true, avatarId: true } },
        _count: { select: { likes: true } },
        likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
      },
    })
    return photos.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      createdAt: p.createdAt.toISOString(),
      userId: p.userId,
      uploader: p.user,
      likeCount: p._count.likes,
      likedByMe: viewerId ? (p.likes?.length ?? 0) > 0 : false,
    }))
  }

  @Post('photos/:id/like')
  @UseGuards(AuthGuard('jwt'))
  async like(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    const photo = await this.prisma.partyPhoto.findUnique({ where: { id } })
    if (!photo)
      throw new NotFoundException({ code: 'photo_not_found', message: '사진을 찾을 수 없어요' })
    return this.prisma.photoLike.upsert({
      where: { photoId_userId: { photoId: id, userId: me.sub } },
      create: { photoId: id, userId: me.sub },
      update: {},
    })
  }

  @Delete('photos/:id/like')
  @UseGuards(AuthGuard('jwt'))
  async unlike(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    await this.prisma.photoLike.deleteMany({ where: { photoId: id, userId: me.sub } })
    return { ok: true }
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
    // 저장형 XSS 차단 — 다른 참가자 브라우저에서 <a href>로 렌더되므로
    // http(s) 외 스킴(javascript:, data: 등)은 저장 자체를 거부한다.
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      throw new BadRequestException({ code: 'invalid_url', message: '올바른 URL 형식이 아니에요' })
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new BadRequestException({
        code: 'invalid_url',
        message: 'http(s) URL만 등록할 수 있어요',
      })
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

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret-change-me'),
      }),
    }),
  ],
  controllers: [PhotosController],
})
export class PhotosModule {}
