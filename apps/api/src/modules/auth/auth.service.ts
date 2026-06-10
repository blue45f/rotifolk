import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import { PrismaService } from '@/prisma/prisma.service'
import type { LoginDto, SignUpDto } from '@rotifolk/shared'
import { toPublicUser } from '../users/user.mapper'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** 클라이언트가 Google 버튼 노출 여부를 판단하도록 공개 설정만 내려준다. */
  publicConfig() {
    const googleClientId = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim()
    return { googleClientId: googleClientId ? googleClientId : null }
  }

  async signUp(dto: SignUpDto, referralCode?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing)
      throw new BadRequestException({ code: 'email_taken', message: '이미 가입된 이메일이에요' })

    const passwordHash = await argon2.hash(dto.password)

    const trimmedCode = referralCode?.trim()
    const referrer = trimmedCode
      ? await this.prisma.user.findUnique({ where: { referralCode: trimmedCode } })
      : null

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          nickname: dto.nickname,
          birthYear: dto.birthYear ?? null,
          gender: dto.gender ?? null,
        },
      })
      const avatar = await tx.avatar.create({
        data: { ...this.makeDefaultAvatar(dto.nickname), ownerId: created.id },
      })
      const updated = await tx.user.update({
        where: { id: created.id },
        data: { avatarId: avatar.id },
        include: { avatar: true },
      })

      if (referrer && referrer.id !== created.id) {
        const BONUS = 3000
        await tx.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: created.id,
            bonusKRW: BONUS,
          },
        })
        await tx.user.update({
          where: { id: referrer.id },
          data: { pointsKRW: { increment: BONUS } },
        })
        return tx.user.update({
          where: { id: created.id },
          data: { pointsKRW: { increment: BONUS } },
          include: { avatar: true },
        })
      }

      return updated
    })

    return this.issueSession(user)
  }

  async kakaoSimulate({ kakaoId, nickname }: { kakaoId: string; nickname: string }) {
    const email = `kakao_${kakaoId}@rotifolk.dev`

    const existing = await this.prisma.user.findUnique({
      where: { email },
      include: { avatar: true },
    })
    if (existing) return this.issueSession(existing)

    const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    const passwordHash = await argon2.hash(randomPassword)

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          nickname,
        },
      })
      const avatar = await tx.avatar.create({
        data: { ...this.makeDefaultAvatar(nickname), ownerId: created.id },
      })
      return tx.user.update({
        where: { id: created.id },
        data: { avatarId: avatar.id },
        include: { avatar: true },
      })
    })

    return this.issueSession(user)
  }

  /**
   * Google ID 토큰(GIS credential) 검증 → 이메일 기준 find-or-create 후 동일 세션 발급.
   * - audience 를 항상 전달해 토큰 대상이 우리 클라이언트인지 검증한다.
   * - email_verified 가 아니면 거부한다(토큰 자체는 로깅하지 않는다).
   */
  async googleAuth(credential: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim()
    if (!clientId)
      throw new UnauthorizedException({
        code: 'google_not_configured',
        message: 'Google 로그인이 설정되지 않았어요',
      })

    const { OAuth2Client } = await import('google-auth-library')
    const client = new OAuth2Client(clientId)
    let payload: import('google-auth-library').TokenPayload | undefined
    try {
      const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId })
      payload = ticket.getPayload()
    } catch {
      throw new UnauthorizedException({
        code: 'google_invalid_token',
        message: 'Google 인증에 실패했어요',
      })
    }

    if (!payload?.sub || !payload.email || !payload.email_verified)
      throw new UnauthorizedException({
        code: 'google_invalid_token',
        message: 'Google 인증에 실패했어요',
      })

    const sub = payload.sub
    const email = payload.email.toLowerCase()
    const name = payload.name?.trim() || email.split('@')[0] || '게스트'

    const existing = await this.prisma.user.findUnique({
      where: { email },
      include: { avatar: true },
    })
    if (existing) {
      // 기존 계정에 Google 식별자를 연결(최초 1회). passwordHash 는 그대로 둔다.
      if (existing.googleSub !== sub) {
        const updated = await this.prisma.user.update({
          where: { id: existing.id },
          data: { googleSub: sub },
          include: { avatar: true },
        })
        return this.issueSession(updated)
      }
      return this.issueSession(existing)
    }

    const nickname = name.slice(0, 16)
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          provider: 'google',
          googleSub: sub,
          nickname,
        },
      })
      const avatar = await tx.avatar.create({
        data: { ...this.makeDefaultAvatar(nickname), ownerId: created.id },
      })
      return tx.user.update({
        where: { id: created.id },
        data: { avatarId: avatar.id },
        include: { avatar: true },
      })
    })

    return this.issueSession(user)
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { avatar: true },
    })
    // passwordHash 가 없는 계정(소셜 전용)은 비밀번호 로그인 불가 — 계정 존재 여부를
    // 노출하지 않도록 미존재와 동일한 invalid_credentials 로 응답한다.
    if (!user || !user.passwordHash)
      throw new UnauthorizedException({
        code: 'invalid_credentials',
        message: '이메일 또는 비밀번호가 일치하지 않아요',
      })

    const ok = await argon2.verify(user.passwordHash, dto.password)
    if (!ok)
      throw new UnauthorizedException({
        code: 'invalid_credentials',
        message: '이메일 또는 비밀번호가 일치하지 않아요',
      })

    return this.issueSession(user)
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { avatar: true },
    })
    if (!user)
      throw new UnauthorizedException({
        code: 'user_not_found',
        message: '사용자를 찾을 수 없어요',
      })
    return { user: toPublicUser(user) }
  }

  /**
   * 게스트 참여 이력 클레임 — 같은 기기 토큰(guestToken)으로 남긴 게스트 참가 행에
   * 내 userId를 연결한다. 이미 그 파티에 회원으로 참여 중이면 게스트 행은 취소 처리해
   * 로스터 중복을 막는다. 토큰은 소진(null) 처리해 중복 클레임을 차단한다.
   */
  async claimGuestParticipations(userId: string, guestToken: string) {
    const rows = await this.prisma.participation.findMany({
      where: { guestToken, userId: null },
    })
    if (rows.length === 0) return { claimed: 0 }

    let claimed = 0
    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const existing = await tx.participation.findUnique({
          where: { partyId_userId: { partyId: row.partyId, userId } },
          select: { id: true },
        })
        if (existing) {
          await tx.participation.update({
            where: { id: row.id },
            data: { status: 'cancelled', guestToken: null },
          })
          continue
        }
        await tx.participation.update({
          where: { id: row.id },
          data: { userId, guestToken: null },
        })
        claimed += 1
      }
      if (claimed > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { joinedCount: { increment: claimed } },
        })
      }
    })
    return { claimed }
  }

  private issueSession(user: { id: string; email: string; role: string; nickname: string }) {
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      nickname: user.nickname,
    })
    return { token, user: toPublicUser(user as never) }
  }

  private makeDefaultAvatar(nickname: string) {
    const moods = ['chill', 'sparkling', 'curious', 'witty', 'cozy', 'mystery'] as const
    const hues = ['#7A1F3D', '#C9627F', '#D4A24C', '#6B8E5A', '#2F7884', '#6E5BB3']
    const emojis = ['🍷', '☕️', '🍵', '✨', '🥂', '🎲', '💫', '🌙', '🍯', '🌹']
    const pick = <T>(arr: readonly T[], salt: number) => arr[salt % arr.length]
    const salt = [...nickname].reduce((a, c) => a + c.charCodeAt(0), 0)
    return {
      mood: pick(moods, salt),
      hue: pick(hues, salt + 1),
      pattern: pick(['solid', 'gradient', 'sparkle', 'wave'] as const, salt + 2),
      emojiBadge: pick(emojis, salt + 3),
      faceSeed: `${nickname}-${salt}`,
    }
  }
}
