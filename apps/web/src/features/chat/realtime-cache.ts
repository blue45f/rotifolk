import type { ChatMessage, ChatRoomSummary } from './queries'

export type { ChatMessage, ChatRoomSummary }

export function appendRealtimeMessage(
  current: ChatMessage[] | undefined,
  message: ChatMessage
): ChatMessage[] | undefined {
  if (!current) return current
  if (current.some((item) => item.id === message.id)) return current
  return [...current, message]
}

export function updateRoomPreviewFromMessage(
  current: ChatRoomSummary[] | undefined,
  message: ChatMessage
): ChatRoomSummary[] | undefined {
  if (!current) return current

  let changed = false
  const next = current.map((room) => {
    if (room.id !== message.roomId) return room
    changed = true
    return {
      ...room,
      lastMessage: {
        body: message.body,
        kind: message.kind,
        createdAt: message.createdAt,
      },
    }
  })

  return changed ? next : current
}
