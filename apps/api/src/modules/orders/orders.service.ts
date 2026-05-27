import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import type {
  CreateOrderDto,
  MenuAvailability,
  Order,
  OrderItem,
  UpdateOrderStatusDto,
} from '@rotifolk/shared'
import type { Order as PrismaOrder, OrderItem as PrismaOrderItem } from '@prisma/client'

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    const party = await this.prisma.party.findUnique({ where: { id: dto.partyId } })
    if (!party) throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (!party.enableLiveOrders)
      throw new BadRequestException({ code: 'orders_disabled', message: '이 파티는 라이브 주문이 꺼져있어요' })

    const part = await this.prisma.participation.findUnique({
      where: { partyId_userId: { partyId: dto.partyId, userId } },
    })
    if (!part) throw new ForbiddenException({ code: 'not_joined', message: '참가자만 주문할 수 있어요' })

    const ids = dto.items.map((i) => i.menuItemId)
    const menuItems = await this.prisma.menuItem.findMany({ where: { id: { in: ids } } })
    if (menuItems.length !== ids.length)
      throw new BadRequestException({ code: 'invalid_menu', message: '메뉴 정보를 확인해주세요' })

    // course 항목은 호스트만 발주 가능 (참가자는 못 만듦)
    const hasCourse = menuItems.some((m) => m.availability === 'course')
    if (hasCourse && party.hostId !== userId) {
      throw new ForbiddenException({
        code: 'course_host_only',
        message: '코스 메뉴는 호스트가 진행해 드려요',
      })
    }

    // paid 항목만 합산
    const total = dto.items.reduce((sum, it) => {
      const m = menuItems.find((m) => m.id === it.menuItemId)!
      return sum + (m.availability === 'paid' ? m.priceKRW * it.quantity : 0)
    }, 0)

    const order = await this.prisma.order.create({
      data: {
        partyId: dto.partyId,
        userId,
        seatLabel: part.seatNumber ? `좌석 ${part.seatNumber}` : null,
        totalKRW: total,
        note: dto.note ?? null,
        items: {
          create: dto.items.map((it) => {
            const m = menuItems.find((mi) => mi.id === it.menuItemId)!
            const billable = m.availability === 'paid'
            return {
              menuItemId: m.id,
              name: m.name,
              quantity: it.quantity,
              priceKRW: billable ? m.priceKRW : 0,
              billable,
              availability: m.availability,
              note: it.note ?? null,
            }
          }),
        },
      },
      include: { items: true },
    })
    return this.toOrder(order)
  }

  /** 엔빵 정산 — equal: 1/N 균등, pay-yours: 본인 주문만 합산 */
  async splitBill(partyId: string, mode: 'equal' | 'pay-yours') {
    const party = await this.prisma.party.findUnique({
      where: { id: partyId },
      include: { _count: { select: { participations: true } } },
    })
    if (!party) throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })

    const orders = await this.prisma.order.findMany({
      where: { partyId, status: { not: 'cancelled' } },
      include: { items: true, user: true },
    })

    const billableSubtotal = orders.reduce((s, o) => s + o.totalKRW, 0)
    const seatPaymentTotal = party.basePriceKRW * party._count.participations
    const totalKRW = billableSubtotal + seatPaymentTotal
    const headcount = party._count.participations || 1

    if (mode === 'equal') {
      return {
        mode,
        totalKRW,
        headcount,
        perPersonKRW: Math.ceil(totalKRW / headcount),
        breakdown: [],
      }
    }
    const byUser = new Map<string, { nickname: string; subtotal: number }>()
    for (const o of orders) {
      const cur = byUser.get(o.userId) ?? { nickname: o.user.nickname, subtotal: 0 }
      cur.subtotal += o.totalKRW
      byUser.set(o.userId, cur)
    }
    return {
      mode,
      totalKRW,
      headcount,
      perPersonKRW: 0,
      breakdown: [...byUser.entries()].map(([userId, v]) => ({
        userId,
        nickname: v.nickname,
        subtotal: v.subtotal + party.basePriceKRW,
      })),
    }
  }

  async listByParty(hostId: string, partyId: string) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party || party.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트만 주문 목록을 볼 수 있어요' })
    const orders = await this.prisma.order.findMany({
      where: { partyId },
      include: { items: true, user: true },
      orderBy: { requestedAt: 'desc' },
    })
    return orders.map((o) => this.toOrder(o))
  }

  async listMine(userId: string, partyId: string) {
    const orders = await this.prisma.order.findMany({
      where: { partyId, userId },
      include: { items: true },
      orderBy: { requestedAt: 'desc' },
    })
    return orders.map((o) => this.toOrder(o))
  }

  async updateStatus(hostId: string, orderId: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const o = await this.prisma.order.findUnique({ where: { id: orderId }, include: { party: true } })
    if (!o) throw new NotFoundException({ code: 'order_not_found', message: '주문을 찾을 수 없어요' })
    if (o.party.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트만 주문 상태를 바꿀 수 있어요' })

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        servedAt: dto.status === 'served' ? new Date() : null,
      },
      include: { items: true },
    })
    return this.toOrder(updated)
  }

  private toOrder(o: PrismaOrder & { items: PrismaOrderItem[] }): Order {
    return {
      id: o.id,
      partyId: o.partyId,
      userId: o.userId,
      seatLabel: o.seatLabel,
      totalKRW: o.totalKRW,
      status: o.status as Order['status'],
      requestedAt: o.requestedAt.toISOString(),
      servedAt: o.servedAt?.toISOString() ?? null,
      note: o.note,
      items: o.items.map(
        (i): OrderItem => ({
          menuItemId: i.menuItemId,
          name: i.name,
          quantity: i.quantity,
          priceKRW: i.priceKRW,
          billable: i.billable,
          availability: i.availability as MenuAvailability,
          note: i.note,
        }),
      ),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }
  }
}
