import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import {
  AddAvoidContactsSchema,
  AddAvoidPersonSchema,
  AvoidCheckQuerySchema,
  AvoidPrefsSchema,
  PreProfileSchema,
  PrivacyPrefsSchema,
  UpdateContactSchema,
  UpdateTrustProfileSchema,
  VerifyFieldSchema,
} from '@rotifolk/shared'

import { MeService } from './me.service'

import type {
  AddAvoidContactsDto,
  AddAvoidPersonDto,
  AvoidCheckQueryDto,
  AvoidPrefsDto,
  PreProfileDto,
  PrivacyPrefsDto,
  UpdateContactDto,
  UpdateTrustProfileDto,
  VerifyFieldDto,
} from '@rotifolk/shared'

import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'

@Controller('me')
@UseGuards(AuthGuard('jwt'))
export class MeController {
  constructor(private readonly me: MeService) {}

  @Patch('profile')
  updateProfile(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(PreProfileSchema)) dto: PreProfileDto
  ) {
    return this.me.updateProfile(me.sub, dto)
  }

  @Patch('trust')
  updateTrust(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(UpdateTrustProfileSchema)) dto: UpdateTrustProfileDto
  ) {
    return this.me.updateTrust(me.sub, dto)
  }

  @Post('verify')
  verify(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(VerifyFieldSchema)) dto: VerifyFieldDto
  ) {
    return this.me.verify(me.sub, dto)
  }

  @Patch('contact')
  updateContact(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(UpdateContactSchema)) dto: UpdateContactDto
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
    @Body(new ZodValidationPipe(AddAvoidContactsSchema)) dto: AddAvoidContactsDto
  ) {
    return this.me.addAvoid(me.sub, dto)
  }

  @Delete('avoid-contacts/:id')
  removeAvoid(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.me.removeAvoid(me.sub, id)
  }

  @Get('avoid-people')
  listAvoidPeople(@CurrentUser() me: JwtUserPayload) {
    return this.me.listAvoid(me.sub)
  }

  @Post('avoid-people')
  addAvoidPerson(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(AddAvoidPersonSchema)) dto: AddAvoidPersonDto
  ) {
    return this.me.addAvoidPerson(me.sub, dto)
  }

  @Delete('avoid-people/:id')
  removeAvoidPerson(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.me.removeAvoid(me.sub, id)
  }

  @Patch('avoid-prefs')
  updateAvoidPrefs(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(AvoidPrefsSchema)) dto: AvoidPrefsDto
  ) {
    return this.me.updateAvoidPrefs(me.sub, dto)
  }

  @Get('avoid-check')
  avoidCheck(
    @CurrentUser() me: JwtUserPayload,
    @Query(new ZodValidationPipe(AvoidCheckQuerySchema)) q: AvoidCheckQueryDto
  ) {
    return this.me.avoidCheck(me.sub, q.partyId)
  }

  @Patch('privacy')
  updatePrivacy(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(PrivacyPrefsSchema)) dto: PrivacyPrefsDto
  ) {
    return this.me.updatePrivacy(me.sub, dto)
  }
}
