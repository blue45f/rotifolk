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
import { CreateReportSchema, UpdateReportStatusSchema } from '@rotifolk/shared'

import { SafetyService } from './safety.service'

import type { CreateReportDto, UpdateReportStatusDto } from '@rotifolk/shared'

import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'

@Controller()
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Post('blocks/:userId')
  @UseGuards(AuthGuard('jwt'))
  block(
    @CurrentUser() me: JwtUserPayload,
    @Param('userId') userId: string,
    @Body() body: { reason?: string }
  ) {
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

  @Get('blocks/phones')
  @UseGuards(AuthGuard('jwt'))
  myPhoneBlocks(@CurrentUser() me: JwtUserPayload) {
    return this.safety.listMyPhoneBlocks(me.sub)
  }

  @Get('blocks/candidates')
  @UseGuards(AuthGuard('jwt'))
  blockCandidates(@CurrentUser() me: JwtUserPayload) {
    return this.safety.listBlockCandidates(me.sub)
  }

  @Post('blocks/phones')
  @UseGuards(AuthGuard('jwt'))
  blockPhone(@CurrentUser() me: JwtUserPayload, @Body() body: { phone: string; reason?: string }) {
    return this.safety.blockPhone(me.sub, body.phone, body.reason)
  }

  @Delete('blocks/phones/:id')
  @UseGuards(AuthGuard('jwt'))
  unblockPhone(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.safety.unblockPhone(me.sub, id)
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
    @Body()
    body: {
      partyId?: string
      targetUserId?: string
      rating: number
      body: string
      anonymous?: boolean
      tags?: string[]
    }
  ) {
    return this.safety.createReview({ fromUserId: me.sub, ...body })
  }

  @Get('reviews/recent')
  recentReviews() {
    return this.safety.listRecentReviews(6)
  }

  @Get('parties/:partyId/reviews')
  partyReviews(@Param('partyId') partyId: string) {
    return this.safety.listReviewsForParty(partyId)
  }

  @Get('users/:userId/reviews')
  hostReviews(@Param('userId') userId: string) {
    return this.safety.listReviewsForHost(userId)
  }

  @Patch('reviews/:id/reply')
  @UseGuards(AuthGuard('jwt'))
  hostReply(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') id: string,
    @Body() body: { body: string }
  ) {
    return this.safety.addHostReply(me.sub, id, body.body)
  }

  @Post('reports')
  @UseGuards(AuthGuard('jwt'))
  report(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(CreateReportSchema)) body: CreateReportDto
  ) {
    return this.safety.report({ reporterId: me.sub, ...body })
  }

  @Get('admin/reports')
  @UseGuards(AuthGuard('jwt'))
  adminReports(
    @CurrentUser() me: JwtUserPayload,
    @Query('status') status?: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  ) {
    if (me.role !== 'admin')
      throw new ForbiddenException({ code: 'admin_only', message: '관리자 전용' })
    return this.safety.listReports(status)
  }

  @Patch('admin/reports/:id')
  @UseGuards(AuthGuard('jwt'))
  resolve(
    @CurrentUser() me: JwtUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateReportStatusSchema)) body: UpdateReportStatusDto
  ) {
    if (me.role !== 'admin')
      throw new ForbiddenException({ code: 'admin_only', message: '관리자 전용' })
    return this.safety.resolveReport(me.sub, id, body)
  }
}
