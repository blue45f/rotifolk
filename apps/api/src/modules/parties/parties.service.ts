import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { CreatePartyDto, PartyQueryDto, UpdatePartyDto } from '@rotifolk/shared'
import { PrismaService } from '@/prisma/prisma.service'
import { toJsonString } from '@/common/json-utils'
import { toParticipation, toParty, toPartySummary } from './party.mapper'

@Injectable()
export class PartiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: PartyQueryDto) {
    const where: Record<string, unknown> = {}
    if (q.category) where.category = q.category
    if (q.status) where.status = q.status
    if (q.area) where.venue = { area: { contains: q.area } }
    if (q.date) {
      const d = new Date(q.date)
      const next = new Date(d)
      next.setDate(d.getDate() + 1)
      where.startAt = { gte: d, lt: next }
    }
    const skip = (q.page - 1) * q.pageSize
    const [items, total] = await Promise.all([
      this.prisma.party.findMany({
        where,
        include: { venue: true, _count: { select: { participations: true } } },
        orderBy: { startAt: 'asc' },
        skip,
        take: q.pageSize,
      }),
      this.prisma.party.count({ where }),
    ])
    return {
      items: items.map(toPartySummary),
      total,
      page: q.page,
      pageSize: q.pageSize,
      hasNext: skip + items.length < total,
    }
  }

  async getById(id: string) {
    const row = await this.prisma.party.findUnique({
      where: { id },
      include: {
        host: { include: { avatar: true } },
        venue: true,
        _count: { select: { participations: true } },
      },
    })
    if (!row) throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    const participations = await this.prisma.participation.findMany({
      where: { partyId: id, status: { in: ['confirmed', 'checked-in'] } },
      include: { user: { include: { avatar: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return {
      party: toParty(row),
      participants: participations.map(toParticipation),
    }
  }

  async create(hostId: string, dto: CreatePartyDto) {
    const host = await this.prisma.user.findUnique({ where: { id: hostId } })
    if (!host) throw new ForbiddenException({ code: 'forbidden', message: '권한이 없어요' })

    if (host.role === 'participant') {
      await this.prisma.user.update({ where: { id: hostId }, data: { role: 'host' } })
    }

    const start = new Date(dto.startAt)
    const end = new Date(dto.endAt)
    if (end <= start) throw new BadRequestException({ code: 'invalid_time', message: '종료가 시작보다 빨라요' })
    if (dto.maxParticipants < dto.minParticipants)
      throw new BadRequestException({ code: 'invalid_capacity', message: '최대 인원 ≥ 최소 인원이어야 해요' })

    const created = await this.prisma.party.create({
      data: {
        title: dto.title,
        description: dto.description,
        hostId,
        venueId: dto.venueId,
        coverImageUrl: dto.coverImageUrl ?? null,
        startAt: start,
        endAt: end,
        minParticipants: dto.minParticipants,
        maxParticipants: dto.maxParticipants,
        category: dto.config.category,
        rotationMode: dto.config.rotationMode,
        roundDurationSec: dto.config.roundDurationSec,
        totalRounds: dto.config.totalRounds,
        breakBetweenRoundsSec: dto.config.breakBetweenRoundsSec,
        enableMidMatching: dto.config.enableMidMatching,
        enableFinalMatching: dto.config.enableFinalMatching,
        enableQuiz: dto.config.enableQuiz,
        enableQuestionCards: dto.config.enableQuestionCards,
        enableLiveOrders: dto.config.enableLiveOrders,
        enableAvatarOnly: dto.config.enableAvatarOnly,
        basePriceKRW: dto.pricing.basePriceKRW,
        drinkPackage: dto.pricing.drinkPackage,
        snackPackage: dto.pricing.snackPackage,
        refundDeadlineHours: dto.pricing.refundDeadlineHours,
        tagsJson: toJsonString(dto.tags),
        ageMin: dto.ageMin ?? null,
        ageMax: dto.ageMax ?? null,
        genderRatio: dto.genderRatio ?? null,
      },
      include: { venue: true, host: { include: { avatar: true } } },
    })
    return toParty(created)
  }

  async update(hostId: string, id: string, dto: UpdatePartyDto) {
    const existing = await this.prisma.party.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (existing.hostId !== hostId) throw new ForbiddenException({ code: 'forbidden', message: '본인이 호스트인 파티만 수정할 수 있어요' })

    const data: Record<string, unknown> = {}
    if (dto.title) data.title = dto.title
    if (dto.description) data.description = dto.description
    if (dto.coverImageUrl !== undefined) data.coverImageUrl = dto.coverImageUrl ?? null
    if (dto.startAt) data.startAt = new Date(dto.startAt)
    if (dto.endAt) data.endAt = new Date(dto.endAt)
    if (dto.minParticipants) data.minParticipants = dto.minParticipants
    if (dto.maxParticipants) data.maxParticipants = dto.maxParticipants
    if (dto.venueId) data.venueId = dto.venueId
    if (dto.tags) data.tagsJson = toJsonString(dto.tags)
    if (dto.config) {
      Object.assign(data, {
        category: dto.config.category,
        rotationMode: dto.config.rotationMode,
        roundDurationSec: dto.config.roundDurationSec,
        totalRounds: dto.config.totalRounds,
        breakBetweenRoundsSec: dto.config.breakBetweenRoundsSec,
        enableMidMatching: dto.config.enableMidMatching,
        enableFinalMatching: dto.config.enableFinalMatching,
        enableQuiz: dto.config.enableQuiz,
        enableQuestionCards: dto.config.enableQuestionCards,
        enableLiveOrders: dto.config.enableLiveOrders,
        enableAvatarOnly: dto.config.enableAvatarOnly,
      })
    }
    if (dto.pricing) {
      Object.assign(data, {
        basePriceKRW: dto.pricing.basePriceKRW,
        drinkPackage: dto.pricing.drinkPackage,
        snackPackage: dto.pricing.snackPackage,
        refundDeadlineHours: dto.pricing.refundDeadlineHours,
      })
    }
    const updated = await this.prisma.party.update({
      where: { id },
      data,
      include: { venue: true, host: { include: { avatar: true } } },
    })
    return toParty(updated)
  }

  async join(userId: string, partyId: string, note?: string | null) {
    const party = await this.prisma.party.findUnique({
      where: { id: partyId },
      include: { _count: { select: { participations: true } } },
    })
    if (!party) throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (party.status !== 'open')
      throw new BadRequestException({ code: 'party_closed', message: '신청이 마감된 파티에요' })

    const existing = await this.prisma.participation.findUnique({
      where: { partyId_userId: { partyId, userId } },
    })
    if (existing) {
      if (existing.status === 'cancelled') {
        const updated = await this.prisma.participation.update({
          where: { id: existing.id },
          data: { status: 'confirmed', note: note ?? null },
        })
        await this.prisma.user.update({ where: { id: userId }, data: { joinedCount: { increment: 1 } } })
        return toParticipation(updated)
      }
      throw new BadRequestException({ code: 'already_joined', message: '이미 신청한 파티에요' })
    }

    const isFull = party._count.participations >= party.maxParticipants
    const status = isFull ? 'waitlist' : 'confirmed'

    const created = await this.prisma.participation.create({
      data: { partyId, userId, status, note: note ?? null },
      include: { user: { include: { avatar: true } } },
    })

    if (status === 'confirmed') {
      await this.prisma.user.update({ where: { id: userId }, data: { joinedCount: { increment: 1 } } })
      const newCount = party._count.participations + 1
      if (newCount >= party.maxParticipants) {
        await this.prisma.party.update({ where: { id: partyId }, data: { status: 'full' } })
      }
    }

    return toParticipation(created)
  }

  async cancel(userId: string, partyId: string) {
    const p = await this.prisma.participation.findUnique({
      where: { partyId_userId: { partyId, userId } },
    })
    if (!p) throw new NotFoundException({ code: 'not_joined', message: '참여 기록이 없어요' })
    if (p.status === 'cancelled') return { ok: true }

    await this.prisma.participation.update({
      where: { id: p.id },
      data: { status: 'cancelled' },
    })

    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (party?.status === 'full') {
      await this.prisma.party.update({ where: { id: partyId }, data: { status: 'open' } })
    }
    return { ok: true }
  }

  async checkIn(hostId: string, partyId: string, userId: string, seatNumber?: number) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party || party.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트만 체크인할 수 있어요' })

    const updated = await this.prisma.participation.update({
      where: { partyId_userId: { partyId, userId } },
      data: { status: 'checked-in', checkedInAt: new Date(), seatNumber: seatNumber ?? null },
      include: { user: { include: { avatar: true } } },
    })
    return toParticipation(updated)
  }

  async myParties(userId: string) {
    const participations = await this.prisma.participation.findMany({
      where: { userId, status: { not: 'cancelled' } },
      include: {
        party: { include: { venue: true, _count: { select: { participations: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return participations.map((p) => ({
      participation: { id: p.id, status: p.status },
      party: toPartySummary(p.party as never),
    }))
  }

  async hostedParties(hostId: string) {
    const items = await this.prisma.party.findMany({
      where: { hostId },
      include: { venue: true, _count: { select: { participations: true } } },
      orderBy: { startAt: 'desc' },
    })
    return items.map(toPartySummary)
  }

  async lock(hostId: string, partyId: string) {
    const p = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!p || p.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트 권한이 필요해요' })
    return this.prisma.party.update({ where: { id: partyId }, data: { status: 'locked' } })
  }

  async start(hostId: string, partyId: string) {
    const p = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!p || p.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트 권한이 필요해요' })
    return this.prisma.party.update({ where: { id: partyId }, data: { status: 'live' } })
  }

  async end(hostId: string, partyId: string) {
    const p = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!p || p.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트 권한이 필요해요' })
    return this.prisma.party.update({ where: { id: partyId }, data: { status: 'ended' } })
  }
}
