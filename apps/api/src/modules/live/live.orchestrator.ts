import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

/**
 * 파티의 라이브 라운드 타이머 / 상태 머신.
 * 단일 프로세스 가정 — 멀티 인스턴스화 시 Redis pub/sub 도입.
 */
@Injectable()
export class LiveOrchestrator {
  private readonly logger = new Logger(LiveOrchestrator.name)
  private timers = new Map<string, NodeJS.Timeout>()

  constructor(private readonly prisma: PrismaService) {}

  async startNextRound(
    partyId: string,
    onTick: (remainingSec: number, roundIndex: number) => void,
    onFinish: (roundIndex: number) => void,
  ) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party) return null

    const nextIndex = (party.currentRoundIndex || 0) + 1
    const round = await this.prisma.round.findFirst({
      where: { partyId, index: nextIndex },
      include: { pairs: true },
    })
    if (!round) {
      this.logger.warn(`No more rounds for party ${partyId}`)
      return null
    }

    const startedAt = new Date()
    await this.prisma.round.update({
      where: { id: round.id },
      data: { status: 'live', startedAt },
    })
    await this.prisma.party.update({
      where: { id: partyId },
      data: { currentRoundIndex: nextIndex, status: 'live' },
    })

    this.stopTimer(partyId)
    let remaining = round.durationSec
    onTick(remaining, round.index)
    const interval = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(interval)
        this.timers.delete(partyId)
        this.finishRound(round.id).then(() => onFinish(round.index))
        return
      }
      onTick(remaining, round.index)
    }, 1000)
    this.timers.set(partyId, interval)

    return { round, endsAt: new Date(startedAt.getTime() + round.durationSec * 1000) }
  }

  async finishCurrent(partyId: string, onFinish: (roundIndex: number) => void) {
    this.stopTimer(partyId)
    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party?.currentRoundIndex) return
    const round = await this.prisma.round.findFirst({
      where: { partyId, index: party.currentRoundIndex },
    })
    if (!round) return
    await this.finishRound(round.id)
    onFinish(round.index)
  }

  private async finishRound(roundId: string) {
    return this.prisma.round.update({
      where: { id: roundId },
      data: { status: 'finished', finishedAt: new Date() },
    })
  }

  private stopTimer(partyId: string) {
    const t = this.timers.get(partyId)
    if (t) {
      clearInterval(t)
      this.timers.delete(partyId)
    }
  }
}
