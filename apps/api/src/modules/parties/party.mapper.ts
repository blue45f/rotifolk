import type {
  Party as PrismaParty,
  User as PrismaUser,
  Avatar as PrismaAvatar,
  Venue as PrismaVenue,
  Participation as PrismaParticipation,
} from '@prisma/client'
import type {
  Party,
  PartySummary,
  Participation,
  PartyCategory,
  RotationMode,
  PartyStatus,
  DrinkPackage,
  SnackPackage,
  PartyFormat,
  RotationFormat,
  MatchScope,
  ConnectionMode,
  NoteDelivery,
} from '@rotifolk/shared'
import { parseJsonArray } from '@/common/json-utils'
import { toPublicSummary } from '../users/user.mapper'

type HostShape = {
  id: string
  nickname: string
  avatarId?: string | null
  avatar?: PrismaAvatar | null
} & Partial<PrismaUser>

type PartyRow = PrismaParty & {
  host?: HostShape | null
  venue?: PrismaVenue | null
  _count?: { participations: number }
}

export function toParty(row: PartyRow, participationCount?: number): Party {
  const count = participationCount ?? row._count?.participations ?? 0
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    hostId: row.hostId,
    host: row.host ? (toPublicSummary(row.host as never) as never) : undefined,
    venueId: row.venueId,
    coverImageUrl: row.coverImageUrl,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    minParticipants: row.minParticipants,
    maxParticipants: row.maxParticipants,
    currentParticipants: count,
    status: row.status as PartyStatus,
    tags: parseJsonArray<string>(row.tagsJson),
    ageMin: row.ageMin,
    ageMax: row.ageMax,
    genderRatio: (row.genderRatio as Party['genderRatio']) ?? null,
    config: {
      category: row.category as PartyCategory,
      rotationMode: row.rotationMode as RotationMode,
      roundDurationSec: row.roundDurationSec,
      totalRounds: row.totalRounds,
      breakBetweenRoundsSec: row.breakBetweenRoundsSec,
      enableMidMatching: row.enableMidMatching,
      enableFinalMatching: row.enableFinalMatching,
      enableQuiz: row.enableQuiz,
      enableQuestionCards: row.enableQuestionCards,
      enableLiveOrders: row.enableLiveOrders,
      enableAvatarOnly: row.enableAvatarOnly,
      format: row.format as PartyFormat,
      rotationFormat: row.rotationFormat as RotationFormat,
      groupSize: row.groupSize,
      matchScope: row.matchScope as MatchScope,
      maxMatchesPerPerson: row.maxMatchesPerPerson,
      connectionMode: row.connectionMode as ConnectionMode,
      groupAfterParty: row.groupAfterParty,
      enableNotes: row.enableNotes,
      noteDelivery: row.noteDelivery as NoteDelivery,
      enableConversationKit: row.enableConversationKit,
    },
    pricing: {
      basePriceKRW: row.basePriceKRW,
      drinkPackage: row.drinkPackage as DrinkPackage,
      snackPackage: row.snackPackage as SnackPackage,
      refundDeadlineHours: row.refundDeadlineHours,
    },
    recruitment: {
      genderRatioTarget: row.genderRatioTarget,
      ratioTolerance: row.ratioTolerance,
      maleCap: row.maleCap,
      femaleCap: row.femaleCap,
      minMale: row.minMale,
      minFemale: row.minFemale,
      autoCancelAt: row.autoCancelAt ? row.autoCancelAt.toISOString() : null,
      autoCancelReason: row.autoCancelReason,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function toPartySummary(row: PartyRow): PartySummary {
  const count = row._count?.participations ?? 0
  return {
    id: row.id,
    title: row.title,
    coverImageUrl: row.coverImageUrl,
    startAt: row.startAt.toISOString(),
    currentParticipants: count,
    maxParticipants: row.maxParticipants,
    status: row.status as PartyStatus,
    tags: parseJsonArray<string>(row.tagsJson),
    category: row.category as PartyCategory,
    format: row.format as PartyFormat,
    venueName: row.venue?.name ?? '',
    venueArea: row.venue?.area ?? '',
    basePriceKRW: row.basePriceKRW,
    drinkPackage: row.drinkPackage as DrinkPackage,
    snackPackage: row.snackPackage as SnackPackage,
    hostId: row.hostId,
    hostNickname: row.host?.nickname ?? '',
  }
}

export function toParticipation(
  row: PrismaParticipation & { user?: (PrismaUser & { avatar?: PrismaAvatar | null }) | null },
): Participation {
  return {
    id: row.id,
    partyId: row.partyId,
    userId: row.userId,
    status: row.status as Participation['status'],
    seatNumber: row.seatNumber,
    checkedInAt: row.checkedInAt ? row.checkedInAt.toISOString() : null,
    user: row.user ? (toPublicSummary(row.user as never) as never) : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
