import type { User as PrismaUser, Avatar as PrismaAvatar } from '@prisma/client'
import type { User } from '@rotifolk/shared'
import { parseJsonArray } from '@/common/json-utils'

type DbUser = PrismaUser & { avatar?: PrismaAvatar | null }

export function toPublicUser(user: DbUser): User {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role as User['role'],
    avatarId: user.avatarId,
    bio: user.bio,
    gender: user.gender as User['gender'],
    birthYear: user.birthYear,
    interests: parseJsonArray<string>(user.interestsJson),
    mbti: user.mbti,
    trustScore: user.trustScore,
    hostedCount: user.hostedCount,
    joinedCount: user.joinedCount,
    isVerified: user.isVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

export function toPublicSummary(user: DbUser) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatarId: user.avatarId,
    bio: user.bio,
    mbti: user.mbti,
    interests: parseJsonArray<string>(user.interestsJson),
    trustScore: user.trustScore,
    isVerified: user.isVerified,
  }
}
