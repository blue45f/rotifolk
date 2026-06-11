import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * 토큰이 있으면 검증해 req.user를 채우고, 없거나 무효면 익명(null)으로 통과시키는 가드.
 * 공개 클럽 목록처럼 "누구나 보지만 로그인하면 내 멤버십이 표시되는" 라우트에 쓴다.
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser {
    return (user || null) as TUser
  }
}
