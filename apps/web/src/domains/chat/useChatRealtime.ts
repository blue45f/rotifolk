import { getSocket } from '@domains/live/socket'
import { useAuthStore } from '@store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { chatKeys, type ChatMessage, type ChatRoomSummary } from './queries'
import { appendRealtimeMessage, updateRoomPreviewFromMessage } from './realtime-cache'

export function useChatRealtime() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) return

    const socket = getSocket()
    const onMessage = ({ message }: { message: ChatMessage }) => {
      queryClient.setQueryData<ChatMessage[] | undefined>(
        chatKeys.messages(message.roomId),
        (current) => appendRealtimeMessage(current, message)
      )
      queryClient.setQueryData<ChatRoomSummary[] | undefined>(chatKeys.rooms, (current) =>
        updateRoomPreviewFromMessage(current, message)
      )
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms })
      queryClient.invalidateQueries({ queryKey: chatKeys.unread })
    }
    const onRead = ({ roomId: readRoomId }: { roomId: string }) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(readRoomId) })
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms })
      queryClient.invalidateQueries({ queryKey: chatKeys.unread })
    }

    socket.on('chat:message:new', onMessage)
    socket.on('chat:room:read', onRead)
    return () => {
      socket.off('chat:message:new', onMessage)
      socket.off('chat:room:read', onRead)
    }
  }, [user, queryClient])
}
