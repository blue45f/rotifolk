import { Injectable, NotFoundException } from '@nestjs/common'
import type { UpdateProfileDto } from '@rotifolk/shared'
import { PrismaService } from '@/prisma/prisma.service'
import { WITHDRAWN_ACCOUNT_STATUS } from '@/common/account-status'
import { toJsonString } from '@/common/json-utils'
import { toPublicUser, toViewerProfile } from './user.mapper'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(viewerId: string, id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { avatar: true } })
    if (!user) throw new NotFoundException({ code: 'user_not_found', message: '사용자가 없어요' })
    return toViewerProfile(user, viewerId)
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const data: Record<string, unknown> = {}
    if (dto.nickname !== undefined) data.nickname = dto.nickname
    if (dto.bio !== undefined) data.bio = dto.bio
    if (dto.interests !== undefined) data.interestsJson = toJsonString(dto.interests)
    if (dto.mbti !== undefined) data.mbti = dto.mbti

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: { avatar: true },
    })
    return toPublicUser(updated)
  }

  async promoteToHost(id: string) {
    const u = await this.prisma.user.update({
      where: { id },
      data: { role: 'host' },
      include: { avatar: true },
    })
    return toPublicUser(u)
  }

  async deleteAccount(id: string) {
    const withdrawnAt = new Date()
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          accountStatus: WITHDRAWN_ACCOUNT_STATUS,
          withdrawnAt,
          suspendedAt: null,
          email: withdrawnEmail(id),
          passwordHash: null,
          provider: WITHDRAWN_ACCOUNT_STATUS,
          googleSub: null,
          nickname: '탈퇴한 사용자',
          role: 'participant',
          bio: null,
          gender: null,
          birthYear: null,
          interestsJson: '[]',
          mbti: null,
          trustScore: 0,
          isVerified: false,
          homeArea: null,
          homeLat: null,
          homeLng: null,
          phone: null,
          phoneHash: null,
          shareContact: false,
          kakaoId: null,
          shareKakao: false,
          instagram: null,
          shareInstagram: false,
          avoidSameCompany: false,
          profileJson: '{}',
          occupation: null,
          company: null,
          incomeBand: null,
          maritalStatus: null,
          hasChildren: null,
          education: null,
          verifiedFieldsJson: '[]',
          visibilityJson: '{}',
          showLikesReceived: false,
          joinPopularityRanking: false,
          referralCode: withdrawnReferralCode(id),
          pointsKRW: 0,
          avatarId: null,
        },
      })
      await tx.avatar.deleteMany({ where: { ownerId: id } })
      await tx.follow.deleteMany({ where: { OR: [{ followerId: id }, { followingId: id }] } })
      await tx.userBlock.deleteMany({ where: { OR: [{ blockerId: id }, { blockedId: id }] } })
      await tx.savedParty.deleteMany({ where: { userId: id } })
      await tx.notification.deleteMany({ where: { userId: id } })
      await tx.avoidContact.deleteMany({ where: { userId: id } })
      await tx.photoLike.deleteMany({ where: { userId: id } })
      await tx.partyPhoto.deleteMany({ where: { userId: id } })
      await tx.partyNote.updateMany({ where: { fromUserId: id }, data: { shareContact: false } })
      await tx.contactExchangeRequest.updateMany({
        where: { OR: [{ requesterId: id }, { receiverId: id }], status: 'pending' },
        data: { status: 'rejected', decidedAt: withdrawnAt, decidedById: null },
      })
    })
    return { ok: true }
  }

  async getReferralSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, pointsKRW: true },
    })
    if (!user) {
      return { referralCode: '', pointsKRW: 0, referredCount: 0 }
    }
    const referredCount = await this.prisma.referral.count({
      where: { referrerId: userId },
    })
    return {
      referralCode: user.referralCode,
      pointsKRW: user.pointsKRW,
      referredCount,
    }
  }
}

function withdrawnEmail(id: string): string {
  return `withdrawn-${id}@withdrawn.rotifolk.invalid`
}

function withdrawnReferralCode(id: string): string {
  return `withdrawn-${id}`
}
