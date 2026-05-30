import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Module,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@/prisma/prisma.service'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'

const DEPTHS = ['icebreaker', 'casual', 'deeper', 'spicy'] as const

@Controller('question-cards')
class QuestionCardsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('depth') depth?: string, @Query('partyId') partyId?: string) {
    const where: Record<string, unknown> = {}
    if (depth && (DEPTHS as readonly string[]).includes(depth)) where.depth = depth
    if (partyId) where.OR = [{ partyId }, { partyId: null }]
    else where.partyId = null
    return this.prisma.questionCard.findMany({ where, orderBy: { usedCount: 'asc' }, take: 60 })
  }

  @Get('draw')
  @UseGuards(AuthGuard('jwt'))
  async draw(
    @CurrentUser() me: JwtUserPayload,
    @Query('partyId') partyId?: string,
    @Query('depth') depth?: string,
    @Query('pairId') pairId?: string,
  ) {
    // 파티 지정 시 그 파티의 참가자만 뽑을 수 있음(usedCount·draw 기록 오염 방지)
    if (partyId) await this.assertParticipant(partyId, me.sub)
    // pairId 지정 시 그 페어가 해당 파티 라운드 소속인지 검증(임의 페어 기록 방지)
    if (pairId) {
      const pair = await this.prisma.pair.findUnique({
        where: { id: pairId },
        select: { round: { select: { partyId: true } } },
      })
      if (!pair || (partyId && pair.round.partyId !== partyId))
        throw new BadRequestException({ code: 'invalid_pair', message: '잘못된 페어에요' })
    }
    const where: Record<string, unknown> = depth ? { depth } : {}
    if (partyId) where.OR = [{ partyId }, { partyId: null }]
    else where.partyId = null
    const cards = await this.prisma.questionCard.findMany({
      where,
      orderBy: { usedCount: 'asc' },
      take: 24,
    })
    if (!cards.length) throw new BadRequestException({ code: 'no_cards', message: '카드가 없어요' })
    const pick = cards[Math.floor(Math.random() * cards.length)]
    await this.prisma.questionCard.update({
      where: { id: pick.id },
      data: { usedCount: { increment: 1 } },
    })
    if (pairId) {
      await this.prisma.questionCardDraw.create({ data: { cardId: pick.id, pairId } })
    }
    return pick
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @CurrentUser() me: JwtUserPayload,
    @Body()
    body: {
      partyId?: string
      depth: string
      prompt: string
      category?: string
      language?: 'ko' | 'en'
    },
  ) {
    // 파티 전용 카드는 그 파티 호스트만 추가 가능(임의 파티에 질문 주입 방지)
    if (body.partyId) {
      const party = await this.prisma.party.findUnique({
        where: { id: body.partyId },
        select: { hostId: true },
      })
      if (!party || party.hostId !== me.sub)
        throw new ForbiddenException({
          code: 'forbidden',
          message: '파티 호스트만 질문카드를 추가할 수 있어요',
        })
    }
    return this.prisma.questionCard.create({
      data: {
        partyId: body.partyId ?? null,
        depth: body.depth,
        prompt: body.prompt,
        category: body.category ?? null,
        language: body.language ?? 'ko',
      },
    })
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.prisma.questionCard.findUnique({ where: { id } })
  }

  private async assertParticipant(partyId: string, userId: string) {
    const part = await this.prisma.participation.findUnique({
      where: { partyId_userId: { partyId, userId } },
      select: { status: true },
    })
    if (!part || (part.status !== 'confirmed' && part.status !== 'checked-in'))
      throw new ForbiddenException({
        code: 'not_participant',
        message: '이 모임의 참가자만 할 수 있어요',
      })
  }
}

@Module({ controllers: [QuestionCardsController] })
export class QuestionCardsModule {}
