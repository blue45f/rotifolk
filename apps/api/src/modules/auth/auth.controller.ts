import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
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
  signUp(@Body() body: Record<string, unknown>) {
    const referralCodeRaw = body['referralCode']
    const referralCode = typeof referralCodeRaw === 'string' ? referralCodeRaw : undefined
    const dto = new ZodValidationPipe(SignUpSchema).transform(body, {
      type: 'body',
    }) as SignUpDto
    return this.authService.signUp(dto, referralCode)
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

  @Get('config')
  config() {
    return this.authService.publicConfig()
  }

  @Post('google')
  async google(@Body() body: { credential?: unknown }) {
    const credential = typeof body.credential === 'string' ? body.credential.trim() : ''
    if (!credential)
      throw new BadRequestException({
        code: 'google_credential_required',
        message: 'Google 인증 정보가 필요해요',
      })
    return this.authService.googleAuth(credential)
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() user: JwtUserPayload) {
    return this.authService.me(user.sub)
  }
}
