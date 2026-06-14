import { Module, Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AvatarImageDataSchema } from '@rotifolk/shared'
import { z } from 'zod'

import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { PrismaService } from '@/prisma/prisma.service'

export const UpdateAvatarSchema = z.object({
  mood: z.enum(['chill', 'sparkling', 'curious', 'witty', 'cozy', 'mystery']).optional(),
  hue: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  pattern: z.enum(['solid', 'gradient', 'sparkle', 'wave']).optional(),
  emojiBadge: z.string().min(1).max(4).optional(),
  faceSeed: z.string().min(2).max(60).optional(),
  /** 직접 업로드한 사진(data URL, 캡 검증은 shared 스키마). null이면 삭제 → 프리셋 폴백. */
  imageData: AvatarImageDataSchema.nullable().optional(),
})

@Controller('avatars')
@UseGuards(AuthGuard('jwt'))
export class AvatarsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async getMine(@CurrentUser() me: JwtUserPayload) {
    return this.prisma.avatar.findFirst({ where: { ownerId: me.sub } })
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.prisma.avatar.findUnique({ where: { id } })
  }

  @Patch('me')
  async updateMine(
    @CurrentUser() me: JwtUserPayload,
    @Body(new ZodValidationPipe(UpdateAvatarSchema)) dto: z.infer<typeof UpdateAvatarSchema>
  ) {
    const existing = await this.prisma.avatar.findFirst({ where: { ownerId: me.sub } })
    if (!existing) {
      return this.prisma.avatar.create({
        data: {
          ownerId: me.sub,
          mood: dto.mood ?? 'chill',
          hue: dto.hue ?? '#7A1F3D',
          pattern: dto.pattern ?? 'gradient',
          emojiBadge: dto.emojiBadge ?? '🍷',
          faceSeed: dto.faceSeed ?? me.nickname,
          imageData: dto.imageData ?? null,
          user: { connect: { id: me.sub } },
        },
      })
    }
    return this.prisma.avatar.update({ where: { id: existing.id }, data: dto })
  }
}

@Module({ controllers: [AvatarsController] })
export class AvatarsModule {}
