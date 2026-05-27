import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface JwtUserPayload {
  sub: string
  email: string
  role: 'admin' | 'host' | 'participant'
  nickname: string
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUserPayload => {
    const req = ctx.switchToHttp().getRequest()
    return req.user as JwtUserPayload
  },
)
