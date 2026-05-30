import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  CreateVenueBookingDto,
  PartyCategory,
  VenueBooking,
  VenueBookingStatus,
} from '@rotifolk/shared'
import { quoteVenueBooking } from '@rotifolk/shared'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { parseJsonArray, parseJsonObject } from '@/common/json-utils'

type BookingRow = Prisma.VenueBookingGetPayload<{
  include: { venue: true; requester: true }
}>

const BLOCKING_STATUSES: VenueBookingStatus[] = ['confirmed']

@Injectable()
export class VenueBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(requesterId: string, dto: CreateVenueBookingDto): Promise<VenueBooking> {
    const venue = await this.prisma.venue.findUnique({ where: { id: dto.venueId } })
    if (!venue)
      throw new NotFoundException({ code: 'venue_not_found', message: '장소를 찾을 수 없어요' })

    const start = new Date(dto.startAt)
    const end = new Date(dto.endAt)

    const quote = quoteVenueBooking(venue, start, end)
    const instant = venue.instantBook

    // 충돌 검사와 생성을 한 트랜잭션으로 묶어 동시 즉시예약이 같은 시간대를 중복 확정하지 못하게 함.
    const created = await this.prisma.$transaction(async (tx) => {
      const bookingConflict = await tx.venueBooking.findFirst({
        where: {
          venueId: venue.id,
          status: { in: BLOCKING_STATUSES },
          startAt: { lt: end },
          endAt: { gt: start },
        },
        select: { id: true },
      })
      if (bookingConflict)
        throw new BadRequestException({ code: 'slot_taken', message: '이미 확정된 예약과 겹쳐요' })

      const partyConflict = await tx.party.findFirst({
        where: {
          venueId: venue.id,
          status: { notIn: ['cancelled', 'ended'] },
          startAt: { lt: end },
          endAt: { gt: start },
        },
        select: { id: true },
      })
      if (partyConflict)
        throw new BadRequestException({
          code: 'slot_taken',
          message: '해당 시간에 다른 파티가 있어요',
        })

      return tx.venueBooking.create({
        data: {
          venueId: venue.id,
          requesterId,
          ownerId: venue.ownerId,
          startAt: start,
          endAt: end,
          partySize: dto.partySize,
          category: dto.category,
          noteToOwner: dto.noteToOwner ?? null,
          status: instant ? 'confirmed' : 'requested',
          hours: quote.hours,
          baseKRW: quote.baseKRW,
          multiplier: quote.multiplier,
          discountKRW: quote.discountKRW,
          cleaningFeeKRW: quote.cleaningFeeKRW,
          totalKRW: quote.totalKRW,
          decidedAt: instant ? new Date() : null,
        },
        include: { venue: true, requester: true },
      })
    })

