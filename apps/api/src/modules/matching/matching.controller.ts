import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
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
    @Body() body: { toUserId: string },
  ) {
    return this.matching.midMatchLike(me.sub, partyId, body.toUserId)
  }

  @Post('final-vote')
  finalVote(
    @CurrentUser() me: JwtUserPayload,
    @Param('partyId') partyId: string,
    @Body() body: { toUserId: string },
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
}
