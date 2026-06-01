import { describe, expect, it } from 'vitest'
import {
  prependRealtimeNotification,
  incrementUnreadCount,
  type NotificationItem,
} from './realtime-cache'

describe('notification realtime cache helpers', () => {
  const current: NotificationItem[] = [
    {
      id: 'nt_1',
      kind: 'party_join',
      title: '새 참가자',
      body: null,
      link: '/host',
      isRead: false,
      createdAt: '2026-06-01T00:00:00.000Z',
    },
  ]

  it('prepends a live notification to an existing list', () => {
    expect(
      prependRealtimeNotification(current, {
        kind: 'message',
        title: '새 메시지',
        body: '안녕하세요',
        link: '/chats/room_1',
      }),
    ).toEqual([
      expect.objectContaining({
        kind: 'message',
        title: '새 메시지',
        body: '안녕하세요',
        link: '/chats/room_1',
        isRead: false,
      }),
      current[0],
    ])
  })

  it('keeps an unloaded notification list unloaded', () => {
    expect(prependRealtimeNotification(undefined, { kind: 'message', title: '새 메시지' })).toBe(
      undefined,
    )
  })

  it('increments unread count when the count cache is available', () => {
    expect(incrementUnreadCount({ count: 2 })).toEqual({ count: 3 })
  })
})
