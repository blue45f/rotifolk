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
  ClubPostQuerySchema,
  ClubQuerySchema,
  CreateClubCommentSchema,
  CreateClubPostSchema,
  CreateClubSchema,
} from '@rotifolk/shared'

import { threadCommentsWithPlaceholders } from '../community/community.module'

import type {
  ClubComment,
  ClubDetail,
  ClubPost,
  ClubPostDetail,
  ClubPostQueryDto,
  ClubQueryDto,
  ClubSummary,
  CreateClubCommentDto,
  CreateClubDto,
  CreateClubPostDto,
  Paginated,
} from '@rotifolk/shared'

import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { OptionalJwtGuard } from '@/common/optional-jwt.guard'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { PrismaService } from '@/prisma/prisma.service'

const AUTHOR_SELECT = {
  select: { id: true, nickname: true, avatarId: true, role: true, isVerified: true },
} as const

@Controller()
class ClubsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('clubs')
  @UseGuards(OptionalJwtGuard)
  async listClubs(
    @CurrentUser() me: JwtUserPayload | null,
    @Query(new ZodValidationPipe(ClubQuerySchema)) query: ClubQueryDto
  ): Promise<Paginated<ClubSummary>> {
    const where = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.q
        ? { OR: [{ name: { contains: query.q } }, { description: { contains: query.q } }] }
        : {}),
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.club.findMany({
        where,
        include: {
          owner: AUTHOR_SELECT,
          _count: {
            select: { members: true, posts: { where: { status: 'open' } } },
          },
        },
        orderBy: [{ members: { _count: 'desc' } }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.club.count({ where }),
    ])
    const myMemberships = me
      ? await this.prisma.clubMember.findMany({
          where: { userId: me.sub, clubId: { in: items.map((club) => club.id) } },
          select: { clubId: true, role: true },
        })
      : []
    const roleByClub = new Map(myMemberships.map((m) => [m.clubId, m.role]))

    return {
      items: items.map((club) => mapClubSummary(club, roleByClub.get(club.id) ?? null)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      hasNext: query.page * query.pageSize < total,
    }
  }

  @Post('clubs')
  @UseGuards(AuthGuard('jwt'))
  async createClub(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(CreateClubSchema)) dto: CreateClubDto
  ): Promise<ClubSummary> {
    const club = await this.prisma.club.create({
      data: {
        ownerId: me.sub,
        name: dto.name,
        category: dto.category,
        description: dto.description,
        visibility: dto.visibility,
        members: { create: { userId: me.sub, role: 'owner' } },
      },
      include: {
        owner: AUTHOR_SELECT,
        _count: { select: { members: true, posts: { where: { status: 'open' } } } },
      },
    })
    return mapClubSummary(club, 'owner')
  }

  @Get('clubs/:clubId')
  @UseGuards(OptionalJwtGuard)
  async getClub(
    @CurrentUser() me: JwtUserPayload | null,
    @Param('clubId') clubId: string
  ): Promise<ClubDetail> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        owner: AUTHOR_SELECT,
        members: {
          include: { user: { select: { id: true, nickname: true, avatarId: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { members: true, posts: { where: { status: 'open' } } } },
      },
    })
    if (!club)
      throw new BadRequestException({ code: 'club_not_found', message: '클럽을 찾을 수 없어요' })

    const myRole = (club.members.find((m) => m.userId === me?.sub)?.role ?? null) as
      | 'owner'
      | 'member'
      | null
    const isMember = myRole !== null
    const canViewBoard = club.visibility === 'public' || isMember
    return {
      ...mapClubSummary(club, myRole),
      // 비공개 클럽 명단은 멤버에게만(가입 유도를 위해 인원수는 공개).
      members:
        club.visibility === 'public' || isMember
          ? club.members.map((m) => ({
              userId: m.userId,
              nickname: m.user.nickname,
              avatarId: m.user.avatarId,
              role: m.role as 'owner' | 'member',
              joinedAt: m.createdAt.toISOString(),
            }))
          : [],
      canViewBoard,
    }
  }

  @Post('clubs/:clubId/join')
  @UseGuards(AuthGuard('jwt'))
  async joinClub(@CurrentUser() me: JwtUserPayload, @Param('clubId') clubId: string) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId }, select: { id: true } })
    if (!club)
      throw new BadRequestException({ code: 'club_not_found', message: '클럽을 찾을 수 없어요' })
    await this.prisma.clubMember.upsert({
      where: { clubId_userId: { clubId, userId: me.sub } },
      create: { clubId, userId: me.sub, role: 'member' },
      update: {},
    })
    return { ok: true }
  }

  @Delete('clubs/:clubId/join')
  @UseGuards(AuthGuard('jwt'))
  async leaveClub(@CurrentUser() me: JwtUserPayload, @Param('clubId') clubId: string) {
    const membership = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId: me.sub } },
    })
    if (!membership)
      throw new BadRequestException({ code: 'club_not_member', message: '가입한 클럽이 아니에요' })
    if (membership.role === 'owner')
      throw new ForbiddenException({
        code: 'club_owner_cannot_leave',
        message: '운영자는 클럽을 떠날 수 없어요',
      })
    await this.prisma.clubMember.delete({ where: { id: membership.id } })
    return { ok: true }
  }

  @Get('clubs/:clubId/posts')
  @UseGuards(OptionalJwtGuard)
  async listClubPosts(
    @CurrentUser() me: JwtUserPayload | null,
    @Param('clubId') clubId: string,
    @Query(new ZodValidationPipe(ClubPostQuerySchema)) query: ClubPostQueryDto
  ): Promise<Paginated<ClubPost>> {
    await this.assertBoardReadable(clubId, me)
    const where = { clubId, status: 'open' }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.clubPost.findMany({
        where,
        include: { author: AUTHOR_SELECT },
        orderBy: [{ lastCommentAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.clubPost.count({ where }),
    ])
    return {
      items: items.map(mapClubPost),
      total,
      page: query.page,
      pageSize: query.pageSize,
      hasNext: query.page * query.pageSize < total,
    }
  }

  @Post('clubs/:clubId/posts')
  @UseGuards(AuthGuard('jwt'))
  async createClubPost(
    @CurrentUser() me: JwtUserPayload,
    @Param('clubId') clubId: string,
    @Body(new ZodValidationPipe(CreateClubPostSchema)) dto: CreateClubPostDto
  ): Promise<ClubPost> {
    await this.assertMember(clubId, me.sub, '클럽에 가입해야 글을 쓸 수 있어요')
    const post = await this.prisma.clubPost.create({
      data: {
        clubId,
        authorId: me.sub,
        title: dto.title,
        body: dto.body,
        imageData: dto.imageData ?? null,
      },
      include: { author: AUTHOR_SELECT },
    })
    return mapClubPost(post)
  }

  @Get('clubs/:clubId/posts/:postId')
  @UseGuards(OptionalJwtGuard)
  async getClubPost(
    @CurrentUser() me: JwtUserPayload | null,
    @Param('clubId') clubId: string,
    @Param('postId') postId: string
  ): Promise<ClubPostDetail> {
    await this.assertBoardReadable(clubId, me)
    const post = await this.prisma.clubPost.findFirst({
      where: { id: postId, clubId, status: 'open' },
      include: {
        author: AUTHOR_SELECT,
        comments: {
          where: { status: { in: ['visible', 'removed'] } },
          include: { author: AUTHOR_SELECT },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!post)
      throw new BadRequestException({
        code: 'club_post_not_found',
        message: '클럽 글을 찾을 수 없어요',
      })
    return {
      ...mapClubPost(post),
      comments: buildCommunityCommentTree(threadCommentsWithPlaceholders(post.comments)),
    }
  }

  @Delete('clubs/:clubId/posts/:postId')
  @UseGuards(AuthGuard('jwt'))
  async deleteClubPost(
    @CurrentUser() me: JwtUserPayload,
    @Param('clubId') clubId: string,
    @Param('postId') postId: string
  ) {
    const post = await this.prisma.clubPost.findFirst({
      where: { id: postId, clubId, status: 'open' },
      select: { authorId: true },
    })
    if (!post)
      throw new BadRequestException({
        code: 'club_post_not_found',
        message: '삭제할 클럽 글을 찾을 수 없어요',
      })
    if (post.authorId !== me.sub && me.role !== 'admin')
      throw new ForbiddenException({
        code: 'club_post_owner_only',
        message: '작성자만 글을 삭제할 수 있어요',
      })
    await this.prisma.clubPost.update({ where: { id: postId }, data: { status: 'removed' } })
    return { ok: true }
  }

  @Post('clubs/:clubId/posts/:postId/comments')
  @UseGuards(AuthGuard('jwt'))
  async createClubComment(
    @CurrentUser() me: JwtUserPayload,
    @Param('clubId') clubId: string,
    @Param('postId') postId: string,
    @Body(new ZodValidationPipe(CreateClubCommentSchema)) dto: CreateClubCommentDto
  ): Promise<ClubComment> {
    await this.assertMember(clubId, me.sub, '클럽에 가입해야 댓글을 쓸 수 있어요')
    const [post, parent] = await Promise.all([
      this.prisma.clubPost.findFirst({ where: { id: postId, clubId, status: 'open' } }),
      dto.parentId
        ? this.prisma.clubComment.findFirst({ where: { id: dto.parentId, status: 'visible' } })
        : Promise.resolve(null),
    ])
    if (!post)
      throw new BadRequestException({
        code: 'club_post_not_found',
        message: '답글을 남길 글을 찾을 수 없어요',
      })
    if (dto.parentId && (!parent || parent.postId !== postId))
      throw new BadRequestException({
        code: 'invalid_parent_comment',
        message: '같은 글의 댓글에만 답장할 수 있어요',
      })

    // 1단 답글 — 답글의 답글은 같은 스레드(최상위 부모)로 평탄화한다.
    const parentId = parent?.parentId ?? parent?.id ?? null
    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.clubComment.create({
        data: { postId, authorId: me.sub, parentId, body: dto.body },
        include: { author: AUTHOR_SELECT },
      })
      await tx.clubPost.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 }, lastCommentAt: created.createdAt },
      })
      return created
    })
    return mapClubComment(comment)
  }

  @Delete('clubs/:clubId/posts/:postId/comments/:commentId')
  @UseGuards(AuthGuard('jwt'))
  async deleteClubComment(
    @CurrentUser() me: JwtUserPayload,
    @Param('clubId') clubId: string,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string
  ) {
    const comment = await this.prisma.clubComment.findFirst({
      where: { id: commentId, postId, status: 'visible', post: { clubId } },
      select: { authorId: true },
    })
    if (!comment)
      throw new BadRequestException({
        code: 'club_comment_not_found',
        message: '삭제할 댓글을 찾을 수 없어요',
      })
    if (comment.authorId !== me.sub && me.role !== 'admin')
      throw new ForbiddenException({
        code: 'club_comment_owner_only',
        message: '작성자만 댓글을 삭제할 수 있어요',
      })
    // 커뮤니티와 같은 플레이스홀더 규칙 — 답글이 남아 있으면 GET이 자리만 유지한다.
    await this.prisma.$transaction([
      this.prisma.clubComment.update({ where: { id: commentId }, data: { status: 'removed' } }),
      this.prisma.clubPost.update({
        where: { id: postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ])
    return { ok: true }
  }

  /** 비공개 클럽 게시판은 멤버 전용 — 공개 클럽은 누구나 읽을 수 있다. */
  private async assertBoardReadable(clubId: string, me: JwtUserPayload | null) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { visibility: true },
    })
    if (!club)
      throw new BadRequestException({ code: 'club_not_found', message: '클럽을 찾을 수 없어요' })
    if (club.visibility === 'public') return
    if (me?.role === 'admin') return
    const membership = me
      ? await this.prisma.clubMember.findUnique({
          where: { clubId_userId: { clubId, userId: me.sub } },
          select: { id: true },
        })
      : null
    if (!membership)
      throw new ForbiddenException({
        code: 'club_members_only',
        message: '비공개 클럽 게시판은 멤버만 볼 수 있어요',
      })
  }

  private async assertMember(clubId: string, userId: string, message: string) {
    const membership = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
      select: { id: true },
    })
    if (!membership) throw new ForbiddenException({ code: 'club_members_only', message })
  }
}

