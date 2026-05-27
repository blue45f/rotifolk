import { Body, Controller, Get, Param, Patch, Post, UseGuards, UsePipes } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { UpdateProfileSchema } from '@rotifolk/shared'
import type { UpdateProfileDto } from '@rotifolk/shared'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { UsersService } from './users.service'

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.users.getById(id)
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
}
