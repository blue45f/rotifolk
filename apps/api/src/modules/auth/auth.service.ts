import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
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
  ) {}

  async signUp(dto: SignUpDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new BadRequestException({ code: 'email_taken', message: '이미 가입된 이메일이에요' })

    const passwordHash = await argon2.hash(dto.password)

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
    if (!user) throw new UnauthorizedException({ code: 'invalid_credentials', message: '이메일 또는 비밀번호가 일치하지 않아요' })

    const ok = await argon2.verify(user.passwordHash, dto.password)
    if (!ok) throw new UnauthorizedException({ code: 'invalid_credentials', message: '이메일 또는 비밀번호가 일치하지 않아요' })

    return this.issueSession(user)
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { avatar: true },
    })
    if (!user) throw new UnauthorizedException({ code: 'user_not_found', message: '사용자를 찾을 수 없어요' })
    return { user: toPublicUser(user) }
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
