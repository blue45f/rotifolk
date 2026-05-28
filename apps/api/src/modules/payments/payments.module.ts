import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@/prisma/prisma.service'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'

type PaymentMethod = 'card' | 'kakao' | 'toss' | 'mock'
const ALLOWED_METHODS: PaymentMethod[] = ['card', 'kakao', 'toss', 'mock']

interface PayBody {
  method?: PaymentMethod
}

interface PaymentRow {
  id: string
  partyId: string
  userId: string
  amountKRW: number
  status: string
  method: string
  paidAt: Date | null
  refundedAt: Date | null
  createdAt: Date
}

@Controller('payments')
@UseGuards(AuthGuard('jwt'))
class PaymentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':partyId/pay')
  async pay(
    @CurrentUser() me: JwtUserPayload,
    @Param('partyId') partyId: string,
    @Body() body: PayBody,
  ) {
    const method: PaymentMethod = ALLOWED_METHODS.includes(
      body?.method as PaymentMethod,
    )
      ? (body.method as PaymentMethod)
      : 'card'

    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party) {
      throw new NotFoundException({
        code: 'party_not_found',
        message: '파티를 찾을 수 없어요',
      })
    }

    const existingPaid = await this.prisma.payment.findFirst({
      where: { partyId, userId: me.sub, status: 'paid' },
      orderBy: { createdAt: 'desc' },
    })
    if (existingPaid) return this.shape(existingPaid)

    const now = new Date()
    const created = await this.prisma.payment.create({
      data: {
        partyId,
        userId: me.sub,
        amountKRW: party.basePriceKRW,
        status: 'paid',
        method,
        paidAt: now,
      },
    })
    return this.shape(created)
  }

  @Post(':id/refund')
  async refund(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } })
    if (!payment) {
      throw new NotFoundException({
        code: 'payment_not_found',
        message: '결제를 찾을 수 없어요',
      })
    }
    if (payment.userId !== me.sub) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: '본인의 결제만 환불할 수 있어요',
      })
    }
    if (payment.status !== 'paid') {
      throw new BadRequestException({
        code: 'not_refundable',
        message: '환불 가능한 결제가 아니에요',
      })
    }
    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: 'refunded', refundedAt: new Date() },
    })
    return this.shape(updated)
  }

  @Get('me')
  async mine(
    @CurrentUser() me: JwtUserPayload,
    @Query('partyId') partyId?: string,
  ) {
    const items = await this.prisma.payment.findMany({
      where: {
        userId: me.sub,
        ...(partyId ? { partyId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        party: {
          select: {
            id: true,
            title: true,
            category: true,
            startAt: true,
            coverImageUrl: true,
          },
        },
      },
    })
    return items.map((p) => ({
      ...this.shape(p),
      party: p.party
        ? {
            id: p.party.id,
            title: p.party.title,
            category: p.party.category,
            startAt: p.party.startAt.toISOString(),
            coverImageUrl: p.party.coverImageUrl ?? null,
          }
        : null,
    }))
  }

  @Get('host/summary')
  async hostSummary(@CurrentUser() me: JwtUserPayload) {
    const hostedParties = await this.prisma.party.findMany({
      where: { hostId: me.sub },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    if (hostedParties.length === 0) {
      return { totalKRW: 0, paidCount: 0, refundedKRW: 0, recent: [] }
    }

    const partyIds = hostedParties.map((p) => p.id)
    const payments = await this.prisma.payment.findMany({
      where: { partyId: { in: partyIds } },
      select: { partyId: true, amountKRW: true, status: true },
    })

    let totalKRW = 0
    let paidCount = 0
    let refundedKRW = 0
    const byParty = new Map<string, { totalKRW: number; paidCount: number }>()

    for (const p of payments) {
      if (p.status === 'paid') {
        totalKRW += p.amountKRW
        paidCount += 1
        const entry = byParty.get(p.partyId) ?? { totalKRW: 0, paidCount: 0 }
        entry.totalKRW += p.amountKRW
        entry.paidCount += 1
        byParty.set(p.partyId, entry)
      } else if (p.status === 'refunded') {
        refundedKRW += p.amountKRW
      }
    }

    const recent = hostedParties.slice(0, 12).map((party) => {
      const entry = byParty.get(party.id) ?? { totalKRW: 0, paidCount: 0 }
      return {
        partyId: party.id,
        partyTitle: party.title,
        totalKRW: entry.totalKRW,
        paidCount: entry.paidCount,
      }
    })

    return { totalKRW, paidCount, refundedKRW, recent }
  }

  private shape(p: PaymentRow) {
    return {
      id: p.id,
      partyId: p.partyId,
      userId: p.userId,
      amountKRW: p.amountKRW,
      status: p.status as 'pending' | 'paid' | 'refunded' | 'cancelled',
      method: p.method as PaymentMethod,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      refundedAt: p.refundedAt ? p.refundedAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    }
  }
}

@Module({ controllers: [PaymentsController] })
export class PaymentsModule {}
