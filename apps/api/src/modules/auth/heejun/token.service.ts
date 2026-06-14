import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import type { AccessSubject, TokenIssuer } from '@heejun/auth'
import type { Principal, Role } from '@heejun/contracts'

/** rotifolk 세션 액세스 토큰의 클레임 형태(JwtStrategy.validate 가 받는 payload 와 동일). */
export interface SessionClaims {
  sub: string
  email: string
  role: string
  nickname: string
}

/**
 * `@heejun/auth` `TokenIssuer` 포트 구현.
 *
 * 토큰 발급을 한 곳에 모아 플랫폼 계약에 맞춘다. 내부적으로 기존 `@nestjs/jwt` 를 그대로
 * 사용하므로 클레임(`{ sub, email, role, nickname }`)·HS256·TTL·시크릿이 동일 — **이미
 * 발급된 토큰이 그대로 검증되어 강제 로그아웃이 없다.** 검증은 기존 passport-jwt
 * `JwtStrategy`(DB 재조회·accountStatus 확인)가 계속 담당한다.
 *
 * `issueAccess`/`verifyAccess` 는 향후 코어 `AuthService` 채택을 대비한 포트 표준 진입점
 * (Principal 은 role 단수·nickname 을 담지 않으므로 role↔roles 매핑만 한다).
 */
@Injectable()
export class TokenService implements TokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  /** 세션 액세스 토큰 발급(기존 issueSession 의 jwt.sign 대체). */
  sign(claims: SessionClaims): string {
    return this.jwt.sign(claims)
  }

  issueAccess(subject: AccessSubject): Promise<string> {
    return Promise.resolve(
      this.sign({
        sub: subject.userId,
        email: subject.email ?? '',
        role: subject.roles[0] ?? 'participant',
        nickname: '',
      })
    )
  }

  verifyAccess(token: string): Promise<Principal> {
    const payload = this.jwt.verify(token) as { sub: string; email?: string; role?: string }
    return Promise.resolve({
      userId: payload.sub,
      email: payload.email,
      roles: payload.role ? [payload.role as Role] : [],
    })
  }
}
