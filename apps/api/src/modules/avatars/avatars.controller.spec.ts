import { AVATAR_IMAGE_MAX_LENGTH } from '@rotifolk/shared'
import { describe, expect, it, vi } from 'vitest'

import { AvatarsController, UpdateAvatarSchema } from './avatars.module'

/**
 * 아바타 사진 업로드/수정/삭제 — Prisma는 모킹(무DB).
 *  - zod 검증: data:image/ 프리픽스 + 길이 캡 + null(삭제) 허용
 *  - PATCH /avatars/me: 최초 업로드는 create, 이후는 update, null이면 사진 제거
 */

const ME = { sub: 'u_me', nickname: '하늘' } as never

const DATA_URL = 'data:image/webp;base64,QUJDREVG'

function makePrismaMock(existing: Record<string, unknown> | null) {
  return {
    avatar: {
      findFirst: vi.fn(async () => existing),
      findUnique: vi.fn(async () => existing),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'avatar_new',
        ...data,
      })),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
          id: where.id,
          ...data,
        })
      ),
    },
  }
}

describe('UpdateAvatarSchema — imageData 검증', () => {
  it('data:image/* base64 프리픽스의 사진을 허용한다', () => {
    const parsed = UpdateAvatarSchema.safeParse({ imageData: DATA_URL })
    expect(parsed.success).toBe(true)
  })

  it('null(사진 삭제)과 미지정을 모두 허용한다', () => {
    expect(UpdateAvatarSchema.safeParse({ imageData: null }).success).toBe(true)
    expect(UpdateAvatarSchema.safeParse({ mood: 'chill' }).success).toBe(true)
  })

  it('data URL 프리픽스가 아니면 거부한다', () => {
    expect(UpdateAvatarSchema.safeParse({ imageData: 'https://evil.example/x.png' }).success).toBe(
      false
    )
    expect(UpdateAvatarSchema.safeParse({ imageData: 'data:text/html;base64,PGI+' }).success).toBe(
      false
    )
  })

  it('길이 캡(300K자)을 넘는 페이로드는 거부한다', () => {
    const huge = `data:image/jpeg;base64,${'A'.repeat(AVATAR_IMAGE_MAX_LENGTH)}`
    expect(UpdateAvatarSchema.safeParse({ imageData: huge }).success).toBe(false)
  })
})

describe('AvatarsController.updateMine — 사진 업로드/수정/삭제', () => {
  it('아바타가 없으면 사진을 포함해 새로 만든다', async () => {
    const prisma = makePrismaMock(null)
    const controller = new AvatarsController(prisma as never)

    await controller.updateMine(ME, { imageData: DATA_URL })

    const createArgs = prisma.avatar.create.mock.calls[0][0]
    expect(createArgs.data.imageData).toBe(DATA_URL)
    expect(createArgs.data.ownerId).toBe('u_me')
  })

  it('기존 아바타가 있으면 사진만 갱신한다', async () => {
    const prisma = makePrismaMock({ id: 'avatar_1', ownerId: 'u_me' })
    const controller = new AvatarsController(prisma as never)

    await controller.updateMine(ME, { imageData: DATA_URL })

    const updateArgs = prisma.avatar.update.mock.calls[0][0]
    expect(updateArgs.where).toEqual({ id: 'avatar_1' })
    expect(updateArgs.data.imageData).toBe(DATA_URL)
  })

  it('imageData null이면 사진을 지워 프리셋 폴백으로 되돌린다', async () => {
    const prisma = makePrismaMock({ id: 'avatar_1', ownerId: 'u_me', imageData: DATA_URL })
    const controller = new AvatarsController(prisma as never)

    await controller.updateMine(ME, { imageData: null })

    const updateArgs = prisma.avatar.update.mock.calls[0][0]
    expect(updateArgs.data.imageData).toBeNull()
  })

  it('imageData를 보내지 않으면 기존 사진을 건드리지 않는다', async () => {
    const prisma = makePrismaMock({ id: 'avatar_1', ownerId: 'u_me', imageData: DATA_URL })
    const controller = new AvatarsController(prisma as never)

    await controller.updateMine(ME, { mood: 'cozy' })

    const updateArgs = prisma.avatar.update.mock.calls[0][0]
    expect('imageData' in updateArgs.data).toBe(false)
  })
})
