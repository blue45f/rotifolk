import { Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import {
  PARTY_ROOM,
  USER_ROOM,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@rotifolk/shared'
import type { JwtUserPayload } from '@/common/current-user.decorator'
import { PrismaService } from '@/prisma/prisma.service'
import { parseJsonArray, parseJsonObject } from '@/common/json-utils'
import { MatchingService } from '../matching/matching.service'
import { QuizService } from '../quiz/quiz.service'
import { OrdersService } from '../orders/orders.service'
import { NotificationsEmitter } from '../notifications/notifications.emitter'
import { ChatEventsEmitter } from '../chat/chat-events.emitter'
import { LiveOrchestrator } from './live.orchestrator'

type AuthedSocket = Socket<ClientToServerEvents, ServerToClientEvents> & {
  data: { user?: JwtUserPayload }
}

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  transports: ['websocket', 'polling'],
})
export class LiveGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(LiveGateway.name)

  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
    private readonly quiz: QuizService,
    private readonly orders: OrdersService,
    private readonly notifEmitter: NotificationsEmitter,
    private readonly chatEvents: ChatEventsEmitter,
    private readonly orchestrator: LiveOrchestrator,
  ) {}

  afterInit(server: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.notifEmitter.setServer(server)
    this.chatEvents.setServer(server)
  }

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '') ??
        ''
      if (!token) {
        client.disconnect()
        return
      }
      const payload = this.jwt.verify<JwtUserPayload>(token)
      client.data.user = payload
      client.join(USER_ROOM(payload.sub))
      this.logger.log(`socket connected: ${client.id} (${payload.email})`)
    } catch {
      client.disconnect()
    }
  }

  handleDisconnect(client: AuthedSocket) {
    this.logger.log(`socket disconnected: ${client.id}`)
  }

  @SubscribeMessage('party:join')
  async onJoin(@ConnectedSocket() client: AuthedSocket, @MessageBody() data: { partyId: string }) {
    if (!client.data.user) return
    client.join(PARTY_ROOM(data.partyId))
    const party = await this.prisma.party.findUnique({
      where: { id: data.partyId },
      include: { _count: { select: { participations: true } } },
    })
    if (!party) return
    client.emit('party:state', {
      partyId: party.id,
      status: party.status as 'open' | 'live' | 'locked' | 'ended',
      currentRoundIndex: party.currentRoundIndex || null,
      participantCount: party._count.participations,
    })
  }

  @SubscribeMessage('party:leave')
  onLeave(@ConnectedSocket() client: AuthedSocket, @MessageBody() data: { partyId: string }) {
    client.leave(PARTY_ROOM(data.partyId))
  }

  @SubscribeMessage('host:round:start')
  async onRoundStart(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { partyId: string },
  ) {
    if (!(await this.assertHost(client, data.partyId))) return
    const room = PARTY_ROOM(data.partyId)
    const started = await this.orchestrator.startNextRound(
      data.partyId,
      (remainingSec, roundIndex) => {
        this.server.to(room).emit('round:tick', { roundIndex, remainingSec })
      },
      (roundIndex) => {
        this.server.to(room).emit('round:ended', { roundIndex })
      },
    )
    if (!started) {
      client.emit('toast', { kind: 'warning', message: '더 진행할 라운드가 없어요.' })
      return
    }
    const { round, endsAt } = started

    this.server.to(room).emit('round:started', {
      round: {
        id: round.id,
        partyId: round.partyId,
        index: round.index,
        status: 'live',
        durationSec: round.durationSec,
        startedAt: round.startedAt?.toISOString() ?? null,
        finishedAt: null,
        pairs: round.pairs.map((p) => ({
          id: p.id,
          roundId: p.roundId,
          seatLabel: p.seatLabel,
          memberIds: parseJsonArray<string>(p.memberIdsJson),
        })),
        createdAt: round.createdAt.toISOString(),
        updatedAt: round.updatedAt.toISOString(),
      },
      endsAtIso: endsAt.toISOString(),
    })
  }

  @SubscribeMessage('host:round:end')
  async onRoundEnd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { partyId: string },
  ) {
    if (!(await this.assertHost(client, data.partyId))) return
    const room = PARTY_ROOM(data.partyId)
    await this.orchestrator.finishCurrent(data.partyId, (roundIndex) =>
      this.server.to(room).emit('round:ended', { roundIndex }),
    )
  }

  @SubscribeMessage('host:event:fire')
  async onEventFire(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { partyId: string; kind: string; payload?: Record<string, unknown> },
  ) {
    if (!(await this.assertHost(client, data.partyId))) return
    const ev = await this.prisma.liveEvent.create({
      data: {
        partyId: data.partyId,
        kind: data.kind,
        payloadJson: JSON.stringify(data.payload ?? {}),
        triggeredBy: client.data.user!.sub,
        expiresAt: new Date(Date.now() + 30_000),
      },
    })
    this.server.to(PARTY_ROOM(data.partyId)).emit('event:fired', {
      event: {
        id: ev.id,
        partyId: ev.partyId,
        kind: ev.kind as never,
        payload: parseJsonObject(ev.payloadJson),
        triggeredBy: ev.triggeredBy,
        triggeredAt: ev.triggeredAt.toISOString(),
        expiresAt: ev.expiresAt?.toISOString() ?? null,
        createdAt: ev.triggeredAt.toISOString(),
        updatedAt: ev.triggeredAt.toISOString(),
      },
    })
  }

  @SubscribeMessage('host:quiz:launch')
  async onQuizLaunch(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { partyId: string; questionId: string },
  ) {
    if (!(await this.assertHost(client, data.partyId))) return
    const q = await this.quiz.launch(client.data.user!.sub, data.questionId)
    const endsAt = new Date(Date.now() + q.durationSec * 1000)
    this.server.to(PARTY_ROOM(data.partyId)).emit('quiz:question', {
      question: {
        id: q.id,
        partyId: q.partyId,
        kind: q.kind as never,
        prompt: q.prompt,
        options: parseJsonArray<string>(q.optionsJson),
        correctOptionIndex: q.correctOptionIndex,
        durationSec: q.durationSec,
        imageUrl: q.imageUrl,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      },
      endsAtIso: endsAt.toISOString(),
    })
    // 결과 집계는 일정 후 leaderboard 푸시
    setTimeout(
      async () => {
        const board = await this.quiz.leaderboard(data.partyId)
        this.server.to(PARTY_ROOM(data.partyId)).emit('quiz:leaderboard', { entries: board })
      },
      q.durationSec * 1000 + 1000,
    )
  }

  @SubscribeMessage('participant:quiz:answer')
  async onQuizAnswer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    data: {
      partyId: string
      questionId: string
      selectedOptionIndex?: number | null
      freeText?: string | null
    },
  ) {
    if (!client.data.user) return
    await this.quiz.answer(client.data.user.sub, {
      questionId: data.questionId,
      selectedOptionIndex: data.selectedOptionIndex ?? null,
      freeText: data.freeText ?? null,
    })
  }

  @SubscribeMessage('participant:mid-match:like')
  async onMidLike(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { partyId: string; targetUserId: string },
  ) {
    if (!client.data.user) return
    await this.matching.midMatchLike(client.data.user.sub, data.partyId, data.targetUserId)
    client.emit('toast', { kind: 'success', message: '관심을 전달했어요 ✨' })
  }

  @SubscribeMessage('participant:final-match:vote')
  async onFinalVote(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { partyId: string; targetUserId: string },
  ) {
    if (!client.data.user) return
    await this.matching.finalMatchVote(client.data.user.sub, data.partyId, data.targetUserId)
    client.emit('toast', { kind: 'success', message: '최종 매칭 선택 완료' })
  }

  @SubscribeMessage('participant:order:create')
  async onOrderCreate(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    data: {
      partyId: string
      items: Array<{ menuItemId: string; quantity: number; note?: string | null }>
      note?: string | null
    },
  ) {
    if (!client.data.user) return
    const order = await this.orders.create(client.data.user.sub, {
      partyId: data.partyId,
      items: data.items,
      note: data.note ?? null,
    })
    this.server.to(PARTY_ROOM(data.partyId)).emit('order:updated', { order })
  }

  @SubscribeMessage('card:draw')
  async onCardDraw(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { partyId: string; pairId?: string | null },
  ) {
    if (!client.data.user) return
    const where: Record<string, unknown> = { OR: [{ partyId: data.partyId }, { partyId: null }] }
    const cards = await this.prisma.questionCard.findMany({
      where,
      orderBy: { usedCount: 'asc' },
      take: 24,
    })
    if (!cards.length) return
    const pick = cards[Math.floor(Math.random() * cards.length)]
    await this.prisma.questionCard.update({
      where: { id: pick.id },
      data: { usedCount: { increment: 1 } },
    })
    if (data.pairId) {
      await this.prisma.questionCardDraw.create({ data: { cardId: pick.id, pairId: data.pairId } })
    }
    this.server.to(PARTY_ROOM(data.partyId)).emit('card:drawn', {
      card: {
        id: pick.id,
        partyId: pick.partyId ?? null,
        depth: pick.depth as never,
        prompt: pick.prompt,
        category: pick.category,
        language: pick.language as never,
        usedCount: pick.usedCount + 1,
        createdAt: pick.createdAt.toISOString(),
        updatedAt: pick.updatedAt.toISOString(),
      },
      pairId: data.pairId ?? null,
    })
  }

  @SubscribeMessage('host:party:end')
  async onPartyEnd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { partyId: string },
  ) {
    if (!(await this.assertHost(client, data.partyId))) return
    const matches = await this.matching.revealFinalMatches(client.data.user!.sub, data.partyId)
    await this.prisma.party.update({ where: { id: data.partyId }, data: { status: 'ended' } })
    this.server
      .to(PARTY_ROOM(data.partyId))
      .emit('final-match:revealed', { matches: matches as never })
  }

  @SubscribeMessage('host:party:lock')
  async onPartyLock(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { partyId: string },
  ) {
    if (!(await this.assertHost(client, data.partyId))) return
    await this.prisma.party.update({ where: { id: data.partyId }, data: { status: 'locked' } })
    this.server.to(PARTY_ROOM(data.partyId)).emit('toast', {
      kind: 'info',
      message: '파티가 잠겼습니다. 곧 시작해요!',
    })
  }

  private async assertHost(client: AuthedSocket, partyId: string): Promise<boolean> {
    const u = client.data.user
    if (!u) return false
    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party || party.hostId !== u.sub) {
      client.emit('error', { code: 'forbidden', message: '호스트만 가능해요' })
      return false
    }
    return true
  }
}
