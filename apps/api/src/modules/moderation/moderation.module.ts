import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Module,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ModeratePostSchema, ModerationPostQuerySchema } from '@rotifolk/shared'
import type {
  ModeratePostDto,
  ModerationPostItem,
  ModerationPostQueryDto,
  Paginated,
} from '@rotifolk/shared'
import { PrismaService } from '@/prisma/prisma.service'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'

/**
 * 어드민 콘텐츠 모더레이션 — 커뮤니티/클럽 게시글의 숨김·복구·삭제·첨부 제거.
 * AdminPage(통계·정산)와 분리된 /admin/moderation 전용 백엔드.
 * 모든 조치는 ReportAuditLog에 reportId 없이도 감사 기록을 남긴다.
 */
@Controller()
class ModerationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('admin/moderation/posts')
  @UseGuards(AuthGuard('jwt'))
  async listPosts(
    @CurrentUser() me: JwtUserPayload,
    @Query(new ZodValidationPipe(ModerationPostQuerySchema)) query: ModerationPostQueryDto,
  ): Promise<Paginated<ModerationPostItem>> {
    assertAdmin(me)
    return query.scope === 'club' ? this.listClubPosts(query) : this.listCommunityPosts(query)
  }

  @Patch('admin/moderation/posts/:postId')
  @UseGuards(AuthGuard('jwt'))
  async moderatePost(
    @CurrentUser() me: JwtUserPayload,
    @Param('postId') postId: string,
    @Body(new ZodValidationPipe(ModeratePostSchema)) dto: ModeratePostDto,
  ): Promise<{ ok: true; status: string }> {
    assertAdmin(me)

    const isClub = dto.scope === 'club'
    const current = isClub
      ? await this.prisma.clubPost.findUnique({
          where: { id: postId },
          select: { status: true, imageData: true },
        })
      : await this.prisma.communityPost.findUnique({
          where: { id: postId },
          select: { status: true, imageData: true },
        })
    if (!current)
      throw new BadRequestException({
        code: 'moderation_post_not_found',
        message: '대상 게시글을 찾을 수 없어요',
      })

    const data = buildModerationUpdate(dto.action, current.status)
    if (isClub) {
      await this.prisma.clubPost.update({ where: { id: postId }, data })
    } else {
      await this.prisma.communityPost.update({ where: { id: postId }, data })
    }

    await this.prisma.reportAuditLog
      .create({
        data: {
          actorId: me.sub,
          action: `moderation_post_${dto.action}`,
          note: dto.note ?? null,
          metadataJson: JSON.stringify({ scope: dto.scope, postId }),
        },
      })
      .catch(() => undefined)

    return { ok: true, status: typeof data.status === 'string' ? data.status : current.status }
  }

  private async listCommunityPosts(
    query: ModerationPostQueryDto,
  ): Promise<Paginated<ModerationPostItem>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? { OR: [{ title: { contains: query.q } }, { body: { contains: query.q } }] }
        : {}),
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.communityPost.findMany({
        where,
        include: {
          author: { select: { nickname: true } },
          _count: { select: { reports: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.communityPost.count({ where }),
    ])
    return {
      items: items.map((post) => ({
        id: post.id,
        scope: 'community' as const,
        title: post.title,
        excerpt: excerpt(post.body),
        status: post.status as ModerationPostItem['status'],
        hasImage: Boolean(post.imageData),
        commentCount: post.commentCount,
        reportCount: post._count.reports,
        authorNickname: post.author.nickname,
        clubName: null,
        createdAt: post.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
      hasNext: query.page * query.pageSize < total,
    }
  }

  private async listClubPosts(
    query: ModerationPostQueryDto,
  ): Promise<Paginated<ModerationPostItem>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? { OR: [{ title: { contains: query.q } }, { body: { contains: query.q } }] }
        : {}),
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.clubPost.findMany({
        where,
        include: {
          author: { select: { nickname: true } },
          club: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.clubPost.count({ where }),
    ])
    return {
      items: items.map((post) => ({
        id: post.id,
        scope: 'club' as const,
        title: post.title,
        excerpt: excerpt(post.body),
        status: post.status as ModerationPostItem['status'],
        hasImage: Boolean(post.imageData),
        commentCount: post.commentCount,
        reportCount: 0,
        authorNickname: post.author.nickname,
        clubName: post.club.name,
        createdAt: post.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
      hasNext: query.page * query.pageSize < total,
    }
  }
}

@Module({ controllers: [ModerationController] })
export class ModerationModule {}

function assertAdmin(me: JwtUserPayload) {
  if (me.role !== 'admin')
    throw new ForbiddenException({ code: 'admin_only', message: '관리자 전용' })
}

function excerpt(body: string, max = 120): string {
  const trimmed = body.trim().replace(/\s+/g, ' ')
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed
}

/** 액션 → 상태 전이. 복구는 hidden/removed 모두 open으로 되돌린다. */
function buildModerationUpdate(
  action: ModeratePostDto['action'],
  currentStatus: string,
): { status?: string; imageData?: null } {
  switch (action) {
    case 'hide':
      if (currentStatus !== 'open')
        throw new BadRequestException({
          code: 'moderation_invalid_transition',
          message: '공개 상태의 글만 숨길 수 있어요',
        })
      return { status: 'hidden' }
    case 'restore':
      if (currentStatus === 'open')
        throw new BadRequestException({
          code: 'moderation_invalid_transition',
          message: '이미 공개 상태인 글이에요',
        })
      return { status: 'open' }
    case 'remove':
      if (currentStatus === 'removed')
        throw new BadRequestException({
          code: 'moderation_invalid_transition',
          message: '이미 삭제된 글이에요',
        })
      return { status: 'removed' }
    case 'clear-image':
      return { imageData: null }
  }
}
