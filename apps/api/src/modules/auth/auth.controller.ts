import { Body, Controller, Get, Post, UseGuards, UsePipes } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { LoginSchema, SignUpSchema } from '@rotifolk/shared'
import type { LoginDto, SignUpDto } from '@rotifolk/shared'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @UsePipes(new ZodValidationPipe(SignUpSchema))
  signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto)
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post('kakao')
  async kakaoSim(@Body() body: { kakaoId: string; nickname: string }) {
    return this.authService.kakaoSimulate(body)
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() user: JwtUserPayload) {
    return this.authService.me(user.sub)
  }
}
