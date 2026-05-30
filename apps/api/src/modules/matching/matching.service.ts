import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { parseJsonArray, toJsonString } from '@/common/json-utils'
import {
  buildGroupRotation,
  buildHeteroRotation,
  buildHubRotation,
  buildRoundRobin,
  buildTrioRotation,
  channelsFromLegacyMode,
  computeCompatibility,
  computeConnections,
  computeForbiddenPairs,
  computePopularity,
  filterConnectionsExcluding,
  findMutualMatches,
  groupByN,
  repairForbiddenPairs,
  resolveSharedChannels,
  shuffle,
} from '@rotifolk/shared'
import type {
  ConnectionChannel,
  ConnectionMode,
  ForbiddenParticipant,
  Gender,
  HeteroParticipant,
  MatchScope,
  UserContact,
} from '@rotifolk/shared'
import { NotificationsEmitter } from '../notifications/notifications.emitter'

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifEmitter: NotificationsEmitter,
  ) {}

  /** 호스트가 처음 라운드를 생성. 기존 라운드 있으면 폐기. */
  async planRounds(hostId: string, partyId: string) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party)
      throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (party.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트만 라운드를 짤 수 있어요' })
    // 진행/종료된 파티는 재편성 금지 — 라이브 라운드·투표 데이터 손실 방지.
    if (party.status === 'live' || party.status === 'ended' || party.status === 'cancelled')
      throw new BadRequestException({
        code: 'rounds_locked',
        message: '이미 시작했거나 종료된 모임은 라운드를 다시 짤 수 없어요',
      })

    const participants = await this.prisma.participation.findMany({
      where: { partyId, status: { in: ['confirmed', 'checked-in'] } },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    })
    if (participants.length < 2)
      throw new BadRequestException({
        code: 'not_enough_participants',
        message: '최소 2명 필요해요',
      })

    const ids = participants.map((p) => p.userId)
    const heteroPool: HeteroParticipant[] = participants
      .filter((p) => p.user.gender === 'male' || p.user.gender === 'female')
      .map((p) => ({ userId: p.userId, gender: p.user.gender as 'male' | 'female' }))

    const created: { index: number; pairs: string[][] }[] = []

    const heteroPreferred =
      party.genderRatio === '5:5' &&
      heteroPool.length === participants.length &&
      heteroPool.some((p) => p.gender === 'male') &&
      heteroPool.some((p) => p.gender === 'female')
    const forbiddenPairs = await this.forbiddenPairsForParty(partyId)

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
    } else if (party.rotationFormat === 'many-to-many') {
      const rounds = buildGroupRotation(ids, party.groupSize, party.totalRounds)
      rounds.forEach((r) => created.push({ index: r.roundIndex, pairs: r.groups }))
    } else if (party.rotationFormat === 'many-to-one') {
      const rounds = buildHubRotation(ids, party.groupSize, party.totalRounds)
      rounds.forEach((r) =>
        created.push({
          index: r.roundIndex,
          pairs: [[r.hubId, ...r.groupIds]],
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

    const planned = repairForbiddenPairs(created, forbiddenPairs)

    // 기존 라운드 삭제 + 새 라운드 생성을 한 트랜잭션으로 — 중간 실패 시 라운드가 유실되지 않게.
    await this.prisma.$transaction(async (tx) => {
      await tx.round.deleteMany({ where: { partyId } })
      for (const r of planned) {
        await tx.round.create({
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
    })
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
    if (!party)
      throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (!party.currentRoundIndex) return null

    const round = await this.prisma.round.findFirst({
      where: { partyId, index: party.currentRoundIndex },
      include: { pairs: true },
    })
    if (!round) return null

    const myPair = round.pairs.find((p) => parseJsonArray<string>(p.memberIdsJson).includes(userId))

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

  /** userId가 해당 파티의 활성 참가자(confirmed/checked-in)인지 검증 — 비참가자 투표/쪽지 차단. */
  private async assertParticipant(partyId: string, userId: string) {
    const p = await this.prisma.participation.findUnique({
      where: { partyId_userId: { partyId, userId } },
      select: { status: true },
    })
    if (!p || (p.status !== 'confirmed' && p.status !== 'checked-in')) {
      throw new ForbiddenException({
        code: 'not_participant',
        message: '이 모임의 참가자만 할 수 있어요',
      })
    }
  }

  async midMatchLike(fromUserId: string, partyId: string, toUserId: string) {
    if (fromUserId === toUserId)
      throw new BadRequestException({ code: 'self_vote', message: '본인은 선택할 수 없어요' })
    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party)
      throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    await this.assertParticipant(partyId, fromUserId)
    await this.assertParticipant(partyId, toUserId)

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
    await this.assertParticipant(partyId, fromUserId)
    await this.assertParticipant(partyId, toUserId)

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

    // 기존 매칭 삭제 + 새 매칭 생성을 한 트랜잭션으로 — 중간 실패 시 매칭이 유실되지 않게.
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.finalMatch.deleteMany({ where: { partyId } })
      return Promise.all(
        mutuals.map((m) =>
          tx.finalMatch.create({
            data: {
              partyId,
              userAId: m.userAId,
              userBId: m.userBId,
              result: 'mutual',
            },
          }),
        ),
      )
    })
    await this.prisma.notification.createMany({
      data: created.flatMap((c) => [
        {
          userId: c.userAId,
          kind: 'match_made',
          title: '💫 매칭됐어요!',
          body: `${party.title}에서 서로를 골랐어요. 채팅을 시작해보세요.`,
          link: '/chats',
        },
        {
          userId: c.userBId,
          kind: 'match_made',
          title: '💫 매칭됐어요!',
          body: `${party.title}에서 서로를 골랐어요. 채팅을 시작해보세요.`,
          link: '/chats',
        },
      ]),
    })
    for (const c of created) {
      const payload = {
        kind: 'match_made',
        title: '💫 매칭됐어요!',
        body: `${party.title}에서 서로를 골랐어요.`,
        link: '/chats',
      }
      this.notifEmitter.toUser(c.userAId, payload)
      this.notifEmitter.toUser(c.userBId, payload)
    }
    return created.map((c) => ({
      id: c.id,
      partyId: c.partyId,
      userAId: c.userAId,
      userBId: c.userBId,
      result: c.result,
      matchedAt: c.matchedAt.toISOString(),
    }))
  }

  /**
   * 종료 후 매칭 리빌 — 현재 사용자의 인연을 파티 정책(matchScope)대로 계산.
   * 호스트가 제공한 연결 채널 중 양쪽이 공개 동의한 채널만 노출한다.
   */
  async myPartyMatches(userId: string, partyId: string) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party)
      throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })

    const [votes, participants, me, forbiddenPairs] = await Promise.all([
      this.prisma.finalMatchVote.findMany({
        where: { partyId },
        select: { fromUserId: true, toUserId: true },
      }),
      this.prisma.participation.findMany({
        where: { partyId, status: { in: ['confirmed', 'checked-in'] } },
        select: { userId: true, user: { select: { gender: true } } },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          shareContact: true,
          shareKakao: true,
          shareInstagram: true,
          mbti: true,
          interestsJson: true,
          birthYear: true,
        },
      }),
      this.forbiddenPairsForParty(partyId),
    ])

    const connections = filterConnectionsExcluding(
      computeConnections({
        scope: party.matchScope as MatchScope,
        votes,
        allUserIds: participants.map((p) => p.userId),
        maxPerPerson: party.maxMatchesPerPerson,
      }),
      forbiddenPairs,
    )
    const mine = connections.filter((c) => c.userAId === userId || c.userBId === userId)
    const partnerIds = [
      ...new Set(mine.map((c) => (c.userAId === userId ? c.userBId : c.userAId))),
    ].filter((id) => id !== userId)

    const parsedChannels = parseJsonArray<ConnectionChannel>(party.connectionChannelsJson)
    const offeredChannels =
      parsedChannels.length > 0
        ? parsedChannels
        : channelsFromLegacyMode(party.connectionMode as ConnectionMode)
    const meContact: UserContact = {
      shareContact: me?.shareContact ?? false,
      shareKakao: me?.shareKakao ?? false,
      shareInstagram: me?.shareInstagram ?? false,
    }

    const partners = await this.prisma.user.findMany({
      where: { id: { in: partnerIds } },
      select: {
        id: true,
        nickname: true,
        avatarId: true,
        phone: true,
        shareContact: true,
        kakaoId: true,
        shareKakao: true,
        instagram: true,
        shareInstagram: true,
        mbti: true,
        interestsJson: true,
        birthYear: true,
        verifiedFieldsJson: true,
      },
    })
    const pmap = new Map(partners.map((p) => [p.id, p]))
    const meCompat = {
      mbti: me?.mbti ?? null,
      interests: parseJsonArray<string>(me?.interestsJson ?? '[]'),
      birthYear: me?.birthYear ?? null,
    }
    const popularity = party.revealPopular
      ? computePopularity(
          votes.map((v) => ({ toUserId: v.toUserId })),
          participants.map((p) => ({
            userId: p.userId,
            gender: p.user.gender as Gender | null,
          })),
        )
      : { popularMale: null, popularFemale: null }

    const matches = partnerIds.map((pid) => {
      const p = pmap.get(pid)
      const conn = mine.find((c) => c.userAId === pid || c.userBId === pid)
      const channels = resolveSharedChannels(offeredChannels, meContact, p ?? {})
      const phone = channels.find((c) => c.channel === 'phone')?.handle ?? null
      const compat = computeCompatibility(
        meCompat,
        {
          mbti: p?.mbti ?? null,
          interests: parseJsonArray<string>(p?.interestsJson ?? '[]'),
          birthYear: p?.birthYear ?? null,
        },
        `${userId}-${pid}`,
      )
      return {
        partnerId: pid,
        nickname: p?.nickname ?? '익명',
        avatarId: p?.avatarId ?? null,
        result: conn?.result ?? 'mutual',
        phone,
        channels,
        compatibility: {
          score: compat.score,
          title: compat.title,
          blurb: compat.blurb,
          factors: compat.factors,
        },
        verified: parseJsonArray<string>(p?.verifiedFieldsJson ?? '[]').includes('identity'),
      }
    })

    return {
      scope: party.matchScope,
      connectionChannels: offeredChannels,
      groupAfterParty: party.groupAfterParty,
      popularity,
      // 내가 받은 호감 수 (최종 투표 기준) — 리빌에서 본인에게만 보여주는 요약
      myLikesReceived: votes.filter((v) => v.toUserId === userId).length,
      matches,
    }
  }

  /**
   * 파티의 확정/체크인 참가자 전원 중 마주치면 안 되는 쌍을 산출.
   * 차단(UserBlock) + 회피 연락처(AvoidContact, 양방향 해시 대조) + 같은 회사(옵션) 기반.
   */
  private async forbiddenPairsForParty(partyId: string): Promise<Array<[string, string]>> {
    const participants = await this.prisma.participation.findMany({
      where: { partyId, status: { in: ['confirmed', 'checked-in'] } },
      select: {
        userId: true,
        user: {
          select: {
            phoneHash: true,
            company: true,
            avoidSameCompany: true,
            avoidContacts: { select: { phoneHash: true } },
          },
        },
      },
    })
    const ids = participants.map((p) => p.userId)
    if (ids.length < 2) return []

    // 참가자들 사이의 차단 관계 (양방향은 computeForbiddenPairs가 처리하므로 blockerId만 수집).
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerId: { in: ids }, blockedId: { in: ids } },
      select: { blockerId: true, blockedId: true },
    })
    const blockedByUser = new Map<string, string[]>()
    for (const b of blocks) {
      const arr = blockedByUser.get(b.blockerId) ?? []
      arr.push(b.blockedId)
      blockedByUser.set(b.blockerId, arr)
    }

    const forbiddenInput: ForbiddenParticipant[] = participants.map((p) => ({
      userId: p.userId,
      phoneHash: p.user?.phoneHash ?? null,
      avoidHashes: (p.user?.avoidContacts ?? []).map((a) => a.phoneHash),
      blockedUserIds: blockedByUser.get(p.userId) ?? [],
      company: p.user?.company ?? null,
      avoidSameCompany: p.user?.avoidSameCompany ?? false,
    }))
    return computeForbiddenPairs(forbiddenInput)
  }

  /**
   * 오늘의 인기남/인기녀 — 받은 호감(라운드 좋아요 + 최종 투표) 누적 집계.
   * 성별별 최다 1인만 공개. 프라이버시: 랭킹 비참여자는 후보 제외, 호감 수 비공개자는 카운트 숨김.
   * revealPopular가 꺼져 있으면 공개하지 않는다.
   */
  async popularOfParty(partyId: string) {
    const party = await this.prisma.party.findUnique({
      where: { id: partyId },
      select: { id: true, revealPopular: true },
    })
    if (!party)
      throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (!party.revealPopular) {
      return { revealPopular: false, popularMale: null, popularFemale: null }
    }

    const [mid, final, participants] = await Promise.all([
      this.prisma.midMatchVote.findMany({
        where: { partyId },
        select: { fromUserId: true, toUserId: true },
      }),
      this.prisma.finalMatchVote.findMany({
        where: { partyId },
        select: { fromUserId: true, toUserId: true },
      }),
      this.prisma.participation.findMany({
        where: { partyId, status: { in: ['confirmed', 'checked-in'] } },
        select: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatarId: true,
              gender: true,
              joinPopularityRanking: true,
              showLikesReceived: true,
            },
          },
        },
      }),
    ])

    const users = participants.map((p) => p.user).filter((u): u is NonNullable<typeof u> => !!u)
    // 랭킹 비참여(opt-out)는 후보에서 제외
    const candidates = users
      .filter((u) => u.joinPopularityRanking !== false)
      .map((u) => ({ userId: u.id, gender: (u.gender ?? null) as Gender | null }))
    // 같은 사람이 여러 라운드에 좋아요해도 1명으로 집계 — "N명에게 호감"은 사람 수 기준(distinct).
    const seenAdmirer = new Set<string>()
    const distinctLikes: { toUserId: string }[] = []
    for (const v of [...mid, ...final]) {
      const key = `${v.fromUserId}->${v.toUserId}`
      if (seenAdmirer.has(key)) continue
      seenAdmirer.add(key)
      distinctLikes.push({ toUserId: v.toUserId })
    }
    const { popularMale, popularFemale } = computePopularity(distinctLikes, candidates)

    const umap = new Map(users.map((u) => [u.id, u]))
    const enrich = (e: { userId: string; likes: number } | null) => {
      if (!e) return null
      const u = umap.get(e.userId)
      return {
        userId: e.userId,
        nickname: u?.nickname ?? '익명',
        avatarId: u?.avatarId ?? null,
        // 받은 호감 수 비공개면 카운트를 숨긴다(null)
        likes: u?.showLikesReceived === false ? null : e.likes,
      }
    }
    return {
      revealPopular: true,
      popularMale: enrich(popularMale),
      popularFemale: enrich(popularFemale),
    }
  }

  private seatLabel(i: number): string {
    return String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '')
  }
}
