import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { parseJsonArray, toJsonString } from '@/common/json-utils'
import {
  buildHeteroRotation,
  buildRoundRobin,
  buildTrioRotation,
  findMutualMatches,
  groupByN,
  shuffle,
} from '@rotifolk/shared'
import type { HeteroParticipant } from '@rotifolk/shared'

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  /** 호스트가 처음 라운드를 생성. 기존 라운드 있으면 폐기. */
  async planRounds(hostId: string, partyId: string) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party) throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (party.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트만 라운드를 짤 수 있어요' })

    const participants = await this.prisma.participation.findMany({
      where: { partyId, status: { in: ['confirmed', 'checked-in'] } },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    })
    if (participants.length < 2)
      throw new BadRequestException({ code: 'not_enough_participants', message: '최소 2명 필요해요' })

    const ids = participants.map((p) => p.userId)
    const heteroPool: HeteroParticipant[] = participants
      .filter((p) => p.user.gender === 'male' || p.user.gender === 'female')
      .map((p) => ({ userId: p.userId, gender: p.user.gender as 'male' | 'female' }))

    await this.prisma.round.deleteMany({ where: { partyId } })

    const created: { index: number; pairs: string[][] }[] = []

    const heteroPreferred =
      party.genderRatio === '5:5' &&
      heteroPool.length === participants.length &&
      heteroPool.some((p) => p.gender === 'male') &&
      heteroPool.some((p) => p.gender === 'female')

    if (heteroPreferred && party.rotationMode !== 'host-curated') {
      const rounds = buildHeteroRotation(heteroPool, party.totalRounds)
      rounds.forEach((r) =>
        created.push({
          index: r.roundIndex,
          pairs: r.pairs.map((pair) => pair as unknown as string[]),
        }),
      )
    } else if (party.rotationMode === 'round-robin-pair') {
      const rounds = buildRoundRobin(ids).slice(0, party.totalRounds)
      rounds.forEach((r) =>
        created.push({
          index: r.roundIndex,
          pairs: r.pairs.map((pair) => pair as unknown as string[]),
        }),
      )
    } else if (party.rotationMode === 'round-robin-trio') {
      const rounds = buildTrioRotation(ids, party.totalRounds)
      rounds.forEach((r) => created.push({ index: r.roundIndex, pairs: r.trios }))
    } else if (party.rotationMode === 'speed-circle') {
      const rounds = buildRoundRobin(ids).slice(0, party.totalRounds)
      rounds.forEach((r) =>
        created.push({
          index: r.roundIndex,
          pairs: r.pairs.map((pair) => pair as unknown as string[]),
        }),
      )
    } else if (party.rotationMode === 'random-shuffle') {
      for (let i = 1; i <= party.totalRounds; i++) {
        const groups = groupByN(shuffle(ids), 2, i)
        created.push({ index: i, pairs: groups })
      }
    } else {
      // host-curated — 빈 라운드만 생성
      for (let i = 1; i <= party.totalRounds; i++) created.push({ index: i, pairs: [] })
    }

    for (const r of created) {
      await this.prisma.round.create({
        data: {
          partyId,
          index: r.index,
          durationSec: party.roundDurationSec,
          status: 'queued',
          pairs: {
            create: r.pairs.map((members, i) => ({
              seatLabel: this.seatLabel(i),
              memberIdsJson: toJsonString(members),
            })),
          },
        },
      })
    }
    return this.listRounds(partyId)
  }

  async listRounds(partyId: string) {
    const rounds = await this.prisma.round.findMany({
      where: { partyId },
      include: { pairs: true },
      orderBy: { index: 'asc' },
    })
    return rounds.map((r) => ({
      id: r.id,
      partyId: r.partyId,
      index: r.index,
      status: r.status,
      durationSec: r.durationSec,
      startedAt: r.startedAt?.toISOString() ?? null,
      finishedAt: r.finishedAt?.toISOString() ?? null,
      pairs: r.pairs.map((p) => ({
        id: p.id,
        roundId: p.roundId,
        seatLabel: p.seatLabel,
        memberIds: parseJsonArray<string>(p.memberIdsJson),
      })),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  }

  async getCurrentRound(partyId: string, userId: string) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party) throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (!party.currentRoundIndex) return null

    const round = await this.prisma.round.findFirst({
      where: { partyId, index: party.currentRoundIndex },
      include: { pairs: true },
    })
    if (!round) return null

    const myPair = round.pairs.find((p) =>
      parseJsonArray<string>(p.memberIdsJson).includes(userId),
    )

    return {
      round: {
        id: round.id,
        index: round.index,
        status: round.status,
        durationSec: round.durationSec,
        startedAt: round.startedAt?.toISOString() ?? null,
      },
      myPair: myPair
        ? {
            id: myPair.id,
            seatLabel: myPair.seatLabel,
            memberIds: parseJsonArray<string>(myPair.memberIdsJson),
          }
        : null,
    }
  }

  async midMatchLike(fromUserId: string, partyId: string, toUserId: string) {
    if (fromUserId === toUserId)
      throw new BadRequestException({ code: 'self_vote', message: '본인은 선택할 수 없어요' })
    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party) throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })

    return this.prisma.midMatchVote.upsert({
      where: {
        partyId_fromUserId_toUserId_roundIndex: {
          partyId,
          fromUserId,
          toUserId,
          roundIndex: party.currentRoundIndex || 0,
        },
      },
      create: {
        partyId,
        fromUserId,
        toUserId,
        roundIndex: party.currentRoundIndex || 0,
      },
      update: {},
    })
  }

  async finalMatchVote(fromUserId: string, partyId: string, toUserId: string) {
    if (fromUserId === toUserId)
      throw new BadRequestException({ code: 'self_vote', message: '본인은 선택할 수 없어요' })

    return this.prisma.finalMatchVote.upsert({
      where: { partyId_fromUserId_toUserId: { partyId, fromUserId, toUserId } },
      create: { partyId, fromUserId, toUserId },
      update: {},
    })
  }

  async revealFinalMatches(hostId: string, partyId: string) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party || party.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트 권한이 필요해요' })

    const votes = await this.prisma.finalMatchVote.findMany({ where: { partyId } })
    const mutuals = findMutualMatches(
      votes.map((v) => ({ fromUserId: v.fromUserId, toUserId: v.toUserId })),
    )

    await this.prisma.finalMatch.deleteMany({ where: { partyId } })
    const created = await Promise.all(
      mutuals.map((m) =>
        this.prisma.finalMatch.create({
          data: {
            partyId,
            userAId: m.userAId,
            userBId: m.userBId,
            result: 'mutual',
          },
        }),
      ),
    )
    return created.map((c) => ({
      id: c.id,
      partyId: c.partyId,
      userAId: c.userAId,
      userBId: c.userBId,
      result: c.result,
      matchedAt: c.matchedAt.toISOString(),
    }))
  }

  private seatLabel(i: number): string {
    return String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '')
  }
}
