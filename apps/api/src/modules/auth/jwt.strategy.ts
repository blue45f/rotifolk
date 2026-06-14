import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import type { JwtUserPayload } from '@/common/current-user.decorator'

import { inactiveAccountException, isAccountActive } from '@/common/account-status'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(ConfigService) cfg: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('JWT_SECRET', 'dev-secret-change-me'),
    })
  }

  async validate(payload: JwtUserPayload): Promise<JwtUserPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, nickname: true, accountStatus: true },
    })
    if (!user || !isAccountActive(user.accountStatus)) throw inactiveAccountException()
    return {
      sub: user.id,
      email: user.email,
      role: user.role as JwtUserPayload['role'],
      nickname: user.nickname,
    }
  }
}
