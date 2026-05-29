import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { CreateNoteDto, PartyNote } from '@rotifolk/shared'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { NotificationsEmitter } from '../notifications/notifications.emitter'

type NoteRow = Prisma.PartyNoteGetPayload<{
  include: { fromUser: { select: { nickname: true; avatarId: true } } }
}>

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifEmitter: NotificationsEmitter,
  ) {}

  async create(fromUserId: string, dto: CreateNoteDto): Promise<PartyNote> {
    const party = await this.prisma.party.findUnique({
      where: { id: dto.partyId },
      select: { id: true, enableNotes: true, noteDelivery: true, noteQuota: true },
    })
    if (!party)
      throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (!party.enableNotes)
      throw new BadRequestException({
        code: 'notes_disabled',
        message: '이 모임은 쪽지를 받지 않아요',
      })

    // 모임별 쪽지 상한 — 이미 보낸 쪽지 수가 한도 이상이면 거절(신중한 선택 유도).
    const sentCount = await this.prisma.partyNote.count({
      where: { partyId: dto.partyId, fromUserId },
    })
    if (sentCount >= party.noteQuota)
      throw new BadRequestException({
        code: 'note_quota_exceeded',
        message: '이 모임에서 보낼 수 있는 쪽지를 모두 사용했어요',
      })

    const deliveredAt = party.noteDelivery === 'instant' ? new Date() : null

    const created = await this.prisma.partyNote.create({
      data: {
        partyId: dto.partyId,
        fromUserId,
        toUserId: dto.toUserId,
        roundIndex: dto.roundIndex ?? null,
        body: dto.body,
        emoji: dto.emoji ?? null,
        shareContact: dto.shareContact,
        deliveredAt,
      },
      include: { fromUser: { select: { nickname: true, avatarId: true } } },
    })
    return this.toNote(created)
  }

  async inbox(userId: string): Promise<PartyNote[]> {
    const rows = await this.prisma.partyNote.findMany({
      where: { toUserId: userId, deliveredAt: { not: null } },
      include: { fromUser: { select: { nickname: true, avatarId: true } } },
      orderBy: { deliveredAt: 'desc' },
    })
    return rows.map((r) => this.toNote(r))
  }

  async forParty(
    userId: string,
    partyId: string,
  ): Promise<{ received: PartyNote[]; sent: PartyNote[] }> {
    const [received, sent] = await Promise.all([
      this.prisma.partyNote.findMany({
        where: { partyId, toUserId: userId, deliveredAt: { not: null } },
        include: { fromUser: { select: { nickname: true, avatarId: true } } },
        orderBy: { deliveredAt: 'desc' },
      }),
      this.prisma.partyNote.findMany({
        where: { partyId, fromUserId: userId },
        include: { fromUser: { select: { nickname: true, avatarId: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    return {
      received: received.map((r) => this.toNote(r)),
      sent: sent.map((r) => this.toNote(r)),
    }
  }

  async markRead(userId: string, id: string): Promise<PartyNote> {
    const row = await this.prisma.partyNote.findUnique({ where: { id } })
    if (!row) throw new NotFoundException()
    if (row.toUserId !== userId) throw new ForbiddenException()
    const updated = await this.prisma.partyNote.update({
      where: { id },
      data: { readAt: row.readAt ?? new Date() },
      include: { fromUser: { select: { nickname: true, avatarId: true } } },
    })
    return this.toNote(updated)
  }

  async deliverForParty(hostUserId: string, partyId: string): Promise<{ delivered: number }> {
    const party = await this.prisma.party.findUnique({
      where: { id: partyId },
      select: { id: true, hostId: true, title: true },
    })
    if (!party)
      throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (party.hostId !== hostUserId)
      throw new ForbiddenException({
        code: 'forbidden',
        message: '호스트만 쪽지를 전달할 수 있어요',
      })

    // 알림 대상(수신자별 보류 쪽지 수)을 먼저 집계 — updateMany는 행을 돌려주지 않음.
    const pending = await this.prisma.partyNote.groupBy({
      by: ['toUserId'],
      where: { partyId, deliveredAt: null },
      _count: { _all: true },
    })

    const result = await this.prisma.partyNote.updateMany({
      where: { partyId, deliveredAt: null },
      data: { deliveredAt: new Date() },
    })

    if (pending.length > 0) {
      await this.prisma.notification.createMany({
        data: pending.map((p) => ({
          userId: p.toUserId,
          kind: 'note_delivered',
          title: '💌 도착한 쪽지가 있어요',
          body: `${party.title} 모임에서 받은 쪽지 ${p._count._all}개가 도착했어요.`,
          link: `/notes/party/${partyId}`,
        })),
      })
      for (const p of pending) {
        this.notifEmitter.toUser(p.toUserId, {
          kind: 'note_delivered',
          title: '💌 도착한 쪽지가 있어요',
          body: `${party.title} 모임에서 받은 쪽지가 도착했어요.`,
          link: `/notes/party/${partyId}`,
        })
      }
    }

    return { delivered: result.count }
  }

  private toNote(row: NoteRow): PartyNote {
    return {
      id: row.id,
      partyId: row.partyId,
      fromUserId: row.fromUserId,
      fromNickname: row.fromUser?.nickname,
      fromAvatarId: row.fromUser?.avatarId ?? null,
      toUserId: row.toUserId,
      roundIndex: row.roundIndex,
      body: row.body,
      emoji: row.emoji,
      shareContact: row.shareContact,
      deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      // PartyNote는 불변(본문 수정 없음) — updatedAt 컬럼이 없어 createdAt과 동일.
      updatedAt: row.createdAt.toISOString(),
    }
  }
}
