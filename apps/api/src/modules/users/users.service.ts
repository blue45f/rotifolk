import { Injectable, NotFoundException } from '@nestjs/common'
import type { UpdateProfileDto } from '@rotifolk/shared'
import { PrismaService } from '@/prisma/prisma.service'
import { toJsonString } from '@/common/json-utils'
import { toPublicUser } from './user.mapper'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { avatar: true } })
    if (!user) throw new NotFoundException({ code: 'user_not_found', message: '사용자가 없어요' })
    return toPublicUser(user)
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
