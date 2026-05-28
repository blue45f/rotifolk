import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@/prisma/prisma.service'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'

@Controller()
class CommunityController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('follows/:userId')
  @UseGuards(AuthGuard('jwt'))
  async follow(@CurrentUser() me: JwtUserPayload, @Param('userId') userId: string) {
    if (me.sub === userId)
      throw new ForbiddenException({ code: 'cannot_follow_self', message: '본인은 팔로우할 수 없어요' })
    return this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId: me.sub, followingId: userId } },
      create: { followerId: me.sub, followingId: userId },
      update: {},
    })
  }

  @Delete('follows/:userId')
  @UseGuards(AuthGuard('jwt'))
  async unfollow(@CurrentUser() me: JwtUserPayload, @Param('userId') userId: string) {
    await this.prisma.follow.deleteMany({
      where: { followerId: me.sub, followingId: userId },
    })
    return { ok: true }
  }

  @Get('follows/me')
  @UseGuards(AuthGuard('jwt'))
  async myFollowing(@CurrentUser() me: JwtUserPayload) {
    const items = await this.prisma.follow.findMany({
      where: { followerId: me.sub },
      include: { following: { select: { id: true, nickname: true, avatarId: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return items.map((f) => f.following)
  }

  @Get('follows/me/followers')
  @UseGuards(AuthGuard('jwt'))
  async myFollowers(@CurrentUser() me: JwtUserPayload) {
    const items = await this.prisma.follow.findMany({
      where: { followingId: me.sub },
      include: { follower: { select: { id: true, nickname: true, avatarId: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return items.map((f) => f.follower)
  }

  /** 호스트 프로필 — 공개 정보 + 통계 + 팔로우 여부 */
  @Get('hosts/:id')
  async hostProfile(@Param('id') id: string, @Body() _b: unknown) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nickname: true,
        avatarId: true,
        bio: true,
        mbti: true,
        interestsJson: true,
        trustScore: true,
        hostedCount: true,
        isVerified: true,
        role: true,
      },
    })
    if (!user) return null

    const [followerCount, hostedParties, reviews] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: id } }),
      this.prisma.party.findMany({
        where: { hostId: id, status: { in: ['open', 'live', 'ended'] } },
        include: { venue: true, _count: { select: { participations: true } } },
        orderBy: { startAt: 'desc' },
        take: 12,
      }),
      this.prisma.review.findMany({
        where: { targetUserId: id },
        include: {
          fromUser: { select: { id: true, nickname: true, avatarId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    const avgRating =
      reviews.length === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    return {
      user,
      stats: {
        followerCount,
        hostedCount: hostedParties.length,
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
      },
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        anonymous: r.anonymous,
        tagsJson: r.tagsJson,
        hostReply: r.hostReply,
        createdAt: r.createdAt.toISOString(),
        fromUser: r.anonymous
          ? null
          : r.fromUser
            ? { id: r.fromUser.id, nickname: r.fromUser.nickname, avatarId: r.fromUser.avatarId }
            : null,
      })),
      recentParties: hostedParties.map((p) => ({
        id: p.id,
        title: p.title,
        startAt: p.startAt.toISOString(),
        coverImageUrl: p.coverImageUrl,
        category: p.category,
        venueArea: p.venue?.area ?? '',
        venueName: p.venue?.name ?? '',
        currentParticipants: p._count.participations,
        maxParticipants: p.maxParticipants,
        status: p.status,
        basePriceKRW: p.basePriceKRW,
        drinkPackage: p.drinkPackage,
        snackPackage: p.snackPackage,
        tags: [],
      })),
    }
  }
}

@Module({ controllers: [CommunityController] })
export class CommunityModule {}
