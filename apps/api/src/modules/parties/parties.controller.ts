import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import {
  CheckInSchema,
  CreateDerivedPartySchema,
  CreatePartySchema,
  GuestJoinSchema,
  HostAddGuestSchema,
  JoinPartySchema,
  PartyQuerySchema,
  SendPartyInvitationsSchema,
  UpdatePartySchema,
} from '@rotifolk/shared'
import type {
  CheckInDto,
  CreateDerivedPartyDto,
  CreatePartyDto,
  GuestJoinDto,
  HostAddGuestDto,
  JoinPartyDto,
  PartyQueryDto,
  SendPartyInvitationsDto,
  UpdatePartyDto,
} from '@rotifolk/shared'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { PartiesService } from './parties.service'

type AfterPartyVoteDto = Readonly<{
  status?: 'go' | 'maybe' | 'no'
  nickname?: string
  userId?: string
}>

type AfterPartyVenueVoteDto = Readonly<{
  venueId?: string
  userId?: string
}>

type AfterPartyConfirmDto = Readonly<{
  venueName?: string
  address?: string
  time?: string
}>

@Controller('parties')
export class PartiesController {
  constructor(private readonly parties: PartiesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(PartyQuerySchema)) q: PartyQueryDto) {
    return this.parties.list(q)
  }

  /** 친구 초대 코드로 조회 (auth X) */
  @Get('by-code/:code')
  byCode(@Param('code') code: string) {
    return this.parties.findByQuickCode(code.toUpperCase())
  }

  /** 즉석/당일 빠른 개설. 카테고리·시간·장소만으로 즉시 OPEN 파티 생성. */
  @Post('quick')
  @UseGuards(AuthGuard('jwt'))
  quickCreate(
    @CurrentUser() me: JwtUserPayload,
    @Body()
    body: {
      category: CreatePartyDto['config']['category']
      title?: string
      venueId: string
      startInMinutes: number
      maxParticipants?: number
    },
  ) {
    return this.parties.quickCreate(me.sub, body)
  }

  @Get('mine')
  @UseGuards(AuthGuard('jwt'))
  mine(@CurrentUser() me: JwtUserPayload) {
    return this.parties.myParties(me.sub)
  }

  @Get('hosted')
  @UseGuards(AuthGuard('jwt'))
  hosted(@CurrentUser() me: JwtUserPayload) {
    return this.parties.hostedParties(me.sub)
  }

  @Get('me/match-cards')
  @UseGuards(AuthGuard('jwt'))
  myMatchCards(@CurrentUser() me: JwtUserPayload) {
    return this.parties.getMyMatchCards(me.sub)
  }

  @Get('happening-now')
  happeningNow() {
    return this.parties.happeningNow()
  }

  @Get('neighborhood')
  @UseGuards(AuthGuard('jwt'))
  neighborhood(@CurrentUser() me: JwtUserPayload, @Query('area') area?: string) {
    return this.parties.neighborhood(me.sub, area)
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.parties.getById(id)
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ZodValidationPipe(CreatePartySchema))
  create(@CurrentUser() me: JwtUserPayload, @Body() dto: CreatePartyDto) {
    return this.parties.create(me.sub, dto)
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePartySchema)) dto: UpdatePartyDto,
  ) {
    return this.parties.update(me.sub, id, dto)
  }

  @Post(':id/join')
  @UseGuards(AuthGuard('jwt'))
  join(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') partyId: string,
    @Body(new ZodValidationPipe(JoinPartySchema.omit({ partyId: true })))
    dto: Omit<JoinPartyDto, 'partyId'>,
  ) {
    return this.parties.join(me.sub, partyId, dto.note ?? null)
  }

  @Delete(':id/join')
  @UseGuards(AuthGuard('jwt'))
  cancelJoin(@CurrentUser() me: JwtUserPayload, @Param('id') partyId: string) {
    return this.parties.cancel(me.sub, partyId)
  }

  /** 게스트(비로그인) 링크 합류 — 가입 없이 닉네임+아바타만으로 참가 (auth X). */
  @Post(':id/guest-join')
  guestJoin(
    @Param('id') partyId: string,
    @Body(new ZodValidationPipe(GuestJoinSchema)) dto: GuestJoinDto,
  ) {
    return this.parties.guestJoin(partyId, dto)
  }

  /** 게스트 재방문 식별 — localStorage 토큰으로 내 게스트 참가 조회 (auth X). */
  @Get(':id/guests/me')
  guestSession(@Param('id') partyId: string, @Query('token') token?: string) {
    return this.parties.guestSession(partyId, token ?? '')
  }

  /** 현장 합류 — 호스트가 이름만 입력해 게스트 즉석 등록. */
  @Post(':id/guests')
  @UseGuards(AuthGuard('jwt'))
  addGuest(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') partyId: string,
    @Body(new ZodValidationPipe(HostAddGuestSchema)) dto: HostAddGuestDto,
  ) {
    return this.parties.hostAddGuest(me.sub, partyId, dto)
  }

  @Post(':id/check-in/:userId')
  @UseGuards(AuthGuard('jwt'))
  checkIn(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') partyId: string,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(CheckInSchema)) body: CheckInDto,
  ) {
    return this.parties.checkIn(me.sub, partyId, userId, body.seatNumber)
  }

  @Post(':id/lock')
  @UseGuards(AuthGuard('jwt'))
  lock(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.parties.lock(me.sub, id)
  }

  @Post(':id/start')
  @UseGuards(AuthGuard('jwt'))
  start(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.parties.start(me.sub, id)
  }

  @Post(':id/end')
  @UseGuards(AuthGuard('jwt'))
  end(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.parties.end(me.sub, id)
  }

  @Get(':id/after-party')
  @UseGuards(AuthGuard('jwt'))
  getAfterParty(@CurrentUser() me: JwtUserPayload, @Param('id') partyId: string) {
    void me
    void partyId
    return { ok: true }
  }

  @Post(':id/after-party/vote')
  @UseGuards(AuthGuard('jwt'))
  voteAfterParty(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') partyId: string,
    @Body() dto: AfterPartyVoteDto,
  ) {
    void me
    void partyId
    void dto
    return { ok: true }
  }

  @Post(':id/after-party/venue-vote')
  @UseGuards(AuthGuard('jwt'))
  voteVenueAfterParty(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') partyId: string,
    @Body() dto: AfterPartyVenueVoteDto,
  ) {
    void me
    void partyId
    void dto
    return { ok: true }
  }

  @Post(':id/after-party/confirm')
  @UseGuards(AuthGuard('jwt'))
  confirmAfterParty(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') partyId: string,
    @Body() dto: AfterPartyConfirmDto,
  ) {
    void me
    void partyId
    void dto
    return { ok: true }
  }

  @Get(':partyId/derived-candidates')
  @UseGuards(AuthGuard('jwt'))
  derivedCandidates(@CurrentUser() me: JwtUserPayload, @Param('partyId') partyId: string) {
    return this.parties.listDerivedCandidates(me.sub, partyId)
  }

  @Post(':partyId/derive')
  @UseGuards(AuthGuard('jwt'))
  deriveParty(
    @CurrentUser() me: JwtUserPayload,
    @Param('partyId') partyId: string,
    @Body(new ZodValidationPipe(CreateDerivedPartySchema)) body: CreateDerivedPartyDto,
  ) {
    return this.parties.createDerivedParty(me.sub, partyId, body)
  }

  @Post(':partyId/invitations')
  @UseGuards(AuthGuard('jwt'))
  inviteToParty(
    @CurrentUser() me: JwtUserPayload,
    @Param('partyId') partyId: string,
    @Body(new ZodValidationPipe(SendPartyInvitationsSchema)) body: SendPartyInvitationsDto,
  ) {
    return this.parties.sendInvitations(me.sub, partyId, body)
  }
}
