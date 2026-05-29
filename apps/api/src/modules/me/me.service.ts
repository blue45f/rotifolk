import { createHash } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import {
  detectAvoidOverlaps,
  normalizePhoneKR,
  type AddAvoidContactsDto,
  type AvoidReason,
  type PreProfileDto,
  type UpdateContactDto,
  type UpdateTrustProfileDto,
  type VerificationField,
  type VerifyFieldDto,
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

  /** 연락처 저장 — 원본 번호와 함께 해시도 보관해 회피 대조에 사용. */
  async updateContact(userId: string, dto: UpdateContactDto) {
    const data: Prisma.UserUpdateInput = {}
    if (dto.phone !== undefined) {
      data.phone = dto.phone
      data.phoneHash = dto.phone ? hashPhone(dto.phone) : null
    }
    if (dto.shareContact !== undefined) data.shareContact = dto.shareContact

    await this.prisma.user.update({ where: { id: userId }, data })
    return { ok: true }
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

  /** 회피 연락처 삭제. */
  async removeAvoid(userId: string, id: string) {
    await this.prisma.avoidContact.deleteMany({ where: { id, userId } })
    return { ok: true }
  }

  /**
   * 같은 모임에 회피/차단 대상이 있는지 검사 (해시 대조 기반, 양방향).
   * 원본 번호 비교 없이 해시·차단·회사 정보만으로 판단.
   */
  async avoidCheck(userId: string, partyId: string): Promise<AvoidMatchDto[]> {
    const parts = await this.prisma.participation.findMany({
      where: { partyId, status: { in: ['confirmed', 'checked-in'] }, userId: { not: userId } },
      select: {
        user: {
          select: { id: true, nickname: true, phoneHash: true, company: true },
        },
      },
    })

    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { phoneHash: true, company: true },
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
        avoidSameCompany: true,
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
