import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

interface PostMessageInput {
  roomId: string
  userId: string
  body: string
  kind?: 'text' | 'system' | 'split-bill'
  meta?: Record<string, unknown> | null
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /** 파티 단톡방을 보장 — 없으면 생성하고 참가자 전원 가입. */
  async ensurePartyGroupRoom(partyId: string) {
    let room = await this.prisma.chatRoom.findFirst({
      where: { partyId, kind: 'group' },
    })
    if (room) return room

    const party = await this.prisma.party.findUnique({
      where: { id: partyId },
      include: {
        participations: { where: { status: { not: 'cancelled' } } },
        host: true,
      },
    })
    if (!party) throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })

    room = await this.prisma.chatRoom.create({
      data: {
        kind: 'group',
        partyId,
        title: party.title,
      },
    })
    const memberIds = new Set<string>([party.hostId, ...party.participations.map((p) => p.userId)])
    await this.prisma.chatMembership.createMany({
      data: [...memberIds].map((userId) => ({ roomId: room!.id, userId })),
    })
    return room
  }

  /** 양방향 매칭 시 두 사람 1:1 페어 채팅방 생성. */
  async ensurePairRoom(partyId: string, userAId: string, userBId: string) {
    const a = userAId < userBId ? userAId : userBId
    const b = userAId < userBId ? userBId : userAId
    const existing = await this.prisma.chatRoom.findFirst({
      where: {
        kind: 'pair',
        partyId,
        memberships: { every: { userId: { in: [a, b] } } },
      },
      include: { memberships: true },
    })
    if (existing && existing.memberships.length === 2) return existing

    const room = await this.prisma.chatRoom.create({
      data: {
        kind: 'pair',
        partyId,
        title: '매칭 채팅',
        memberships: {
          create: [{ userId: a }, { userId: b }],
        },
      },
    })
    return room
  }

  async listMyRooms(userId: string) {
    const memberships = await this.prisma.chatMembership.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            memberships: { include: { user: { include: { avatar: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            party: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return memberships.map((m) => ({
      id: m.room.id,
      kind: m.room.kind,
      title: m.room.title,
      partyId: m.room.partyId,
      partyTitle: m.room.party?.title ?? null,
      lastMessage: m.room.messages[0]
        ? {
            body: m.room.messages[0].body,
            kind: m.room.messages[0].kind,
            createdAt: m.room.messages[0].createdAt.toISOString(),
          }
        : null,
      members: m.room.memberships.map((mem) => ({
        userId: mem.userId,
        nickname: mem.user.nickname,
        avatarId: mem.user.avatarId,
      })),
      lastReadAt: m.lastReadAt?.toISOString() ?? null,
    }))
  }

  async listMessages(userId: string, roomId: string, limit = 60, beforeIso?: string) {
    await this.assertMember(userId, roomId)
    const items = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(beforeIso ? { createdAt: { lt: new Date(beforeIso) } } : {}),
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return items.reverse().map((m) => ({
      id: m.id,
      roomId: m.roomId,
      userId: m.userId,
      nickname: m.user.nickname,
      body: m.body,
      kind: m.kind,
      meta: m.metaJson ? safeParse(m.metaJson) : null,
      createdAt: m.createdAt.toISOString(),
    }))
  }

  async postMessage(input: PostMessageInput) {
    await this.assertMember(input.userId, input.roomId)
    const msg = await this.prisma.chatMessage.create({
      data: {
        roomId: input.roomId,
        userId: input.userId,
        body: input.body,
        kind: input.kind ?? 'text',
        metaJson: input.meta ? JSON.stringify(input.meta) : null,
      },
      include: { user: true },
    })
    await this.prisma.chatRoom.update({
      where: { id: input.roomId },
      data: { lastMessageAt: msg.createdAt },
    })
    return {
      id: msg.id,
      roomId: msg.roomId,
      userId: msg.userId,
      nickname: msg.user.nickname,
      body: msg.body,
      kind: msg.kind,
      meta: msg.metaJson ? safeParse(msg.metaJson) : null,
      createdAt: msg.createdAt.toISOString(),
    }
  }

  async unreadCount(userId: string) {
    const memberships = await this.prisma.chatMembership.findMany({
      where: { userId },
      select: {
        roomId: true,
        lastReadAt: true,
        room: { select: { lastMessageAt: true } },
      },
    })
    let rooms = 0
    let count = 0
    for (const m of memberships) {
      const lastMsg = m.room.lastMessageAt
      if (!lastMsg) continue
      if (!m.lastReadAt || lastMsg > m.lastReadAt) {
        rooms += 1
        // Compute exact message count newer than lastReadAt
        const c = await this.prisma.chatMessage.count({
          where: {
            roomId: m.roomId,
            userId: { not: userId },
            ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
          },
        })
        count += c
      }
    }
    return { count, rooms }
  }

  async markRead(userId: string, roomId: string) {
    await this.assertMember(userId, roomId)
    await this.prisma.chatMembership.update({
      where: { roomId_userId: { roomId, userId } },
      data: { lastReadAt: new Date() },
    })
    return { ok: true }
  }

  private async assertMember(userId: string, roomId: string) {
    const m = await this.prisma.chatMembership.findUnique({
      where: { roomId_userId: { roomId, userId } },
    })
    if (!m) throw new ForbiddenException({ code: 'not_a_member', message: '이 채팅방의 멤버가 아니에요' })
  }
}

function safeParse(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s)
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}
