import { Module, Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { z } from 'zod'
import { PrismaService } from '@/prisma/prisma.service'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'

const UpdateAvatarSchema = z.object({
  mood: z.enum(['chill', 'sparkling', 'curious', 'witty', 'cozy', 'mystery']).optional(),
  hue: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  pattern: z.enum(['solid', 'gradient', 'sparkle', 'wave']).optional(),
  emojiBadge: z.string().min(1).max(4).optional(),
  faceSeed: z.string().min(2).max(60).optional(),
})

@Controller('avatars')
@UseGuards(AuthGuard('jwt'))
class AvatarsController {
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
    @Body(new ZodValidationPipe(UpdateAvatarSchema)) dto: z.infer<typeof UpdateAvatarSchema>,
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
          user: { connect: { id: me.sub } },
        },
      })
    }
    return this.prisma.avatar.update({ where: { id: existing.id }, data: dto })
  }
}

@Module({ controllers: [AvatarsController] })
export class AvatarsModule {}
