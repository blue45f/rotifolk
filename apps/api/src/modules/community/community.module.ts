import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Module,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import {
  buildCommunityCommentTree,
  CommunityPostQuerySchema,
  CreateCommunityCommentSchema,
  CreateCommunityPostSchema,
} from '@rotifolk/shared'
import type {
  CommunityComment,
  CommunityPost,
  CommunityPostDetail,
  CommunityPostQueryDto,
  CreateCommunityCommentDto,
  CreateCommunityPostDto,
  Paginated,
} from '@rotifolk/shared'
import { PrismaService } from '@/prisma/prisma.service'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { NotificationsEmitter } from '../notifications/notifications.emitter'
import { NotificationsModule } from '../notifications/notifications.module'

@Controller()
class CommunityController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifEmitter: NotificationsEmitter,
  ) {}

  @Get('community/posts')
  async listCommunityPosts(
    @Query(new ZodValidationPipe(CommunityPostQuerySchema)) query: CommunityPostQueryDto,
  ): Promise<Paginated<CommunityPost>> {
    const where = {
      status: 'open',
      ...(query.category ? { category: query.category } : {}),
      ...(query.area ? { area: { contains: query.area } } : {}),
      ...(query.q
        ? {
            OR: [{ title: { contains: query.q } }, { body: { contains: query.q } }],
          }
        : {}),
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.communityPost.findMany({
        where,
        include: {
          author: {
            select: { id: true, nickname: true, avatarId: true, role: true, isVerified: true },
          },
          party: { select: { title: true } },
        },
        orderBy: [{ lastCommentAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.communityPost.count({ where }),
    ])

    return {
      items: items.map(mapCommunityPost),
      total,
      page: query.page,
      pageSize: query.pageSize,
      hasNext: query.page * query.pageSize < total,
    }
  }

  @Get('community/posts/:postId')
  async getCommunityPost(@Param('postId') postId: string): Promise<CommunityPostDetail> {
    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, status: 'open' },
      include: {
        author: {
          select: { id: true, nickname: true, avatarId: true, role: true, isVerified: true },
        },
        party: { select: { title: true } },
        comments: {
          where: { status: 'visible' },
          include: {
            author: {
              select: { id: true, nickname: true, avatarId: true, role: true, isVerified: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!post)
      throw new BadRequestException({
        code: 'community_post_not_found',
        message: '커뮤니티 글을 찾을 수 없어요',
      })

    return {
      ...mapCommunityPost(post),
      comments: buildCommunityCommentTree(post.comments.map(mapCommunityComment)),
    }
  }

  @Post('community/posts')
  @UseGuards(AuthGuard('jwt'))
  async createCommunityPost(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(CreateCommunityPostSchema)) dto: CreateCommunityPostDto,
  ): Promise<CommunityPost> {
    const post = await this.prisma.communityPost.create({
      data: {
        authorId: me.sub,
        partyId: dto.partyId ?? null,
        title: dto.title,
        body: dto.body,
        category: dto.category,
        area: dto.area ?? null,
        tagsJson: JSON.stringify(dto.tags),
      },
      include: {
        author: {
          select: { id: true, nickname: true, avatarId: true, role: true, isVerified: true },
        },
        party: { select: { title: true } },
      },
    })
    return mapCommunityPost(post)
  }

  @Post('community/posts/:postId/comments')
  @UseGuards(AuthGuard('jwt'))
  async createCommunityComment(
    @CurrentUser() me: JwtUserPayload,
    @Param('postId') postId: string,
    @Body(new ZodValidationPipe(CreateCommunityCommentSchema)) dto: CreateCommunityCommentDto,
  ): Promise<CommunityComment> {
    const [post, parent] = await Promise.all([
      this.prisma.communityPost.findFirst({ where: { id: postId, status: 'open' } }),
      dto.parentId
        ? this.prisma.communityComment.findFirst({
            where: { id: dto.parentId, status: 'visible' },
          })
        : Promise.resolve(null),
    ])
    if (!post)
      throw new BadRequestException({
        code: 'community_post_not_found',
        message: '답글을 남길 글을 찾을 수 없어요',
      })
    if (dto.parentId && (!parent || parent.postId !== postId)) {
      throw new BadRequestException({
        code: 'invalid_parent_comment',
        message: '같은 글의 댓글에만 답장할 수 있어요',
      })
    }

    const parentId = parent?.parentId ?? parent?.id ?? null
    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityComment.create({
        data: {
          postId,
          authorId: me.sub,
          parentId,
          body: dto.body,
        },
        include: {
          author: {
            select: { id: true, nickname: true, avatarId: true, role: true, isVerified: true },
          },
        },
      })
      await tx.communityPost.update({
        where: { id: postId },
        data: {
          commentCount: { increment: 1 },
          lastCommentAt: created.createdAt,
        },
      })
      return created
    })
    return mapCommunityComment(comment)
  }

  @Post('follows/:userId')
  @UseGuards(AuthGuard('jwt'))
  async follow(@CurrentUser() me: JwtUserPayload, @Param('userId') userId: string) {
    if (me.sub === userId)
      throw new ForbiddenException({
        code: 'cannot_follow_self',
        message: '본인은 팔로우할 수 없어요',
      })
    const [follow, follower] = await Promise.all([
      this.prisma.follow.upsert({
        where: { followerId_followingId: { followerId: me.sub, followingId: userId } },
        create: { followerId: me.sub, followingId: userId },
        update: {},
      }),
      this.prisma.user.findUnique({ where: { id: me.sub }, select: { nickname: true } }),
    ])
    const body = `${follower?.nickname ?? '누군가'}님이 팔로우를 시작했어요.`
    await this.prisma.notification
      .create({
        data: {
          userId,
          kind: 'new_follower',
          title: '새 팔로워',
          body,
          link: '/me/follows',
        },
      })
      .catch(() => undefined)
    this.notifEmitter.toUser(userId, {
      kind: 'new_follower',
      title: '새 팔로워',
      body,
      link: '/me/follows',
    })
    return follow
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
        hostId: id,
        hostNickname: user.nickname,
        tags: [],
      })),
    }
  }
}

@Module({ imports: [NotificationsModule], controllers: [CommunityController] })
export class CommunityModule {}

type JsonPost = {
  id: string
  title: string
  body: string
  category: string
  area: string | null
  partyId: string | null
  tagsJson: string
  commentCount: number
  lastCommentAt: Date | null
  createdAt: Date
  updatedAt: Date
  author: {
    id: string
    nickname: string
    avatarId: string | null
    role: string
    isVerified: boolean
  }
  party?: { title: string } | null
}

type JsonComment = {
  id: string
  postId: string
  parentId: string | null
  body: string
  createdAt: Date
  updatedAt: Date
  author: {
    id: string
    nickname: string
    avatarId: string | null
    role: string
    isVerified: boolean
  }
}

function safeTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === 'string')
      : []
  } catch {
    return []
  }
}

function mapCommunityPost(post: JsonPost): CommunityPost {
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    category: post.category as CommunityPost['category'],
    area: post.area,
    partyId: post.partyId,
    partyTitle: post.party?.title ?? null,
    tags: safeTags(post.tagsJson),
    commentCount: post.commentCount,
    lastCommentAt: post.lastCommentAt?.toISOString() ?? null,
    author: post.author,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  }
}

function mapCommunityComment(comment: JsonComment): CommunityComment {
  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    body: comment.body,
    author: comment.author,
    replies: [],
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  }
}
