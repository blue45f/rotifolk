import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import {
  AddAvoidContactsSchema,
  PreProfileSchema,
  UpdateContactSchema,
  UpdateTrustProfileSchema,
  VerifyFieldSchema,
} from '@rotifolk/shared'
import type {
  AddAvoidContactsDto,
  PreProfileDto,
  UpdateContactDto,
  UpdateTrustProfileDto,
  VerifyFieldDto,
} from '@rotifolk/shared'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { MeService } from './me.service'

@Controller('me')
@UseGuards(AuthGuard('jwt'))
export class MeController {
  constructor(private readonly me: MeService) {}

  @Patch('profile')
  updateProfile(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(PreProfileSchema)) dto: PreProfileDto,
  ) {
    return this.me.updateProfile(me.sub, dto)
  }

  @Patch('trust')
  updateTrust(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(UpdateTrustProfileSchema)) dto: UpdateTrustProfileDto,
  ) {
    return this.me.updateTrust(me.sub, dto)
  }

  @Post('verify')
  verify(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(VerifyFieldSchema)) dto: VerifyFieldDto,
  ) {
    return this.me.verify(me.sub, dto)
  }

  @Patch('contact')
  updateContact(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(UpdateContactSchema)) dto: UpdateContactDto,
  ) {
    return this.me.updateContact(me.sub, dto)
  }

  @Get('avoid-contacts')
  listAvoid(@CurrentUser() me: JwtUserPayload) {
    return this.me.listAvoid(me.sub)
  }

  @Post('avoid-contacts')
  addAvoid(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(AddAvoidContactsSchema)) dto: AddAvoidContactsDto,
  ) {
    return this.me.addAvoid(me.sub, dto)
  }

  @Delete('avoid-contacts/:id')
  removeAvoid(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.me.removeAvoid(me.sub, id)
  }

  @Get('avoid-check')
  avoidCheck(@CurrentUser() me: JwtUserPayload, @Query('partyId') partyId: string) {
    return this.me.avoidCheck(me.sub, partyId)
  }
}
