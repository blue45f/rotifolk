import { describe, expect, it, vi } from 'vitest'
import { ChatService } from './chat.service'

/**
 * 채팅방 멤버 매핑 — 업로드한 프로필 사진(avatar.imageData)이 멤버 목록에
 * avatarImage로 평탄화되는지 검증한다(채팅 목록·메시지 행 아바타의 데이터 소스).
 */

function makeMembershipRow(opts: { imageData?: string | null }) {
  return {
    userId: 'u_me',
    roomId: 'room_1',
    lastReadAt: null,
    room: {
      id: 'room_1',
      kind: 'pair',
      title: null,
      partyId: 'p_1',
      party: { id: 'p_1', title: '한남 와인 로테이션' },
      messages: [],
      memberships: [
        {
          userId: 'u_me',
          user: { nickname: '하늘', avatarId: 'a_me', avatar: null },
        },
        {
          userId: 'u_peer',
          user: {
            nickname: '윤슬',
            avatarId: 'a_w1',
            avatar: opts.imageData === undefined ? null : { id: 'a_w1', imageData: opts.imageData },
          },
        },
      ],
    },
  }
}

function makeService(row: ReturnType<typeof makeMembershipRow>) {
  const prisma = {
    chatMembership: { findMany: vi.fn(async () => [row]) },
  }
  return new ChatService(prisma as never)
}

describe('ChatService.listMyRooms — 멤버 아바타 사진', () => {
  it('업로드 사진이 있으면 avatarImage로 평탄화해 내려준다', async () => {
    const service = makeService(makeMembershipRow({ imageData: 'data:image/webp;base64,QUJD' }))

    const rooms = await service.listMyRooms('u_me')

    expect(rooms).toHaveLength(1)
    const peer = rooms[0].members.find((m) => m.userId === 'u_peer')
    expect(peer?.avatarImage).toBe('data:image/webp;base64,QUJD')
  })

  it('아바타가 없거나 사진을 지운 멤버는 null — 프런트가 프리셋/이니셜로 폴백', async () => {
    const service = makeService(makeMembershipRow({ imageData: null }))

    const rooms = await service.listMyRooms('u_me')

    const me = rooms[0].members.find((m) => m.userId === 'u_me')
    const peer = rooms[0].members.find((m) => m.userId === 'u_peer')
    expect(me?.avatarImage).toBeNull() // avatar 관계 자체가 없음
    expect(peer?.avatarImage).toBeNull() // 사진 삭제(imageData null)
  })
})
