import type { User as PrismaUser, Avatar as PrismaAvatar } from '@prisma/client'
import type { User } from '@rotifolk/shared'
import { parseJsonArray, parseJsonObject } from '@/common/json-utils'

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
    phone: user.phone,
    shareContact: user.shareContact,
    kakaoId: user.kakaoId,
    shareKakao: user.shareKakao,
    instagram: user.instagram,
    shareInstagram: user.shareInstagram,
    avoidSameCompany: user.avoidSameCompany,
    showLikesReceived: user.showLikesReceived,
    joinPopularityRanking: user.joinPopularityRanking,
    profile: parseJsonObject(user.profileJson) as User['profile'],
    occupation: user.occupation,
    company: user.company,
    incomeBand: user.incomeBand as User['incomeBand'],
    maritalStatus: user.maritalStatus as User['maritalStatus'],
    education: user.education as User['education'],
    verifiedFields: parseJsonArray(user.verifiedFieldsJson) as User['verifiedFields'],
    visibility: parseJsonObject(user.visibilityJson) as User['visibility'],
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
    verifiedFields: parseJsonArray(user.verifiedFieldsJson) as User['verifiedFields'],
  }
}
