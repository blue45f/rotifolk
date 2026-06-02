import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  CreateVenueDto,
  UpdateVenueDto,
  VenueSearchDto,
  VenueRecommendQueryDto,
  VenueAvailabilityQueryDto,
  Venue,
  VenueBrief,
  VenueBusyRange,
  VenueRecommendation,
  VenueAvailability,
  MenuItem,
  MenuAvailability,
} from '@rotifolk/shared'
import { recommendVenues, suggestOffHoursSlots } from '@rotifolk/shared'
import type { Prisma, Venue as PrismaVenue, MenuItem as PrismaMenuItem } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { parseJsonArray, parseJsonObject, toJsonString } from '@/common/json-utils'

export interface OwnedVenue extends Venue {
  upcomingParties: number
  pendingRequests: number
}

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: VenueSearchDto): Promise<Venue[]> {
    const where: Prisma.VenueWhereInput = {}
    if (q.kind) where.kind = q.kind
    if (q.area) where.area = { contains: q.area }
    if (q.partnered !== undefined) where.partnered = q.partnered
    if (q.minCapacity) where.capacity = { gte: q.minCapacity }
    if (q.q) where.name = { contains: q.q }

    const venues = await this.prisma.venue.findMany({
      where,
      orderBy: [{ partnered: 'desc' }, { rating: 'desc' }],
      take: 60,
    })
    return venues.map(this.toVenue)
  }

  async listAreas(): Promise<string[]> {
    const venues = await this.prisma.venue.findMany({
      where: { partnered: true },
      select: { area: true },
      orderBy: { area: 'asc' },
      take: 500,
    })
    return Array.from(new Set(venues.map((venue) => venue.area).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'ko-KR'),
    )
  }

  async getById(id: string) {
    const v = await this.prisma.venue.findUnique({
      where: { id },
      include: { menuItems: true },
    })
    if (!v)
      throw new NotFoundException({ code: 'venue_not_found', message: '장소를 찾을 수 없어요' })
    return {
      venue: this.toVenue(v),
      menu: v.menuItems.map(this.toMenuItem),
    }
  }

  async create(ownerId: string, dto: CreateVenueDto): Promise<Venue> {
    const v = await this.prisma.venue.create({
      data: { ...this.toCreateData(dto), ownerId },
    })
    return this.toVenue(v)
  }

  async update(ownerId: string, id: string, dto: UpdateVenueDto): Promise<Venue> {
    const existing = await this.prisma.venue.findUnique({ where: { id } })
    if (!existing)
      throw new NotFoundException({ code: 'venue_not_found', message: '장소를 찾을 수 없어요' })
    // 소유자 정확 일치만 허용 — ownerId가 null(플랫폼 제휴 공간)이면 일반 사용자가 수정 불가
    if (existing.ownerId !== ownerId)
      throw new ForbiddenException({ message: '내 공간만 수정할 수 있어요' })
    const updated = await this.prisma.venue.update({
      where: { id },
      data: this.toUpdateData(dto),
    })
    return this.toVenue(updated)
  }

  /** 내가 등록한 공간 + 다가오는 파티/대기 요청 수 */
  async listMine(ownerId: string): Promise<OwnedVenue[]> {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    })
    const now = new Date()
    return Promise.all(
      venues.map(async (v) => {
        const [upcomingParties, pendingRequests] = await Promise.all([
          this.prisma.party.count({
            where: {
              venueId: v.id,
              status: { notIn: ['cancelled', 'ended'] },
              startAt: { gte: now },
            },
          }),
          this.prisma.venueBooking.count({ where: { venueId: v.id, status: 'requested' } }),
        ])
        return {
          ...this.toVenue(v),
          // 소유자 본인에게는 도착 안내(arrivalGuide)를 그대로 노출(편집용)
          arrivalGuide: parseJsonObject(v.arrivalGuideJson) as Venue['arrivalGuide'],
          isMine: true,
          upcomingParties,
          pendingRequests,
        }
      }),
    )
  }

  /** 모임 브리프 기반 공간 추천 (위치/가용성/견적 포함). */
  async recommend(q: VenueRecommendQueryDto): Promise<VenueRecommendation[]> {
    if (q.startAt && q.endAt && new Date(q.endAt).getTime() <= new Date(q.startAt).getTime()) {
      throw new BadRequestException({
        code: 'invalid_time_range',
        message: '종료 시각은 시작 시각 이후여야 해요',
      })
    }

    const venues = (
      await this.prisma.venue.findMany({
        orderBy: [{ partnered: 'desc' }, { rating: 'desc' }],
        take: 80,
      })
    ).map(this.toVenue)

    let availabilityByVenue: Record<string, boolean> | undefined
    if (q.startAt && q.endAt) {
      const start = new Date(q.startAt)
      const end = new Date(q.endAt)
      const [bookings, parties] = await Promise.all([
        this.prisma.venueBooking.findMany({
          where: { status: 'confirmed', startAt: { lt: end }, endAt: { gt: start } },
          select: { venueId: true },
        }),
        this.prisma.party.findMany({
          where: {
            status: { notIn: ['cancelled', 'ended'] },
            startAt: { lt: end },
            endAt: { gt: start },
          },
          select: { venueId: true },
        }),
      ])
      const busy = new Set([...bookings, ...parties].map((b) => b.venueId))
      availabilityByVenue = Object.fromEntries(venues.map((v) => [v.id, !busy.has(v.id)]))
    }

    const brief: VenueBrief = {
      category: q.category,
      area: q.area,
      partySize: q.partySize,
      startAt: q.startAt,
      endAt: q.endAt,
      lat: q.lat ?? null,
      lng: q.lng ?? null,
      maxBudgetKRW: q.maxBudgetKRW ?? null,
    }
    return recommendVenues(venues, brief, {
      availabilityByVenue,
      viewer: { lat: q.lat ?? null, lng: q.lng ?? null },
      limit: 12,
    })
  }

  /** 공간 가용성 + 유휴시간 파티 제안 (사장님 호스팅). */
  async availability(id: string, q: VenueAvailabilityQueryDto): Promise<VenueAvailability> {
    const v = await this.prisma.venue.findUnique({ where: { id } })
    if (!v)
      throw new NotFoundException({ code: 'venue_not_found', message: '장소를 찾을 수 없어요' })
    const from = q.from ? new Date(q.from) : new Date()
    const days = q.days ?? 14
    const to = q.to ? new Date(q.to) : new Date(from.getTime() + days * 86_400_000)

    const [bookings, parties] = await Promise.all([
      this.prisma.venueBooking.findMany({
        where: { venueId: id, status: 'confirmed', startAt: { lt: to }, endAt: { gt: from } },
        select: { startAt: true, endAt: true },
      }),
      this.prisma.party.findMany({
        where: {
          venueId: id,
          status: { notIn: ['cancelled'] },
          startAt: { lt: to },
          endAt: { gt: from },
        },
        select: { title: true, startAt: true, endAt: true },
      }),
    ])
    const busy: VenueBusyRange[] = [
      ...bookings.map((b) => ({
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        label: '확정 예약',
      })),
      ...parties.map((p) => ({
        startAt: p.startAt.toISOString(),
        endAt: p.endAt.toISOString(),
        label: p.title,
      })),
    ]
    const venue = this.toVenue(v)
    const offHours = suggestOffHoursSlots(venue, { fromDate: from, days, busy })
    return { venueId: id, busy, offHours }
  }

  async getMenu(venueId: string): Promise<MenuItem[]> {
    const items = await this.prisma.menuItem.findMany({
      where: { venueId, isAvailable: true },
      orderBy: [{ availability: 'asc' }, { coursePosition: 'asc' }, { name: 'asc' }],
    })
    return items.map(this.toMenuItem)
  }

  private toCreateData(dto: CreateVenueDto): Prisma.VenueUncheckedCreateInput {
    return {
      name: dto.name,
      kind: dto.kind,
      area: dto.area,
      address: dto.address,
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      capacity: dto.capacity,
      pricePerHourKRW: dto.pricePerHourKRW,
      amenitiesJson: toJsonString(dto.amenities ?? []),
      description: dto.description ?? null,
      photosJson: toJsonString(dto.photos ?? []),
      contactPhone: dto.contactPhone ?? null,
      instantBook: dto.instantBook ?? false,
      cleaningFeeKRW: dto.cleaningFeeKRW ?? 0,
      minHours: dto.minHours ?? 2,
      openMinute: dto.openMinute ?? 660,
      closeMinute: dto.closeMinute ?? 1380,
      closedWeekdaysJson: toJsonString(dto.closedWeekdays ?? []),
      weekendMultiplier: dto.weekendMultiplier ?? 1,
      peakMultiplier: dto.peakMultiplier ?? 1,
      arrivalGuideJson: toJsonString(dto.arrivalGuide ?? {}),
      vibeTagsJson: toJsonString(dto.vibeTags ?? []),
      useCasesJson: toJsonString(dto.useCases ?? []),
      hostBlurb: dto.hostBlurb ?? null,
      selfHostEnabled: dto.selfHostEnabled ?? true,
    }
  }

  private toUpdateData(dto: UpdateVenueDto): Prisma.VenueUpdateInput {
    const data: Prisma.VenueUpdateInput = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.kind !== undefined) data.kind = dto.kind
    if (dto.area !== undefined) data.area = dto.area
    if (dto.address !== undefined) data.address = dto.address
    if (dto.lat !== undefined) data.lat = dto.lat
    if (dto.lng !== undefined) data.lng = dto.lng
    if (dto.capacity !== undefined) data.capacity = dto.capacity
    if (dto.pricePerHourKRW !== undefined) data.pricePerHourKRW = dto.pricePerHourKRW
    if (dto.amenities !== undefined) data.amenitiesJson = toJsonString(dto.amenities)
    if (dto.description !== undefined) data.description = dto.description
    if (dto.photos !== undefined) data.photosJson = toJsonString(dto.photos)
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone
    if (dto.instantBook !== undefined) data.instantBook = dto.instantBook
    if (dto.cleaningFeeKRW !== undefined) data.cleaningFeeKRW = dto.cleaningFeeKRW
    if (dto.minHours !== undefined) data.minHours = dto.minHours
    if (dto.openMinute !== undefined) data.openMinute = dto.openMinute
    if (dto.closeMinute !== undefined) data.closeMinute = dto.closeMinute
    if (dto.closedWeekdays !== undefined) data.closedWeekdaysJson = toJsonString(dto.closedWeekdays)
    if (dto.weekendMultiplier !== undefined) data.weekendMultiplier = dto.weekendMultiplier
    if (dto.peakMultiplier !== undefined) data.peakMultiplier = dto.peakMultiplier
    if (dto.arrivalGuide !== undefined) data.arrivalGuideJson = toJsonString(dto.arrivalGuide ?? {})
    if (dto.vibeTags !== undefined) data.vibeTagsJson = toJsonString(dto.vibeTags)
    if (dto.useCases !== undefined) data.useCasesJson = toJsonString(dto.useCases)
    if (dto.hostBlurb !== undefined) data.hostBlurb = dto.hostBlurb
    if (dto.selfHostEnabled !== undefined) data.selfHostEnabled = dto.selfHostEnabled
    return data
  }

  private toVenue = (v: PrismaVenue): Venue => ({
    id: v.id,
    name: v.name,
    kind: v.kind as Venue['kind'],
    area: v.area,
    address: v.address,
    lat: v.lat,
    lng: v.lng,
    capacity: v.capacity,
    pricePerHourKRW: v.pricePerHourKRW,
    amenities: parseJsonArray<string>(v.amenitiesJson),
    partnered: v.partnered,
    description: v.description,
    photos: parseJsonArray<string>(v.photosJson),
    contactPhone: v.contactPhone,
    rating: v.rating,
    reviewCount: v.reviewCount,
    instantBook: v.instantBook,
    cleaningFeeKRW: v.cleaningFeeKRW,
    minHours: v.minHours,
    openMinute: v.openMinute,
    closeMinute: v.closeMinute,
    closedWeekdays: parseJsonArray<number>(v.closedWeekdaysJson),
    weekendMultiplier: v.weekendMultiplier,
    peakMultiplier: v.peakMultiplier,
    // 와이파이/비상연락/입장 안내는 민감정보 — 공개 응답에서 제외(소유자·확정 예약자에게만 노출)
    arrivalGuide: null,
    vibeTags: parseJsonArray<string>(v.vibeTagsJson),
    useCases: parseJsonArray<string>(v.useCasesJson),
    hostBlurb: v.hostBlurb,
    selfHostEnabled: v.selfHostEnabled,
    ownerId: v.ownerId,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  })

  private toMenuItem = (m: PrismaMenuItem): MenuItem => ({
    id: m.id,
    venueId: m.venueId,
    kind: m.kind as MenuItem['kind'],
    name: m.name,
    description: m.description,
    priceKRW: m.priceKRW,
    availability: m.availability as MenuAvailability,
    coursePosition: m.coursePosition,
    perPersonLimit: m.perPersonLimit,
    imageUrl: m.imageUrl,
    isAvailable: m.isAvailable,
  })
}
