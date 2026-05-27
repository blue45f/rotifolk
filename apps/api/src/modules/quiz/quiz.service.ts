import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { parseJsonArray, toJsonString } from '@/common/json-utils'
import type { CreateQuizDto, SubmitQuizAnswerDto } from '@rotifolk/shared'

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async list(partyId: string) {
    const items = await this.prisma.quizQuestion.findMany({
      where: { partyId },
      orderBy: { createdAt: 'asc' },
    })
    return items.map((q) => ({
      id: q.id,
      partyId: q.partyId,
      kind: q.kind,
      prompt: q.prompt,
      options: parseJsonArray<string>(q.optionsJson),
      correctOptionIndex: q.correctOptionIndex,
      durationSec: q.durationSec,
      imageUrl: q.imageUrl,
      launchedAt: q.launchedAt?.toISOString() ?? null,
    }))
  }

  async create(hostId: string, dto: CreateQuizDto) {
    const party = await this.prisma.party.findUnique({ where: { id: dto.partyId } })
    if (!party) throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (party.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트만 퀴즈를 추가할 수 있어요' })

    const q = await this.prisma.quizQuestion.create({
      data: {
        partyId: dto.partyId,
        kind: dto.kind,
        prompt: dto.prompt,
        optionsJson: toJsonString(dto.options),
        correctOptionIndex: dto.correctOptionIndex ?? null,
        durationSec: dto.durationSec,
        imageUrl: dto.imageUrl ?? null,
      },
    })
    return q
  }

  async launch(hostId: string, questionId: string) {
    const q = await this.prisma.quizQuestion.findUnique({ where: { id: questionId } })
    if (!q) throw new NotFoundException({ code: 'quiz_not_found', message: '퀴즈를 찾을 수 없어요' })
    const party = await this.prisma.party.findUnique({ where: { id: q.partyId } })
    if (!party || party.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트 권한이 필요해요' })
    return this.prisma.quizQuestion.update({
      where: { id: questionId },
      data: { launchedAt: new Date() },
    })
  }

  async answer(userId: string, dto: SubmitQuizAnswerDto) {
    const q = await this.prisma.quizQuestion.findUnique({ where: { id: dto.questionId } })
    if (!q) throw new NotFoundException({ code: 'quiz_not_found', message: '퀴즈를 찾을 수 없어요' })

    const launchedAtMs = q.launchedAt?.getTime() ?? Date.now()
    const responseMs = Math.max(0, Date.now() - launchedAtMs)
    const isCorrect =
      q.correctOptionIndex != null && dto.selectedOptionIndex === q.correctOptionIndex

    return this.prisma.quizAnswer.upsert({
      where: { questionId_userId: { questionId: dto.questionId, userId } },
      create: {
        questionId: dto.questionId,
        userId,
        selectedOptionIndex: dto.selectedOptionIndex ?? null,
        freeText: dto.freeText ?? null,
        isCorrect,
        responseMs,
      },
      update: {
        selectedOptionIndex: dto.selectedOptionIndex ?? null,
        freeText: dto.freeText ?? null,
        isCorrect,
        responseMs,
      },
    })
  }

  async leaderboard(partyId: string) {
    const answers = await this.prisma.quizAnswer.findMany({
      where: { question: { partyId } },
      include: { user: { include: { avatar: true } } },
    })
    const stats = new Map<
      string,
      { userId: string; nickname: string; avatarId: string | null; correct: number; sumMs: number; count: number }
    >()
    for (const a of answers) {
      const s = stats.get(a.userId) ?? {
        userId: a.userId,
        nickname: a.user.nickname,
        avatarId: a.user.avatarId,
        correct: 0,
        sumMs: 0,
        count: 0,
      }
      if (a.isCorrect) s.correct++
      s.sumMs += a.responseMs ?? 0
      s.count++
      stats.set(a.userId, s)
    }
    return [...stats.values()]
      .map((s) => ({
        userId: s.userId,
        nickname: s.nickname,
        avatarId: s.avatarId,
        score: s.correct * 100 - Math.round(s.sumMs / Math.max(1, s.count) / 10),
        correctCount: s.correct,
        averageResponseMs: Math.round(s.sumMs / Math.max(1, s.count)),
      }))
      .sort((a, b) => b.score - a.score)
  }
}
