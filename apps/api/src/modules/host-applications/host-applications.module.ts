import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@/prisma/prisma.service'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'

interface CreateBody {
  introduction: string
  hostingStyle: string
  plannedCategories: string[]
  experience?: string
}

interface ReviewBody {
  status: 'approved' | 'rejected'
  reviewedNote?: string
}

const ALLOWED_STYLES = ['차분', '따뜻', '진지', '발랄']

@Controller('host-applications')
class HostApplicationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@CurrentUser() me: JwtUserPayload, @Body() body: CreateBody) {
    const introduction = (body?.introduction ?? '').trim()
    const hostingStyle = (body?.hostingStyle ?? '').trim()
    const plannedCategories = Array.isArray(body?.plannedCategories)
      ? body.plannedCategories.filter((c) => typeof c === 'string' && c.length > 0)
      : []
    const experience = body?.experience?.trim() || null

    if (introduction.length < 50) {
      throw new BadRequestException({
        code: 'introduction_too_short',
        message: '소개는 50자 이상 작성해 주세요.',
      })
    }
    if (!ALLOWED_STYLES.includes(hostingStyle)) {
      throw new BadRequestException({
        code: 'invalid_hosting_style',
        message: '진행 스타일을 선택해 주세요.',
      })
    }
    if (plannedCategories.length === 0) {
      throw new BadRequestException({
        code: 'categories_required',
        message: '진행하고 싶은 카테고리를 하나 이상 선택해 주세요.',
      })
    }

    const application = await this.prisma.hostApplication.create({
      data: {
        userId: me.sub,
        introduction,
        hostingStyle,
        plannedCategories: JSON.stringify(plannedCategories),
        experience,
        status: 'pending',
      },
    })
    return this.shape(application)
  }

  @Get('mine')
  @UseGuards(AuthGuard('jwt'))
  async mine(@CurrentUser() me: JwtUserPayload) {
    const application = await this.prisma.hostApplication.findFirst({
      where: { userId: me.sub },
      orderBy: { createdAt: 'desc' },
    })
    return application ? this.shape(application) : null
  }

  @Get('admin')
  @UseGuards(AuthGuard('jwt'))
  async adminList(
    @CurrentUser() me: JwtUserPayload,
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ) {
    if (me.role !== 'admin') {
      throw new ForbiddenException({ code: 'admin_only', message: '관리자 전용' })
    }
    const items = await this.prisma.hostApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nickname: true, email: true, role: true } },
      },
      take: 200,
    })
    return items.map((a) => ({
      ...this.shape(a),
      user: a.user,
    }))
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async review(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') id: string,
    @Body() body: ReviewBody,
  ) {
    if (me.role !== 'admin') {
      throw new ForbiddenException({ code: 'admin_only', message: '관리자 전용' })
    }
    if (body?.status !== 'approved' && body?.status !== 'rejected') {
      throw new BadRequestException({
        code: 'invalid_status',
        message: '검토 상태가 올바르지 않습니다.',
      })
    }

    const existing = await this.prisma.hostApplication.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException({
        code: 'application_not_found',
        message: '신청을 찾을 수 없습니다.',
      })
    }

    const updated = await this.prisma.hostApplication.update({
      where: { id },
      data: {
        status: body.status,
        reviewedById: me.sub,
        reviewedNote: body.reviewedNote?.trim() || null,
      },
    })

    if (body.status === 'approved') {
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: { role: 'host', isVerified: true },
      })
    }

    return this.shape(updated)
  }

  private shape(a: {
    id: string
    userId: string
    introduction: string
    hostingStyle: string
    plannedCategories: string
    experience: string | null
    status: string
    reviewedById: string | null
    reviewedNote: string | null
    createdAt: Date
    updatedAt: Date
  }) {
    let plannedCategories: string[] = []
    try {
      const parsed = JSON.parse(a.plannedCategories)
      if (Array.isArray(parsed)) plannedCategories = parsed.filter((c) => typeof c === 'string')
    } catch {
      plannedCategories = []
    }
    return {
      id: a.id,
      userId: a.userId,
      introduction: a.introduction,
      hostingStyle: a.hostingStyle,
      plannedCategories,
      experience: a.experience,
      status: a.status as 'pending' | 'approved' | 'rejected',
      reviewedById: a.reviewedById,
      reviewedNote: a.reviewedNote,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }
  }
}

@Module({ controllers: [HostApplicationsController] })
export class HostApplicationsModule {}
