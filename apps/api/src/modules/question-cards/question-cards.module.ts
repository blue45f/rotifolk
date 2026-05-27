import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@/prisma/prisma.service'

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
    @Query('partyId') partyId?: string,
    @Query('depth') depth?: string,
    @Query('pairId') pairId?: string,
  ) {
    const where: Record<string, unknown> = depth ? { depth } : {}
    if (partyId) where.OR = [{ partyId }, { partyId: null }]
    else where.partyId = null
    const cards = await this.prisma.questionCard.findMany({ where, orderBy: { usedCount: 'asc' }, take: 24 })
    if (!cards.length) throw new BadRequestException({ code: 'no_cards', message: '카드가 없어요' })
    const pick = cards[Math.floor(Math.random() * cards.length)]
    await this.prisma.questionCard.update({ where: { id: pick.id }, data: { usedCount: { increment: 1 } } })
    if (pairId) {
      await this.prisma.questionCardDraw.create({ data: { cardId: pick.id, pairId } })
    }
    return pick
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Body() body: { partyId?: string; depth: string; prompt: string; category?: string; language?: 'ko' | 'en' },
  ) {
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
}

@Module({ controllers: [QuestionCardsController] })
export class QuestionCardsModule {}
