import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import {
  ContactExchangeDecisionSchema,
  ContactExchangeRequestSchema,
  FinalMatchVoteSchema,
  type ContactExchangeDecisionDto,
  type ContactExchangeRequestDto,
  type FinalMatchVoteDto,
} from '@rotifolk/shared'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { MatchingService } from './matching.service'

@Controller('parties/:partyId/matching')
@UseGuards(AuthGuard('jwt'))
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Post('plan')
  plan(@CurrentUser() me: JwtUserPayload, @Param('partyId') partyId: string) {
    return this.matching.planRounds(me.sub, partyId)
  }

  @Get('rounds')
  rounds(@Param('partyId') partyId: string) {
    return this.matching.listRounds(partyId)
  }

  @Get('current')
  current(@CurrentUser() me: JwtUserPayload, @Param('partyId') partyId: string) {
    return this.matching.getCurrentRound(partyId, me.sub)
  }

  @Post('mid-like')
  midLike(
    @CurrentUser() me: JwtUserPayload,
    @Param('partyId') partyId: string,
    @Body(new ZodValidationPipe(FinalMatchVoteSchema)) body: FinalMatchVoteDto,
  ) {
    return this.matching.midMatchLike(me.sub, partyId, body.toUserId)
  }

  @Post('final-vote')
  finalVote(
    @CurrentUser() me: JwtUserPayload,
    @Param('partyId') partyId: string,
    @Body(new ZodValidationPipe(FinalMatchVoteSchema)) body: FinalMatchVoteDto,
  ) {
    return this.matching.finalMatchVote(me.sub, partyId, body.toUserId)
  }

  @Post('reveal')
  reveal(@CurrentUser() me: JwtUserPayload, @Param('partyId') partyId: string) {
    return this.matching.revealFinalMatches(me.sub, partyId)
  }

  @Get('my-matches')
  myMatches(@CurrentUser() me: JwtUserPayload, @Param('partyId') partyId: string) {
    return this.matching.myPartyMatches(me.sub, partyId)
  }

  @Get('popular')
  popular(@Param('partyId') partyId: string) {
    return this.matching.popularOfParty(partyId)
  }

  @Post('contact-requests/:partnerId')
  requestContactExchange(
    @CurrentUser() me: JwtUserPayload,
    @Param('partyId') partyId: string,
    @Param('partnerId') partnerId: string,
    @Body(new ZodValidationPipe(ContactExchangeRequestSchema)) body: ContactExchangeRequestDto,
  ) {
    return this.matching.requestContactExchange(me.sub, partyId, partnerId, body.channel)
  }

  @Post('contact-requests/:requestId/decision')
  decideContactExchange(
    @CurrentUser() me: JwtUserPayload,
    @Param('partyId') partyId: string,
    @Param('requestId') requestId: string,
    @Body(new ZodValidationPipe(ContactExchangeDecisionSchema)) body: ContactExchangeDecisionDto,
  ) {
    return this.matching.decideContactExchangeRequest(me.sub, partyId, requestId, body.action)
  }
}
