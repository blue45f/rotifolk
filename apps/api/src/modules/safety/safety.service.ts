import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { CreateReportDto, UpdateReportStatusDto } from '@rotifolk/shared'
import { PrismaService } from '@/prisma/prisma.service'
import { parseJsonArray, toJsonString } from '@/common/json-utils'
import { NotificationsEmitter } from '../notifications/notifications.emitter'

@Injectable()
export class SafetyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifEmitter: NotificationsEmitter,
  ) {}

  /** 차단 (양방향 회피 — 같은 모임에 함께 못 들어감) */
  async block(blockerId: string, blockedId: string, reason?: string) {
    if (blockerId === blockedId)
      throw new BadRequestException({
        code: 'cannot_block_self',
        message: '본인은 차단할 수 없어요',
      })
    return this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId, reason: reason ?? null },
      update: { reason: reason ?? null },
    })
  }

  async unblock(blockerId: string, blockedId: string) {
    await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    })
    return { ok: true }
  }

  async listMyBlocks(blockerId: string) {
    return this.prisma.userBlock.findMany({
      where: { blockerId },
      include: { blocked: { select: { id: true, nickname: true, avatarId: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 사용자가 파티에 참여하려고 할 때 차단 충돌 검사.
   * 본인이 차단한 사람 OR 본인을 차단한 사람이 이미 참여 중이면 충돌.
   */
  async checkBlockConflict(userId: string, partyId: string) {
    const participants = await this.prisma.participation.findMany({
      where: { partyId, status: { not: 'cancelled' } },
      select: { userId: true },
    })
    const ids = participants.map((p) => p.userId)
    if (ids.length === 0) return { conflict: false as const, with: [] as string[] }

    const blocks = await this.prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: userId, blockedId: { in: ids } },
          { blockedId: userId, blockerId: { in: ids } },
        ],
      },
      include: {
        blocker: { select: { id: true, nickname: true } },
        blocked: { select: { id: true, nickname: true } },
      },
    })
    const otherIds = new Set<string>()
    for (const b of blocks) {
      if (b.blockerId === userId) otherIds.add(b.blockedId)
      else otherIds.add(b.blockerId)
    }
    return {
      conflict: otherIds.size > 0,
      with: [...otherIds],
      detail: blocks.map((b) => ({
        otherUserId: b.blockerId === userId ? b.blockedId : b.blockerId,
        nickname: b.blockerId === userId ? b.blocked.nickname : b.blocker.nickname,
        direction: b.blockerId === userId ? 'i-blocked' : 'they-blocked',
      })),
    }
  }

  // ============ Reviews ============
  async createReview(input: {
    fromUserId: string
    partyId?: string
    targetUserId?: string
    rating: number
    body: string
    anonymous?: boolean
    tags?: string[]
  }) {
    if (input.rating < 1 || input.rating > 5)
      throw new BadRequestException({ code: 'invalid_rating', message: '별점은 1~5 사이' })
    const review = await this.prisma.review.create({
      data: {
        fromUserId: input.fromUserId,
        partyId: input.partyId ?? null,
        targetUserId: input.targetUserId ?? null,
        rating: input.rating,
        body: input.body,
        anonymous: input.anonymous ?? false,
        tagsJson: toJsonString(input.tags ?? []),
      },
    })
    if (input.targetUserId) {
      const title = `별점 ${'★'.repeat(input.rating)} 후기가 달렸어요`
      const body = input.body.slice(0, 60) + (input.body.length > 60 ? '…' : '')
      await this.prisma.notification
        .create({
          data: {
            userId: input.targetUserId,
            kind: 'host_review',
            title,
            body,
            link: `/hosts/${input.targetUserId}`,
          },
        })
        .catch(() => undefined)
      this.notifEmitter.toUser(input.targetUserId, {
        kind: 'host_review',
        title,
        body,
        link: `/hosts/${input.targetUserId}`,
      })
    }
    return review
  }

  async listReviewsForParty(partyId: string) {
    const items = await this.prisma.review.findMany({
      where: { partyId },
      include: { fromUser: { select: { nickname: true, avatarId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return items.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      anonymous: r.anonymous,
      tags: parseJsonArray<string>(r.tagsJson),
      author: r.anonymous ? { nickname: '익명', avatarId: null } : r.fromUser,
      hostReply: r.hostReply,
      hostRepliedAt: r.hostRepliedAt ? r.hostRepliedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }))
  }

  async listReviewsForHost(hostUserId: string) {
    const items = await this.prisma.review.findMany({
      where: { targetUserId: hostUserId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const avg = items.length === 0 ? 0 : items.reduce((s, r) => s + r.rating, 0) / items.length
    return {
      averageRating: Math.round(avg * 10) / 10,
      count: items.length,
      reviews: items.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        anonymous: r.anonymous,
        tags: parseJsonArray<string>(r.tagsJson),
        hostReply: r.hostReply,
        hostRepliedAt: r.hostRepliedAt ? r.hostRepliedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
    }
  }

  async addHostReply(hostUserId: string, reviewId: string, reply: string) {
    const trimmed = reply?.trim() ?? ''
    if (!trimmed)
      throw new BadRequestException({ code: 'empty_reply', message: '답글 내용을 입력해주세요' })
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } })
    if (!review)
      throw new NotFoundException({ code: 'review_not_found', message: '후기를 찾을 수 없어요' })
    if (review.targetUserId !== hostUserId)
      throw new ForbiddenException({ code: 'not_host', message: '호스트만 답글을 남길 수 있어요' })
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { hostReply: trimmed, hostRepliedAt: new Date() },
    })
  }

  // ============ Reports ============
  async report(
    input: {
      reporterId: string
    } & CreateReportDto,
  ) {
    const [post, comment] = await Promise.all([
      input.communityPostId
        ? this.prisma.communityPost.findFirst({
            where: { id: input.communityPostId, status: 'open' },
            select: { id: true, authorId: true },
          })
        : Promise.resolve(null),
      input.communityCommentId
        ? this.prisma.communityComment.findFirst({
            where: { id: input.communityCommentId, status: 'visible' },
            select: { id: true, postId: true, authorId: true },
          })
        : Promise.resolve(null),
    ])

    if (input.communityPostId && !post) {
      throw new BadRequestException({
        code: 'community_post_not_found',
        message: '신고할 커뮤니티 글을 찾을 수 없어요',
      })
    }
    if (input.communityCommentId && !comment) {
      throw new BadRequestException({
        code: 'community_comment_not_found',
        message: '신고할 댓글을 찾을 수 없어요',
      })
    }
    if (post && comment && comment.postId !== post.id) {
      throw new BadRequestException({
        code: 'report_target_mismatch',
        message: '같은 글의 댓글만 함께 신고할 수 있어요',
      })
    }

    const targetUserId = input.targetUserId ?? comment?.authorId ?? post?.authorId ?? null
    if (targetUserId === input.reporterId) {
      throw new BadRequestException({
        code: 'cannot_report_self_content',
        message: '본인이 작성한 콘텐츠는 신고할 수 없어요',
      })
    }

    return this.prisma.report.create({
      data: {
        reporterId: input.reporterId,
        targetUserId,
        partyId: input.partyId ?? null,
        communityPostId: input.communityPostId ?? comment?.postId ?? null,
        communityCommentId: input.communityCommentId ?? null,
        kind: input.kind,
        body: input.body,
      },
    })
  }

  private async hideReportedContent(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { communityPostId: true, communityCommentId: true },
    })
    if (!report) {
      throw new NotFoundException({ code: 'report_not_found', message: '신고를 찾을 수 없어요' })
    }
    if (report.communityCommentId) {
      await this.prisma.communityComment.update({
        where: { id: report.communityCommentId },
        data: { status: 'hidden' },
      })
    }
    if (report.communityPostId && !report.communityCommentId) {
      await this.prisma.communityPost.update({
        where: { id: report.communityPostId },
        data: { status: 'hidden' },
      })
    }
  }

  // ============ Admin ============
  async listReports(status?: 'open' | 'reviewing' | 'resolved' | 'dismissed') {
    const items = await this.prisma.report.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: { select: { id: true, nickname: true } },
        targetUser: { select: { id: true, nickname: true } },
        party: { select: { id: true, title: true } },
        communityPost: { select: { id: true, title: true } },
        communityComment: { select: { id: true, postId: true, body: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return items.map((r) => ({
      id: r.id,
      kind: r.kind,
      body: r.body,
      status: r.status,
      reporter: r.reporter,
      target: r.targetUser,
      party: r.party,
      communityPost: r.communityPost,
      communityComment: r.communityComment
        ? {
            id: r.communityComment.id,
            postId: r.communityComment.postId,
            body:
              r.communityComment.body.length > 90
                ? `${r.communityComment.body.slice(0, 90)}...`
                : r.communityComment.body,
          }
        : null,
      createdAt: r.createdAt.toISOString(),
    }))
  }

  async listRecentReviews(take = 6) {
    const items = await this.prisma.review.findMany({
      where: { rating: { gte: 4 }, body: { not: '' } },
      include: {
        fromUser: { select: { nickname: true } },
        party: { select: { title: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    })
    return items.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      partyTitle: r.party?.title ?? '이전 모임',
      category: r.party?.category ?? 'wine',
      reviewer: r.anonymous ? '익명 참가자' : (r.fromUser?.nickname ?? '익명'),
      createdAt: r.createdAt.toISOString(),
    }))
  }

  async resolveReport(adminId: string, reportId: string, input: UpdateReportStatusDto) {
    if (input.hideContent) {
      await this.hideReportedContent(reportId)
    }
    return this.prisma.report.update({
      where: { id: reportId },
      data: { status: input.status, resolvedById: adminId, resolvedNote: input.note ?? null },
    })
  }
}
