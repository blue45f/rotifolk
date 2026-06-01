import { describe, expect, it } from 'vitest'
import {
  appendRealtimeMessage,
  updateRoomPreviewFromMessage,
  type ChatMessage,
  type ChatRoomSummary,
} from './realtime-cache'

const message: ChatMessage = {
  id: 'msg_2',
  roomId: 'room_1',
  userId: 'u_2',
  nickname: '다정',
  body: '2라운드 끝나고 바 자리에서 봐요',
  kind: 'text',
  meta: null,
  createdAt: '2026-06-01T12:05:00.000Z',
}

const rooms: ChatRoomSummary[] = [
  {
    id: 'room_1',
    kind: 'group',
    title: '한남 와인 5:5',
    partyId: 'party_1',
    partyTitle: '한남 와인 5:5',
    lastMessage: null,
    members: [],
    lastReadAt: null,
  },
]

describe('chat realtime cache helpers', () => {
  it('appends a socket message once', () => {
    const current = [message]

    expect(appendRealtimeMessage(current, message)).toBe(current)
    expect(appendRealtimeMessage([], message)).toEqual([message])
  })

  it('keeps an unfetched room message cache untouched', () => {
    expect(appendRealtimeMessage(undefined, message)).toBeUndefined()
  })

  it('updates the matching room preview from a realtime message', () => {
    expect(updateRoomPreviewFromMessage(rooms, message)).toEqual([
      {
        ...rooms[0],
        lastMessage: {
          body: message.body,
          kind: message.kind,
          createdAt: message.createdAt,
        },
      },
    ])
  })

  it('keeps rooms unchanged when the message room is not in the list', () => {
    const otherMessage = { ...message, roomId: 'room_missing' }

    expect(updateRoomPreviewFromMessage(rooms, otherMessage)).toBe(rooms)
  })
})
