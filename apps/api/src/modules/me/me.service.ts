import { createHash } from 'node:crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { detectAvoidOverlaps, normalizePhoneKR } from '@rotifolk/shared'
import type {
  AddAvoidContactsDto,
  AddAvoidPersonDto,
  AvoidPrefsDto,
  AvoidReason,
  PreProfileDto,
  PrivacyPrefsDto,
  UpdateContactDto,
  UpdateTrustProfileDto,
  VerificationField,
  VerifyFieldDto,
} from '@rotifolk/shared'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { parseJsonArray, toJsonString } from '@/common/json-utils'

/** 연락처 페퍼 — 원본 번호는 저장하지 않고 해시 대조에만 사용. */
const PEPPER = process.env.CONTACT_PEPPER ?? 'rotifolk-pepper'

/** 정규화된 번호 + 페퍼의 sha256 — 원본 미보관 지인 회피 대조용. */
function hashPhone(phone: string): string {
  return createHash('sha256')
    .update(PEPPER + normalizePhoneKR(phone))
    .digest('hex')
}

export interface AvoidContactDto {
  id: string
  label: string | null
  createdAt: string
}

export interface AvoidMatchDto {
  userId: string
  nickname: string
  reasons: AvoidReason[]
}

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  /** 사전 프로필 저장 — 이상형/대화 프롬프트/찾는 관계/한 줄. */
  async updateProfile(userId: string, dto: PreProfileDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { profileJson: toJsonString(dto) },
    })
    return { profile: dto }
  }

  /** 신상 정보 + 필드별 공개범위 저장 (제공된 필드만 갱신). */
  async updateTrust(userId: string, dto: UpdateTrustProfileDto) {
    const data: Prisma.UserUpdateInput = {}
    if (dto.occupation !== undefined) data.occupation = dto.occupation
    if (dto.company !== undefined) data.company = dto.company
    if (dto.incomeBand !== undefined) data.incomeBand = dto.incomeBand
    if (dto.maritalStatus !== undefined) data.maritalStatus = dto.maritalStatus
    if (dto.hasChildren !== undefined) data.hasChildren = dto.hasChildren
    if (dto.education !== undefined) data.education = dto.education
    if (dto.visibility !== undefined) data.visibilityJson = toJsonString(dto.visibility)

    await this.prisma.user.update({ where: { id: userId }, data })
    return { ok: true }
  }

  /**
   * 신상 인증 — 증빙(evidence)은 검증 후 폐기하고 결과(배지)만 저장.
   * 소득 인증 시 구간만 함께 저장(정확액 미저장).
   */
  async verify(userId: string, dto: VerifyFieldDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { verifiedFieldsJson: true },
    })
    const verifiedFields = parseJsonArray<VerificationField>(user.verifiedFieldsJson)
    if (!verifiedFields.includes(dto.field)) verifiedFields.push(dto.field)

    const data: Prisma.UserUpdateInput = { verifiedFieldsJson: toJsonString(verifiedFields) }
    if (dto.field === 'income' && dto.incomeBand) data.incomeBand = dto.incomeBand
    // dto.evidence 는 의도적으로 저장하지 않음 (개인정보 최소화).

    await this.prisma.user.update({ where: { id: userId }, data })
    return { verifiedFields }
  }

  /**
   * 연결 채널 저장 — 번호/카톡/인스타 핸들 + 채널별 공개 동의.
   * 번호는 원본과 함께 해시도 보관해 회피 대조에 사용.
   */
  async updateContact(userId: string, dto: UpdateContactDto) {
    // 공개 동의(share*)를 켜는 채널은 핸들(이번 요청 또는 기존 저장값)이 비어있으면 안 됨.
    // 부분 토글({ shareKakao: true })도 들어오므로 기존 저장값까지 고려해 검사.
    const enabling =
      dto.shareContact === true || dto.shareKakao === true || dto.shareInstagram === true
    if (enabling) {
      const current = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, kakaoId: true, instagram: true },
      })
      const effective = (incoming: string | null | undefined, saved: string | null | undefined) =>
        (incoming !== undefined ? incoming : saved)?.trim() ?? ''
      const checks: Array<[boolean, string, string]> = [
        [dto.shareContact === true, effective(dto.phone, current?.phone), '전화번호'],
        [dto.shareKakao === true, effective(dto.kakaoId, current?.kakaoId), '카카오톡 아이디'],
        [
          dto.shareInstagram === true,
          effective(dto.instagram, current?.instagram),
          '인스타그램 아이디',
        ],
      ]
      for (const [on, handle, label] of checks) {
        if (on && !handle)
          throw new BadRequestException({
            code: 'handle_required',
            message: `${label}를 입력해야 공개할 수 있어요`,
          })
      }
    }

    const data: Prisma.UserUpdateInput = {}
    if (dto.phone !== undefined) {
      data.phone = dto.phone
      data.phoneHash = dto.phone ? hashPhone(dto.phone) : null
    }
    if (dto.shareContact !== undefined) data.shareContact = dto.shareContact
    if (dto.kakaoId !== undefined) data.kakaoId = dto.kakaoId
    if (dto.shareKakao !== undefined) data.shareKakao = dto.shareKakao
    if (dto.instagram !== undefined) data.instagram = dto.instagram
    if (dto.shareInstagram !== undefined) data.shareInstagram = dto.shareInstagram

    await this.prisma.user.update({ where: { id: userId }, data })
    return { ok: true }
  }

  /** 민감 정보 노출 설정 — 받은 호감 수·인기 랭킹 참여. */
  async updatePrivacy(userId: string, dto: PrivacyPrefsDto) {
    const data: Prisma.UserUpdateInput = {}
    if (dto.showLikesReceived !== undefined) data.showLikesReceived = dto.showLikesReceived
    if (dto.joinPopularityRanking !== undefined)
      data.joinPopularityRanking = dto.joinPopularityRanking

    const u = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { showLikesReceived: true, joinPopularityRanking: true },
    })
    return u
  }

  /** 내 회피 연락처 목록 (해시만 저장 — 원본 번호는 반환하지 않음). */
  async listAvoid(userId: string): Promise<AvoidContactDto[]> {
    const rows = await this.prisma.avoidContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      createdAt: r.createdAt.toISOString(),
    }))
  }

  /** 회피 연락처 추가 — 번호는 해시로만 저장(원본 미보관), 중복은 건너뜀. */
  async addAvoid(userId: string, dto: AddAvoidContactsDto) {
    const label = dto.label ?? null
    let added = 0
    for (const phone of dto.phones) {
      const phoneHash = hashPhone(phone)
      const existing = await this.prisma.avoidContact.findUnique({
        where: { userId_phoneHash: { userId, phoneHash } },
        select: { id: true },
      })
      if (existing) continue
      await this.prisma.avoidContact.create({ data: { userId, phoneHash, label } })
      added += 1
    }
    return { added }
  }

  /**
   * 마주치기 싫은 사람 1명 추가 — 번호는 해시로만 저장(원본 미보관).
   * 이미 등록된 번호면 라벨만 갱신(upsert). 해시는 절대 반환하지 않음.
   */
  async addAvoidPerson(userId: string, dto: AddAvoidPersonDto): Promise<AvoidContactDto> {
    const phoneHash = hashPhone(dto.phone)
    const label = dto.label ?? null
    const row = await this.prisma.avoidContact.upsert({
      where: { userId_phoneHash: { userId, phoneHash } },
      create: { userId, phoneHash, label },
      update: { label },
    })
    return {
      id: row.id,
      label: row.label,
      createdAt: row.createdAt.toISOString(),
    }
  }

  /** 회피 연락처 삭제 (본인 소유 항목만). */
  async removeAvoid(userId: string, id: string) {
    await this.prisma.avoidContact.deleteMany({ where: { id, userId } })
    return { ok: true }
  }

  /** 회피 선호 저장 — 같은 회사 자동 회피 토글. */
  async updateAvoidPrefs(userId: string, dto: AvoidPrefsDto) {
    const data: Prisma.UserUpdateInput = {}
    if (dto.avoidSameCompany !== undefined) data.avoidSameCompany = dto.avoidSameCompany
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { avoidSameCompany: true },
    })
    return { avoidSameCompany: user.avoidSameCompany }
  }

  /**
   * 같은 모임에 회피/차단 대상이 있는지 검사 (해시 대조 기반, 양방향).
   * 원본 번호 비교 없이 해시·차단·회사 정보만으로 판단.
   */
  async avoidCheck(userId: string, partyId: string): Promise<AvoidMatchDto[]> {
    const rows = await this.prisma.participation.findMany({
      where: { partyId, status: { in: ['confirmed', 'checked-in'] }, userId: { not: userId } },
      select: {
        user: {
          select: { id: true, nickname: true, phoneHash: true, company: true },
        },
      },
    })
    // 게스트(비로그인)는 연락처/회사 정보가 없어 회피 대조 대상이 아니다.
    const parts = rows.flatMap((p) => (p.user ? [{ user: p.user }] : []))

    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { phoneHash: true, company: true, avoidSameCompany: true },
    })

    const myAvoid = await this.prisma.avoidContact.findMany({
      where: { userId },
      select: { phoneHash: true },
    })

    const blocks = await this.prisma.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    })
    const blockedUserIds = new Set<string>()
    for (const b of blocks) {
      blockedUserIds.add(b.blockerId === userId ? b.blockedId : b.blockerId)
    }

    // 양방향 감지 — 참가자가 나를 회피 목록에 넣었는지 확인.
    const attendeeIds = parts.map((p) => p.user.id)
    const theirAvoid =
      attendeeIds.length > 0
        ? await this.prisma.avoidContact.findMany({
            where: { userId: { in: attendeeIds } },
            select: { userId: true, phoneHash: true },
          })
        : []
    const theirAvoidByUser = new Map<string, string[]>()
    for (const a of theirAvoid) {
      const list = theirAvoidByUser.get(a.userId) ?? []
      list.push(a.phoneHash)
      theirAvoidByUser.set(a.userId, list)
    }

    const overlaps = detectAvoidOverlaps(
      {
        myPhoneHash: me.phoneHash,
        myAvoidHashes: myAvoid.map((a) => a.phoneHash),
        myBlockedUserIds: [...blockedUserIds],
        myCompany: me.company,
        avoidSameCompany: me.avoidSameCompany ?? false,
      },
      parts.map((p) => ({
        userId: p.user.id,
        phoneHash: p.user.phoneHash,
        avoidHashes: theirAvoidByUser.get(p.user.id) ?? [],
        company: p.user.company,
      })),
    )

    const nickById = new Map(parts.map((p) => [p.user.id, p.user.nickname]))
    return overlaps.map((o) => ({
      userId: o.userId,
      nickname: nickById.get(o.userId) ?? '익명',
      reasons: o.reasons,
    }))
  }
}
