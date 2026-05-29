import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { CreateNoteDto, PartyNote } from '@rotifolk/shared'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'

type NoteRow = Prisma.PartyNoteGetPayload<{
  include: { fromUser: { select: { nickname: true; avatarId: true } } }
}>

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(fromUserId: string, dto: CreateNoteDto): Promise<PartyNote> {
    const party = await this.prisma.party.findUnique({
      where: { id: dto.partyId },
      select: { id: true, enableNotes: true, noteDelivery: true },
    })
    if (!party)
      throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (!party.enableNotes)
      throw new BadRequestException({
        code: 'notes_disabled',
        message: '이 모임은 쪽지를 받지 않아요',
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
      select: { id: true, hostId: true },
    })
    if (!party)
      throw new NotFoundException({ code: 'party_not_found', message: '파티를 찾을 수 없어요' })
    if (party.hostId !== hostUserId)
      throw new ForbiddenException({ message: '호스트만 쪽지를 전달할 수 있어요' })

    const result = await this.prisma.partyNote.updateMany({
      where: { partyId, deliveredAt: null },
      data: { deliveredAt: new Date() },
    })
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
      updatedAt: row.createdAt.toISOString(),
    }
  }
}