@Module({ controllers: [ClubsController] })
export class ClubsModule {}

type JsonClub = {
  id: string
  name: string
  category: string
  description: string
  visibility: string
  createdAt: Date
  updatedAt: Date
  owner: {
    id: string
    nickname: string
    avatarId: string | null
    role: string
    isVerified: boolean
  }
  _count: { members: number; posts: number }
}

type JsonClubPost = {
  id: string
  clubId: string
  title: string
  body: string
  imageData: string | null
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
}

type JsonClubComment = {
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

function mapClubSummary(club: JsonClub, myRole: string | null): ClubSummary {
  return {
    id: club.id,
    name: club.name,
    category: club.category as ClubSummary['category'],
    description: club.description,
    visibility: club.visibility as ClubSummary['visibility'],
    memberCount: club._count.members,
    postCount: club._count.posts,
    owner: club.owner,
    myRole: (myRole ?? null) as ClubSummary['myRole'],
    createdAt: club.createdAt.toISOString(),
    updatedAt: club.updatedAt.toISOString(),
  }
}

function mapClubPost(post: JsonClubPost): ClubPost {
  return {
    id: post.id,
    clubId: post.clubId,
    title: post.title,
    body: post.body,
    imageData: post.imageData,
    commentCount: post.commentCount,
    lastCommentAt: post.lastCommentAt?.toISOString() ?? null,
    author: post.author,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  }
}

function mapClubComment(comment: JsonClubComment): ClubComment {
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
