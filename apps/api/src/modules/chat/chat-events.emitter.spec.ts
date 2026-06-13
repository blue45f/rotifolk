import { USER_ROOM } from '@rotifolk/shared'
import { describe, expect, it, vi } from 'vitest'

import { ChatEventsEmitter, type RealtimeChatMessage } from './chat-events.emitter'

describe('ChatEventsEmitter', () => {
  const message: RealtimeChatMessage = {
    id: 'msg_1',
    roomId: 'room_1',
    userId: 'u_sender',
    nickname: 'Sender',
    body: '오늘 라운드 좋았어요',
    kind: 'text',
    meta: null,
    createdAt: '2026-06-01T12:00:00.000Z',
  }

  it('emits new messages to every room member user channel', () => {
    const emit = vi.fn()
    const to = vi.fn(() => ({ emit }))
    const emitter = new ChatEventsEmitter()

    emitter.setServer({ to } as never)
    emitter.emitMessage(message, ['u_sender', 'u_receiver'])

    expect(to).toHaveBeenNthCalledWith(1, USER_ROOM('u_sender'))
    expect(to).toHaveBeenNthCalledWith(2, USER_ROOM('u_receiver'))
    expect(emit).toHaveBeenCalledTimes(2)
    expect(emit).toHaveBeenCalledWith('chat:message:new', { message })
  })

  it('emits read updates only to the reader user channel', () => {
    const emit = vi.fn()
    const to = vi.fn(() => ({ emit }))
    const emitter = new ChatEventsEmitter()

    emitter.setServer({ to } as never)
    emitter.emitRead('u_reader', 'room_1')

    expect(to).toHaveBeenCalledWith(USER_ROOM('u_reader'))
    expect(emit).toHaveBeenCalledWith('chat:room:read', { roomId: 'room_1' })
  })

  it('is a no-op before the socket server is ready', () => {
    const emitter = new ChatEventsEmitter()

    expect(() => emitter.emitMessage(message, ['u_sender'])).not.toThrow()
    expect(() => emitter.emitRead('u_sender', 'room_1')).not.toThrow()
  })
})
