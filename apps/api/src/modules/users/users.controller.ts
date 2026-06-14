import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { UpdateProfileSchema } from '@rotifolk/shared'

import { UsersService } from './users.service'

import type { UpdateProfileDto } from '@rotifolk/shared'

import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':id')
  getById(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    return this.users.getById(me.sub, id)
  }

  @Patch('me')
  @UsePipes(new ZodValidationPipe(UpdateProfileSchema))
  updateMe(@CurrentUser() me: JwtUserPayload, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(me.sub, dto)
  }

  @Post('me/become-host')
  becomeHost(@CurrentUser() me: JwtUserPayload) {
    return this.users.promoteToHost(me.sub)
  }

  @Get('me/referral')
  myReferral(@CurrentUser() me: JwtUserPayload) {
    return this.users.getReferralSummary(me.sub)
  }

  @Delete('me')
  deleteMe(@CurrentUser() me: JwtUserPayload) {
    return this.users.deleteAccount(me.sub)
  }
}