    if (venue.ownerId && !instant) {
      await this.notify(
        venue.ownerId,
        '새 섭외 요청이 도착했어요',
        `${venue.name} · ${quote.hours}시간`,
      )
    }
    return this.toBooking(created)
  }

  async mine(userId: string, role: 'requester' | 'owner'): Promise<VenueBooking[]> {
    const where = role === 'owner' ? { ownerId: userId } : { requesterId: userId }
    const rows = await this.prisma.venueBooking.findMany({
      where,
      include: { venue: true, requester: true },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => this.toBooking(r))
  }

  async getOne(userId: string, id: string): Promise<VenueBooking> {
    const row = await this.prisma.venueBooking.findUnique({
      where: { id },
      include: { venue: true, requester: true },
    })
    if (!row) throw new NotFoundException()
    if (row.requesterId !== userId && row.ownerId !== userId) throw new ForbiddenException()
    return this.toBooking(row)
  }

  async decide(
    ownerId: string,
    id: string,
    status: 'confirmed' | 'declined',
    message?: string,
  ): Promise<VenueBooking> {
    const row = await this.prisma.venueBooking.findUnique({
      where: { id },
      include: { venue: true },
    })
    if (!row) throw new NotFoundException()
    if (row.ownerId !== ownerId)
      throw new ForbiddenException({ message: '내 공간의 요청만 처리할 수 있어요' })
    if (row.status !== 'requested')
      throw new BadRequestException({ message: '이미 처리된 요청이에요' })

    // 충돌 재검사와 확정 갱신을 한 트랜잭션으로 묶어 겹치는 두 요청이 동시에 확정되지 않게 함.
    const updated = await this.prisma.$transaction(async (tx) => {
      if (status === 'confirmed') {
        const conflict = await tx.venueBooking.findFirst({
          where: {
            venueId: row.venueId,
            status: { in: BLOCKING_STATUSES },
            startAt: { lt: row.endAt },
            endAt: { gt: row.startAt },
            id: { not: row.id },
          },
          select: { id: true },
        })
        if (conflict)
          throw new BadRequestException({ message: '이미 다른 예약이 확정된 시간이에요' })
      }
      return tx.venueBooking.update({
        where: { id },
        data: { status, ownerMessage: message ?? null, decidedAt: new Date() },
        include: { venue: true, requester: true },
      })
    })
    await this.notify(
      row.requesterId,
      status === 'confirmed' ? '섭외가 확정됐어요 🎉' : '섭외 요청이 거절됐어요',
      `${row.venue.name}${message ? ` · ${message}` : ''}`,
    )
    return this.toBooking(updated)
  }

  async cancel(requesterId: string, id: string): Promise<VenueBooking> {
    const row = await this.prisma.venueBooking.findUnique({
      where: { id },
      include: { venue: true, requester: true },
    })
    if (!row) throw new NotFoundException()
    if (row.requesterId !== requesterId) throw new ForbiddenException()
    if (!['requested', 'confirmed'].includes(row.status))
      throw new BadRequestException({ message: '취소할 수 없는 상태예요' })
    const updated = await this.prisma.venueBooking.update({
      where: { id },
      data: { status: 'cancelled', decidedAt: new Date() },
      include: { venue: true, requester: true },
    })
    if (row.ownerId) await this.notify(row.ownerId, '섭외가 취소됐어요', row.venue.name)
    return this.toBooking(updated)
  }

  async link(requesterId: string, id: string, partyId: string): Promise<VenueBooking> {
    const row = await this.prisma.venueBooking.findUnique({ where: { id } })
    if (!row) throw new NotFoundException()
    if (row.requesterId !== requesterId) throw new ForbiddenException()
    if (row.status !== 'confirmed')
      throw new BadRequestException({ message: '확정된 섭외만 파티와 연결할 수 있어요' })
    const updated = await this.prisma.venueBooking.update({
      where: { id },
      data: { partyId },
      include: { venue: true, requester: true },
    })
    return this.toBooking(updated)
  }

  private async notify(userId: string, title: string, body: string) {
    await this.prisma.notification.create({
      data: { userId, kind: 'venue_booking', title, body, link: '/host/sourcing' },
    })
  }

  private toBooking(row: BookingRow): VenueBooking {
    const photos = parseJsonArray<string>(row.venue?.photosJson)
    const confirmed = row.status === 'confirmed'
    return {
      id: row.id,
      venueId: row.venueId,
      venueName: row.venue?.name,
      venueArea: row.venue?.area,
      venuePhoto: photos[0] ?? null,
      requesterId: row.requesterId,
      requesterNickname: row.requester?.nickname,
      ownerId: row.ownerId,
      partyId: row.partyId,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      partySize: row.partySize,
      category: row.category as PartyCategory,
      noteToOwner: row.noteToOwner,
      status: row.status as VenueBookingStatus,
      hours: row.hours,
      baseKRW: row.baseKRW,
      multiplier: row.multiplier,
      discountKRW: row.discountKRW,
      cleaningFeeKRW: row.cleaningFeeKRW,
      totalKRW: row.totalKRW,
      ownerMessage: row.ownerMessage,
      decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
      arrivalGuide: confirmed && row.venue ? parseJsonObject(row.venue.arrivalGuideJson) : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }
}
