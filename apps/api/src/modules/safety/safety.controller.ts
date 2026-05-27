import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { SafetyService } from './safety.service'

@Controller()
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Post('blocks/:userId')
  @UseGuards(AuthGuard('jwt'))
  block(@CurrentUser() me: JwtUserPayload, @Param('userId') userId: string, @Body() body: { reason?: string }) {
    return this.safety.block(me.sub, userId, body?.reason)
  }

  @Delete('blocks/:userId')
  @UseGuards(AuthGuard('jwt'))
  unblock(@CurrentUser() me: JwtUserPayload, @Param('userId') userId: string) {
    return this.safety.unblock(me.sub, userId)
  }

  @Get('blocks')
  @UseGuards(AuthGuard('jwt'))
  myBlocks(@CurrentUser() me: JwtUserPayload) {
    return this.safety.listMyBlocks(me.sub)
  }

  @Get('parties/:partyId/block-check')
  @UseGuards(AuthGuard('jwt'))
  blockCheck(@CurrentUser() me: JwtUserPayload, @Param('partyId') partyId: string) {
    return this.safety.checkBlockConflict(me.sub, partyId)
  }

  @Post('reviews')
  @UseGuards(AuthGuard('jwt'))
  createReview(
    @CurrentUser() me: JwtUserPayload,
    @Body() body: {
      partyId?: string
      targetUserId?: string
      rating: number
      body: string
      anonymous?: boolean
      tags?: string[]
    },
  ) {
    return this.safety.createReview({ fromUserId: me.sub, ...body })
  }

  @Get('parties/:partyId/reviews')
  partyReviews(@Param('partyId') partyId: string) {
    return this.safety.listReviewsForParty(partyId)
  }

  @Get('users/:userId/reviews')
  hostReviews(@Param('userId') userId: string) {
    return this.safety.listReviewsForHost(userId)
  }

  @Post('reports')
  @UseGuards(AuthGuard('jwt'))
  report(
    @CurrentUser() me: JwtUserPayload,
    @Body() body: {
      targetUserId?: string
      partyId?: string
      kind: 'harassment' | 'spam' | 'inappropriate' | 'other'
      body: string
    },
  ) {
    return this.safety.report({ reporterId: me.sub, ...body })
  }

  @Get('admin/reports')
  @UseGuards(AuthGuard('jwt'))
  adminReports(
    @CurrentUser() me: JwtUserPayload,
    @Query('status') status?: 'open' | 'reviewing' | 'resolved' | 'dismissed',
  ) {
    if (me.role !== 'admin') throw new ForbiddenException({ code: 'admin_only', message: '관리자 전용' })
    return this.safety.listReports(status)
  }

  @Patch('admin/reports/:id')
  @UseGuards(AuthGuard('jwt'))
  resolve(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') id: string,
    @Body() body: { status: 'resolved' | 'dismissed'; note?: string },
  ) {
    if (me.role !== 'admin') throw new ForbiddenException({ code: 'admin_only', message: '관리자 전용' })
    return this.safety.resolveReport(me.sub, id, body.status, body.note)
  }
}
