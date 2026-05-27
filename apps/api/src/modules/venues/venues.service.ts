import { Injectable, NotFoundException } from '@nestjs/common'
import type {
  CreateVenueDto,
  VenueSearchDto,
  Venue,
  MenuItem,
  MenuAvailability,
} from '@rotifolk/shared'
import { PrismaService } from '@/prisma/prisma.service'
import { parseJsonArray, toJsonString } from '@/common/json-utils'
import type { Venue as PrismaVenue, MenuItem as PrismaMenuItem } from '@prisma/client'

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: VenueSearchDto): Promise<Venue[]> {
    const where: Record<string, unknown> = {}
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

  async getById(id: string) {
    const v = await this.prisma.venue.findUnique({
      where: { id },
      include: { menuItems: true },
    })
    if (!v) throw new NotFoundException({ code: 'venue_not_found', message: '장소를 찾을 수 없어요' })
    return {
      venue: this.toVenue(v),
      menu: v.menuItems.map(this.toMenuItem),
    }
  }

  async create(ownerId: string, dto: CreateVenueDto) {
    const v = await this.prisma.venue.create({
      data: {
        name: dto.name,
        kind: dto.kind,
        area: dto.area,
        address: dto.address,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        capacity: dto.capacity,
        pricePerHourKRW: dto.pricePerHourKRW,
        amenitiesJson: toJsonString(dto.amenities),
        description: dto.description ?? null,
        photosJson: toJsonString(dto.photos),
        contactPhone: dto.contactPhone ?? null,
        ownerId,
      },
    })
    return this.toVenue(v)
  }

  async getMenu(venueId: string): Promise<MenuItem[]> {
    const items = await this.prisma.menuItem.findMany({
      where: { venueId, isAvailable: true },
      orderBy: [{ availability: 'asc' }, { coursePosition: 'asc' }, { name: 'asc' }],
    })
    return items.map(this.toMenuItem)
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
