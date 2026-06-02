import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  ageFromBirthYear,
  canAcceptGender,
  channelsFromLegacyMode,
  checkEligibility,
  legacyModeFromChannels,
  quoteRefund,
} from '@rotifolk/shared'
import type {
  ChildrenPolicy,
  ConnectionChannel,
  CreatePartyDto,
  MaritalStatus,
  PartyCategory,
  PartyConfig,
  PartyQueryDto,
  UpdatePartyDto,
  VerificationField,
} from '@rotifolk/shared'
import type { Party, Prisma } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { parseJsonArray, toJsonString } from '@/common/json-utils'
import { toParticipation, toParty, toPartySummary } from './party.mapper'
import { NotificationsEmitter } from '../notifications/notifications.emitter'

const CATEGORY_LABEL: Record<PartyCategory, string> = {
  wine: '와인',
  coffee: '커피',
  tea: '차',
  whisky: '위스키',
  cocktail: '칵테일',
  beer: '맥주',
  sake: '사케',
  'natural-wine': '내추럴 와인',
  dessert: '디저트',
  custom: '모임',
}

@Injectable()
export class PartiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifEmitter: NotificationsEmitter,
  ) {}

  /** config.connectionChannels(있으면) 또는 레거시 connectionMode에서 유도한 채널 배열. */
  private resolveChannels(config: PartyConfig): ConnectionChannel[] {
    return config.connectionChannels && config.connectionChannels.length > 0
      ? config.connectionChannels
      : channelsFromLegacyMode(config.connectionMode)
  }

  async list(q: PartyQueryDto) {
    const where: Record<string, unknown> = {}
    if (q.category) where.category = q.category
    if (q.status) where.status = q.status
    if (q.area) where.venue = { area: { contains: q.area } }
    if (q.date) {
      const d = new Date(q.date)
      const next = new Date(d)
      next.setDate(d.getDate() + 1)
      where.startAt = { gte: d, lt: next }
    }
    // Tags stored as JSON string in SQLite; substring match is good-enough
    // (tags are short labels like "#한남" / "내추럴")
    if (q.tag) {
      where.tagsJson = { contains: q.tag }
    }
    const skip = (q.page - 1) * q.pageSize
    const [items, total] = await Promise.all([
      this.prisma.party.findMany({
        where,
        include: {
          venue: true,
          host: { select: { id: true, nickname: true } },
          _count: { select: { participations: true } },
        },
        orderBy: { startAt: 'asc' },
        skip,
        take: q.pageSize,
      }),
      this.prisma.party.count({ where }),
    ])
    return {
      items: items.map(toPartySummary),
      total,
      page: q.page,
      pageSize: q.pageSize,
      hasNext: skip + items.length < total,
    }
  }

  async getById(id: string) {
    const row = await this.prisma.party.findUnique({
      where: { id },
      include: {
        host: { include: { avatar: true } },
        venue: true,
        _count: { select: { participations: true } },
      },
    })
    if (!row)
      throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    const participations = await this.prisma.participation.findMany({
      where: { partyId: id, status: { in: ['confirmed', 'checked-in'] } },
      include: { user: { include: { avatar: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return {
      party: toParty(row),
      participants: participations.map(toParticipation),
    }
  }

  async create(hostId: string, dto: CreatePartyDto) {
    const host = await this.prisma.user.findUnique({ where: { id: hostId } })
    if (!host) throw new ForbiddenException({ code: 'forbidden', message: '권한이 없어요' })

    if (host.role === 'participant') {
      await this.prisma.user.update({ where: { id: hostId }, data: { role: 'host' } })
    }

    const start = new Date(dto.startAt)
    const end = new Date(dto.endAt)
    if (end <= start)
      throw new BadRequestException({ code: 'invalid_time', message: '종료가 시작보다 빨라요' })
    if (dto.maxParticipants < dto.minParticipants)
      throw new BadRequestException({
        code: 'invalid_capacity',
        message: '최대 인원 ≥ 최소 인원이어야 해요',
      })

    const created = await this.prisma.party.create({
      data: {
        title: dto.title,
        description: dto.description,
        hostId,
        venueId: dto.venueId,
        coverImageUrl: dto.coverImageUrl ?? null,
        startAt: start,
        endAt: end,
        minParticipants: dto.minParticipants,
        maxParticipants: dto.maxParticipants,
        category: dto.config.category,
        rotationMode: dto.config.rotationMode,
        roundDurationSec: dto.config.roundDurationSec,
        totalRounds: dto.config.totalRounds,
        breakBetweenRoundsSec: dto.config.breakBetweenRoundsSec,
        enableMidMatching: dto.config.enableMidMatching,
        enableFinalMatching: dto.config.enableFinalMatching,
        enableQuiz: dto.config.enableQuiz,
        enableQuestionCards: dto.config.enableQuestionCards,
        enableLiveOrders: dto.config.enableLiveOrders,
        enableAvatarOnly: dto.config.enableAvatarOnly,
        format: dto.config.format,
        rotationFormat: dto.config.rotationFormat,
        groupSize: dto.config.groupSize,
        matchScope: dto.config.matchScope,
        maxMatchesPerPerson: dto.config.maxMatchesPerPerson,
        contactExchangePolicy: dto.config.contactExchangePolicy ?? 'mutual-consent',
        connectionMode: legacyModeFromChannels(this.resolveChannels(dto.config)),
        connectionChannelsJson: toJsonString(this.resolveChannels(dto.config)),
        revealPopular: dto.config.revealPopular ?? true,
        groupAfterParty: dto.config.groupAfterParty,
        enableNotes: dto.config.enableNotes,
        noteDelivery: dto.config.noteDelivery,
        noteQuota: dto.config.noteQuota ?? 5,
        enableConversationKit: dto.config.enableConversationKit,
        basePriceKRW: dto.pricing.basePriceKRW,
        drinkPackage: dto.pricing.drinkPackage,
        snackPackage: dto.pricing.snackPackage,
        refundDeadlineHours: dto.pricing.refundDeadlineHours,
        pricingRulesJson: toJsonString(dto.pricing.pricingRules ?? []),
        genderRatioTarget: dto.recruitment.genderRatioTarget,
        ratioTolerance: dto.recruitment.ratioTolerance,
        maleCap: dto.recruitment.maleCap ?? null,
        femaleCap: dto.recruitment.femaleCap ?? null,
        minMale: dto.recruitment.minMale ?? null,
        minFemale: dto.recruitment.minFemale ?? null,
        autoCancelAt: dto.recruitment.autoCancelAt ? new Date(dto.recruitment.autoCancelAt) : null,
        autoCancelReason: dto.recruitment.autoCancelReason ?? null,
        tagsJson: toJsonString(dto.tags),
        ageMin: dto.ageMin ?? null,
        ageMax: dto.ageMax ?? null,
        maleAgeMin: dto.maleAgeMin ?? null,
        maleAgeMax: dto.maleAgeMax ?? null,
        femaleAgeMin: dto.femaleAgeMin ?? null,
        femaleAgeMax: dto.femaleAgeMax ?? null,
        requiredVerificationsJson: toJsonString(dto.requiredVerifications ?? []),
        maritalRequirementJson: toJsonString(dto.maritalRequirement ?? []),
        childrenPolicy: dto.childrenPolicy ?? 'any',
        genderRatio: dto.genderRatio ?? null,
      },
      include: { venue: true, host: { include: { avatar: true } } },
    })
    return toParty(created)
  }

  /** 즉석/당일 파티 빠른 개설. 기본값으로 즉시 OPEN. */
  async quickCreate(
    hostId: string,
    input: {
      category: PartyCategory
      title?: string
      venueId: string
      startInMinutes: number
      maxParticipants?: number
    },
  ) {
    const now = new Date()
    const startAt = new Date(now.getTime() + Math.max(15, input.startInMinutes) * 60_000)
    const endAt = new Date(startAt.getTime() + 2 * 3600_000)
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const label = CATEGORY_LABEL[input.category]
    const created = await this.prisma.party.create({
      data: {
        title: input.title ?? `즉석 ${label} 모임`,
        description: '지금 막 열린 모임이에요. 자유롭게 들러주세요!',
        hostId,
        venueId: input.venueId,
        startAt,
        endAt,
        minParticipants: 2,
        maxParticipants: input.maxParticipants ?? 8,
        status: 'open',
        category: input.category,
        rotationMode: 'random-shuffle',
        roundDurationSec: 300,
        totalRounds: 3,
        breakBetweenRoundsSec: 60,
        enableMidMatching: true,
        enableFinalMatching: false,
        enableQuiz: false,
        enableQuestionCards: true,
        enableLiveOrders: true,
        enableAvatarOnly: false,
        basePriceKRW: 0,
        drinkPackage: 'per-glass',
        snackPackage: 'none',
        tagsJson: toJsonString(['#즉석', '#당일', `#${label}`]),
        isInstant: true,
        quickCode: code,
      },
      include: { venue: true, host: { include: { avatar: true } } },
    })
    return toParty(created)
  }

  /** 우리 동네 — 사용자 area 또는 직접 지정 area의 파티 목록 */
  async neighborhood(userId: string, areaOverride?: string) {
    let area = areaOverride
    if (!area) {
      const u = await this.prisma.user.findUnique({ where: { id: userId } })
      area = u?.homeArea ?? undefined
    }
    if (!area) {
      return { area: null, items: [] as ReturnType<typeof toPartySummary>[] }
    }
    const items = await this.prisma.party.findMany({
      where: {
        status: { in: ['open', 'live'] },
        venue: { area: { contains: area } },
      },
      include: {
        venue: true,
        host: { select: { id: true, nickname: true } },
        _count: { select: { participations: true } },
      },
      orderBy: { startAt: 'asc' },
      take: 20,
    })
    return { area, items: items.map(toPartySummary) }
  }

  /** 지금 진행 중인/곧 시작하는 파티 — 1시간 이내 또는 LIVE */
  async happeningNow() {
    const now = new Date()
    const in1h = new Date(now.getTime() + 60 * 60_000)
    const items = await this.prisma.party.findMany({
      where: {
        OR: [{ status: 'live' }, { status: 'open', startAt: { lte: in1h } }],
      },
      include: {
        venue: true,
        host: { select: { id: true, nickname: true } },
        _count: { select: { participations: true } },
      },
      orderBy: { startAt: 'asc' },
      take: 10,
    })
    return items.map(toPartySummary)
  }

  /** 내가 받은 mutual 매칭들의 명함 목록 */
  async getMyMatchCards(userId: string) {
    const matches = await this.prisma.finalMatch.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        result: 'mutual',
      },
      orderBy: { matchedAt: 'desc' },
      take: 100,
      include: { party: { select: { id: true, title: true } } },
    })
    const partnerIds = matches.map((m) => (m.userAId === userId ? m.userBId : m.userAId))
    const partners = await this.prisma.user.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, nickname: true, avatarId: true },
    })
    const map = new Map(partners.map((p) => [p.id, p]))
    return matches.map((m) => {
      const pid = m.userAId === userId ? m.userBId : m.userAId
      const partner = map.get(pid)
      return {
        id: m.id,
        partnerUserId: pid,
        partnerNickname: partner?.nickname ?? '익명',
        partnerAvatarId: partner?.avatarId ?? null,
        partyId: m.partyId,
        partyTitle: m.party?.title ?? '',
        matchedAt: m.matchedAt.toISOString(),
      }
    })
  }

  /** 초대 코드(quickCode)로 단건 조회 — 미로그인 사용자에게도 일부 정보 공개 */
  async findByQuickCode(code: string) {
    const party = await this.prisma.party.findUnique({
      where: { quickCode: code },
      include: { venue: true, _count: { select: { participations: true } } },
    })
    if (!party) {
      throw new NotFoundException({
        code: 'invite_not_found',
        message: '초대 코드를 찾을 수 없어요',
      })
    }
    return {
      id: party.id,
      title: party.title,
      startAt: party.startAt.toISOString(),
      venueArea: party.venue?.area ?? '',
      venueName: party.venue?.name ?? '',
      category: party.category,
      quickCode: party.quickCode,
      currentParticipants: party._count.participations,
      maxParticipants: party.maxParticipants,
      status: party.status,
    }
  }

  async update(hostId: string, id: string, dto: UpdatePartyDto) {
    const existing = await this.prisma.party.findUnique({ where: { id } })
    if (!existing)
      throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (existing.hostId !== hostId)
      throw new ForbiddenException({
        code: 'forbidden',
        message: '본인이 호스트인 파티만 수정할 수 있어요',
      })

    const data: Record<string, unknown> = {}
    if (dto.title) data.title = dto.title
    if (dto.description) data.description = dto.description
    if (dto.coverImageUrl !== undefined) data.coverImageUrl = dto.coverImageUrl ?? null
    if (dto.startAt) data.startAt = new Date(dto.startAt)
    if (dto.endAt) data.endAt = new Date(dto.endAt)
    if (dto.minParticipants) data.minParticipants = dto.minParticipants
    if (dto.maxParticipants) data.maxParticipants = dto.maxParticipants
    if (dto.venueId) data.venueId = dto.venueId
    if (dto.tags) data.tagsJson = toJsonString(dto.tags)
    if (dto.ageMin !== undefined) data.ageMin = dto.ageMin ?? null
    if (dto.ageMax !== undefined) data.ageMax = dto.ageMax ?? null
    if (dto.maleAgeMin !== undefined) data.maleAgeMin = dto.maleAgeMin ?? null
    if (dto.maleAgeMax !== undefined) data.maleAgeMax = dto.maleAgeMax ?? null
    if (dto.femaleAgeMin !== undefined) data.femaleAgeMin = dto.femaleAgeMin ?? null
    if (dto.femaleAgeMax !== undefined) data.femaleAgeMax = dto.femaleAgeMax ?? null
    if (dto.requiredVerifications !== undefined)
      data.requiredVerificationsJson = toJsonString(dto.requiredVerifications ?? [])
    if (dto.maritalRequirement !== undefined)
      data.maritalRequirementJson = toJsonString(dto.maritalRequirement ?? [])
    if (dto.childrenPolicy !== undefined) data.childrenPolicy = dto.childrenPolicy
    if (dto.genderRatio !== undefined) data.genderRatio = dto.genderRatio ?? null
    if (dto.config) {
      Object.assign(data, {
        category: dto.config.category,
        rotationMode: dto.config.rotationMode,
        roundDurationSec: dto.config.roundDurationSec,
        totalRounds: dto.config.totalRounds,
        breakBetweenRoundsSec: dto.config.breakBetweenRoundsSec,
        enableMidMatching: dto.config.enableMidMatching,
        enableFinalMatching: dto.config.enableFinalMatching,
        enableQuiz: dto.config.enableQuiz,
        enableQuestionCards: dto.config.enableQuestionCards,
        enableLiveOrders: dto.config.enableLiveOrders,
        enableAvatarOnly: dto.config.enableAvatarOnly,
        format: dto.config.format,
        rotationFormat: dto.config.rotationFormat,
        groupSize: dto.config.groupSize,
        matchScope: dto.config.matchScope,
        maxMatchesPerPerson: dto.config.maxMatchesPerPerson,
        contactExchangePolicy: dto.config.contactExchangePolicy ?? 'mutual-consent',
        connectionMode: legacyModeFromChannels(this.resolveChannels(dto.config)),
        connectionChannelsJson: toJsonString(this.resolveChannels(dto.config)),
        revealPopular: dto.config.revealPopular ?? true,
        groupAfterParty: dto.config.groupAfterParty,
        enableNotes: dto.config.enableNotes,
        noteDelivery: dto.config.noteDelivery,
        noteQuota: dto.config.noteQuota ?? 5,
        enableConversationKit: dto.config.enableConversationKit,
      })
    }
    if (dto.pricing) {
      Object.assign(data, {
        basePriceKRW: dto.pricing.basePriceKRW,
        drinkPackage: dto.pricing.drinkPackage,
        snackPackage: dto.pricing.snackPackage,
        refundDeadlineHours: dto.pricing.refundDeadlineHours,
        pricingRulesJson: toJsonString(dto.pricing.pricingRules ?? []),
      })
    }
    if (dto.recruitment) {
      Object.assign(data, {
        genderRatioTarget: dto.recruitment.genderRatioTarget,
        ratioTolerance: dto.recruitment.ratioTolerance,
        maleCap: dto.recruitment.maleCap ?? null,
        femaleCap: dto.recruitment.femaleCap ?? null,
        minMale: dto.recruitment.minMale ?? null,
        minFemale: dto.recruitment.minFemale ?? null,
        autoCancelAt: dto.recruitment.autoCancelAt ? new Date(dto.recruitment.autoCancelAt) : null,
        autoCancelReason: dto.recruitment.autoCancelReason ?? null,
      })
    }
    const updated = await this.prisma.party.update({
      where: { id },
      data,
      include: { venue: true, host: { include: { avatar: true } } },
    })
    return toParty(updated)
  }

  /** 참가 자격(나이·혼인·아이·필수인증) 검사 — 미충족 시 예외. 신규·재참가 공통. */
  private async assertEligibleToJoin(
    party: {
      ageMin: number | null
      ageMax: number | null
      maleAgeMin: number | null
      maleAgeMax: number | null
      femaleAgeMin: number | null
      femaleAgeMax: number | null
      requiredVerificationsJson: string
      maritalRequirementJson: string
      childrenPolicy: string
    },
    userId: string,
  ) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        gender: true,
        birthYear: true,
        maritalStatus: true,
        hasChildren: true,
        verifiedFieldsJson: true,
      },
    })
    const eligibility = checkEligibility(
      {
        ageMin: party.ageMin,
        ageMax: party.ageMax,
        maleAgeMin: party.maleAgeMin,
        maleAgeMax: party.maleAgeMax,
        femaleAgeMin: party.femaleAgeMin,
        femaleAgeMax: party.femaleAgeMax,
        requiredVerifications: parseJsonArray<VerificationField>(party.requiredVerificationsJson),
        maritalRequirement: parseJsonArray<MaritalStatus>(party.maritalRequirementJson),
        childrenPolicy: party.childrenPolicy as ChildrenPolicy,
      },
      {
        gender: u?.gender,
        age: ageFromBirthYear(u?.birthYear ?? null, new Date().getFullYear()),
        maritalStatus: (u?.maritalStatus ?? null) as MaritalStatus | null,
        hasChildren: u?.hasChildren ?? null,
        verifiedFields: parseJsonArray<VerificationField>(u?.verifiedFieldsJson ?? '[]'),
      },
    )
    if (!eligibility.ok) {
      throw new BadRequestException({
        code: 'not_eligible',
        message: '참가 자격 조건을 충족하지 않아요',
        reasons: eligibility.reasons,
        missingVerifications: eligibility.missingVerifications,
      })
    }
  }

  async join(userId: string, partyId: string, note?: string | null) {
    const party = await this.prisma.party.findUnique({
      where: { id: partyId },
      include: { _count: { select: { participations: true } } },
    })
    if (!party)
      throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (party.status !== 'open')
      throw new BadRequestException({ code: 'party_closed', message: '신청이 마감된 파티에요' })

    // 성비 판단에 쓰는 신청자 성별 — 재참가·신규 양쪽에서 사용
    const joiner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    })
    const gender = joiner?.gender

    const existing = await this.prisma.participation.findUnique({
      where: { partyId_userId: { partyId, userId } },
    })
    if (existing) {
      if (existing.status === 'cancelled') {
        // 참가 자격 — 성별별 나이 · 혼인상태(돌싱 등) · 아이 유무 · 필수 인증
        await this.assertEligibleToJoin(party, userId)
        // 재참가도 정원·성비를 다시 평가 — 마감된 모임에 무조건 확정되지 않도록(대기열 가능)
        const { updated, status } = await this.prisma.$transaction(async (tx) => {
          const { status: decided, confirmedCount } = await this.evaluateAdmission(
            tx,
            party,
            gender,
          )
          const row = await tx.participation.update({
            where: { id: existing.id },
            data: { status: decided, note: note ?? null },
          })
          if (decided === 'confirmed') {
            await tx.user.update({
              where: { id: userId },
              data: { joinedCount: { increment: 1 } },
            })
            if (confirmedCount + 1 >= party.maxParticipants) {
              await tx.party.update({ where: { id: partyId }, data: { status: 'full' } })
            }
          }
          return { updated: row, status: decided }
        })
        if (status === 'confirmed') await this.promoteWaitlist(partyId)
        return toParticipation(updated)
      }
      throw new BadRequestException({ code: 'already_joined', message: '이미 신청한 파티에요' })
    }

    // 참가 자격 — 성별별 나이 · 혼인상태(돌싱 등) · 아이 유무 · 필수 인증
    await this.assertEligibleToJoin(party, userId)

    // 성비 자동 조절 — 정원 + 비례 성비(genderRatioTarget)를 모두 만족할 때만 확정, 아니면 대기열.
    // 판단·생성·정원 갱신을 한 트랜잭션으로 묶어 동시 신청에도 정원을 넘기지 않게 함.
    const { created, status } = await this.prisma.$transaction(async (tx) => {
      const { status: decided, confirmedCount } = await this.evaluateAdmission(tx, party, gender)
      const row = await tx.participation.create({
        data: { partyId, userId, status: decided, note: note ?? null },
        include: { user: { include: { avatar: true } } },
      })
      if (decided === 'confirmed') {
        await tx.user.update({
          where: { id: userId },
          data: { joinedCount: { increment: 1 } },
        })
        if (confirmedCount + 1 >= party.maxParticipants) {
          await tx.party.update({ where: { id: partyId }, data: { status: 'full' } })
        }
      }
      return { created: row, status: decided }
    })

    if (status === 'confirmed') {
      // 반대 성별이 충원돼 성비가 풀렸다면 대기열에서 자동 승급
      await this.promoteWaitlist(partyId)
      await this.prisma.notification
        .create({
          data: {
            userId: party.hostId,
            kind: 'party_join',
            title: '새 참가자',
            body: `${created.user?.nickname ?? '참가자'}님이 ${party.title}에 참가 신청했어요.`,
            link: `/host/parties/${partyId}`,
          },
        })
        .catch(() => undefined)
      this.notifEmitter.toUser(party.hostId, {
        kind: 'party_join',
        title: '새 참가자',
        body: `${created.user?.nickname ?? '참가자'}님이 참가 신청했어요.`,
        link: `/host/parties/${partyId}`,
      })
    }

    return toParticipation(created)
  }

  /**
   * 정원·성비를 평가해 확정/대기열 여부를 결정. 트랜잭션 안에서 호출해
   * 조회→판정→생성이 한 단위로 직렬화되도록 한다(동시 신청 정원 초과 방지).
   */
  private async evaluateAdmission(
    tx: Prisma.TransactionClient,
    party: Party,
    gender: string | null | undefined,
  ): Promise<{ status: 'confirmed' | 'waitlist'; confirmedCount: number }> {
    const counts = await this.genderCounts(party.id, tx)
    const confirmedCount = await tx.participation.count({
      where: { partyId: party.id, status: { in: ['confirmed', 'checked-in'] } },
    })
    let accept = confirmedCount < party.maxParticipants
    if (accept && (gender === 'male' || gender === 'female') && party.genderRatioTarget !== 'any') {
      accept = canAcceptGender(gender, counts, party.genderRatioTarget, {
        caps: { male: party.maleCap, female: party.femaleCap },
        tolerance: party.ratioTolerance,
      })
    }
    return { status: accept ? 'confirmed' : 'waitlist', confirmedCount }
  }

  /** 확정/체크인 참가자의 남녀 수 (트랜잭션 클라이언트도 주입 가능) */
  private async genderCounts(
    partyId: string,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<{ male: number; female: number }> {
    const parts = await client.participation.findMany({
      where: { partyId, status: { in: ['confirmed', 'checked-in'] } },
      include: { user: { select: { gender: true } } },
    })
    let male = 0
    let female = 0
    for (const p of parts) {
      if (p.user?.gender === 'male') male++
      else if (p.user?.gender === 'female') female++
    }
    return { male, female }
  }

  /** 성비/정원이 허용하는 한 대기열의 오래된 신청부터 자동 확정 */
  private async promoteWaitlist(partyId: string): Promise<void> {
    // 정원·성비 판정과 승급을 한 트랜잭션으로 직렬화 — 동시 호출(취소·참가) 시
    // 같은 대기자를 중복 승급하거나 정원을 초과하지 않게 한다.
    const { title, promotedUserIds } = await this.prisma.$transaction(async (tx) => {
      const party = await tx.party.findUnique({ where: { id: partyId } })
      if (!party) return { title: '', promotedUserIds: [] as string[] }
      const waitlisted = await tx.participation.findMany({
        where: { partyId, status: 'waitlist' },
        include: { user: { select: { gender: true } } },
        orderBy: { createdAt: 'asc' },
      })
      if (waitlisted.length === 0) return { title: party.title, promotedUserIds: [] }

      const counts = await this.genderCounts(partyId, tx)
      let confirmed = await tx.participation.count({
        where: { partyId, status: { in: ['confirmed', 'checked-in'] } },
      })
      const promoted: string[] = []

      for (const w of waitlisted) {
        if (confirmed >= party.maxParticipants) break
        const g = w.user?.gender
        let ok = true
        if ((g === 'male' || g === 'female') && party.genderRatioTarget !== 'any') {
          ok = canAcceptGender(g, counts, party.genderRatioTarget, {
            caps: { male: party.maleCap, female: party.femaleCap },
            tolerance: party.ratioTolerance,
          })
        }
        if (!ok) continue
        // 조건부 갱신 — 아직 waitlist일 때만 승급(동시 승급 멱등 처리)
        const res = await tx.participation.updateMany({
          where: { id: w.id, status: 'waitlist' },
          data: { status: 'confirmed' },
        })
        if (res.count === 0) continue
        await tx.user.update({
          where: { id: w.userId },
          data: { joinedCount: { increment: 1 } },
        })
        await tx.notification.create({
          data: {
            userId: w.userId,
            kind: 'party_join',
            title: '대기 → 확정! 🎉',
            body: `${party.title} 참가가 확정됐어요.`,
            link: `/parties/${partyId}`,
          },
        })
        if (g === 'male') counts.male++
        else if (g === 'female') counts.female++
        confirmed++
        promoted.push(w.userId)
      }
      return { title: party.title, promotedUserIds: promoted }
    })

    // 실시간 알림은 트랜잭션 커밋 후 발송(소켓 emit은 DB 트랜잭션 밖)
    for (const userId of promotedUserIds) {
      this.notifEmitter.toUser(userId, {
        kind: 'party_join',
        title: '대기 → 확정! 🎉',
        body: `${title} 참가가 확정됐어요.`,
        link: `/parties/${partyId}`,
      })
    }
  }

  async cancel(userId: string, partyId: string) {
    const p = await this.prisma.participation.findUnique({
      where: { partyId_userId: { partyId, userId } },
    })
    if (!p) throw new NotFoundException({ code: 'not_joined', message: '참여 기록이 없어요' })
    if (p.status === 'cancelled') return { ok: true, refund: null }

    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    const wasActive = p.status === 'confirmed' || p.status === 'checked-in'

    // 환불 정책 적용 — 결제 내역이 있으면 취소 시점·마감 기준으로 환불율 산정.
    let refund: ReturnType<typeof quoteRefund> | null = null
    const payment = await this.prisma.payment.findFirst({
      where: { partyId, userId, status: 'paid' },
      orderBy: { createdAt: 'desc' },
    })
    if (party && payment) {
      refund = quoteRefund(payment.amountKRW, {
        startAt: party.startAt,
        refundDeadlineHours: party.refundDeadlineHours,
        reason: 'participant-cancel',
      })
    }

    // 환불·참가취소·정원복구를 원자적으로 처리(부분 실패 방지).
    await this.prisma.$transaction(async (tx) => {
      if (payment && refund) {
        await tx.payment.update({
          where: { id: payment.id },
          data:
            refund.refundKRW > 0
              ? { status: 'refunded', refundedAt: new Date() }
              : { status: 'cancelled' },
        })
      }
      await tx.participation.update({ where: { id: p.id }, data: { status: 'cancelled' } })
      // 'full'이었던 경우에만 open으로 — 조건부 갱신으로 live/locked 강등 방지.
      await tx.party.updateMany({
        where: { id: partyId, status: 'full' },
        data: { status: 'open' },
      })
    })

    // 확정 참가자가 빠져 자리가 났으면 대기자 승급.
    if (wasActive) await this.promoteWaitlist(partyId)

    return { ok: true, refund }
  }

  async checkIn(hostId: string, partyId: string, userId: string, seatNumber?: number) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party || party.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트만 체크인할 수 있어요' })

    const updated = await this.prisma.participation.update({
      where: { partyId_userId: { partyId, userId } },
      data: { status: 'checked-in', checkedInAt: new Date(), seatNumber: seatNumber ?? null },
      include: { user: { include: { avatar: true } } },
    })
    return toParticipation(updated)
  }

  async myParties(userId: string) {
    const participations = await this.prisma.participation.findMany({
      where: { userId, status: { not: 'cancelled' } },
      include: {
        party: {
          include: {
            venue: true,
            host: { select: { id: true, nickname: true } },
            _count: { select: { participations: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return participations.map((p) => ({
      participation: { id: p.id, status: p.status },
      party: toPartySummary(p.party as never),
    }))
  }

  async hostedParties(hostId: string) {
    const items = await this.prisma.party.findMany({
      where: { hostId },
      include: {
        venue: true,
        host: { select: { id: true, nickname: true } },
        _count: { select: { participations: true } },
      },
      orderBy: { startAt: 'desc' },
    })
    return items.map(toPartySummary)
  }

  async lock(hostId: string, partyId: string) {
    const p = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!p || p.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트 권한이 필요해요' })
    return this.prisma.party.update({ where: { id: partyId }, data: { status: 'locked' } })
  }

  async start(hostId: string, partyId: string) {
    const p = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!p || p.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트 권한이 필요해요' })
    const [updated, participants] = await Promise.all([
      this.prisma.party.update({ where: { id: partyId }, data: { status: 'live' } }),
      this.prisma.participation.findMany({
        where: { partyId, status: { in: ['confirmed', 'checked-in'] } },
        select: { userId: true },
      }),
    ])
    const notifyParticipants = participants.filter((pp) => pp.userId !== hostId)
    await this.prisma.notification.createMany({
      data: notifyParticipants.map((pp) => ({
        userId: pp.userId,
        kind: 'party_starting',
        title: '🎉 파티가 시작됐어요!',
        body: `${p.title} 파티가 지금 시작됩니다.`,
        link: `/live/${partyId}`,
      })),
    })
    for (const pp of notifyParticipants) {
      this.notifEmitter.toUser(pp.userId, {
        kind: 'party_starting',
        title: '🎉 파티가 시작됐어요!',
        body: `${p.title}`,
        link: `/live/${partyId}`,
      })
    }
    return updated
  }

  async end(hostId: string, partyId: string) {
    const p = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!p || p.hostId !== hostId)
      throw new ForbiddenException({ code: 'forbidden', message: '호스트 권한이 필요해요' })
    return this.prisma.party.update({ where: { id: partyId }, data: { status: 'ended' } })
  }
}
