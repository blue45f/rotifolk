import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@services/api'

export interface ChatRoomSummary {
  id: string
  kind: 'group' | 'pair'
  title: string | null
  partyId: string | null
  partyTitle: string | null
  lastMessage: { body: string; kind: string; createdAt: string } | null
  members: { userId: string; nickname: string; avatarId: string | null }[]
  lastReadAt: string | null
}

export interface ChatMessage {
  id: string
  roomId: string
  userId: string
  nickname: string
  body: string
  kind: 'text' | 'system' | 'split-bill'
  meta?: Record<string, unknown> | null
  createdAt: string
}

export const chatKeys = {
  rooms: ['chat', 'rooms'] as const,
  messages: (roomId: string) => ['chat', 'messages', roomId] as const,
}

export function useMyChatRooms() {
  return useQuery({
    queryKey: chatKeys.rooms,
    queryFn: () => api.get<ChatRoomSummary[]>('chat/rooms'),
    refetchInterval: 15_000,
  })
}

export function useChatMessages(roomId: string | undefined) {
  return useQuery({
    queryKey: roomId ? chatKeys.messages(roomId) : ['chat', 'messages', 'none'],
    queryFn: () => api.get<ChatMessage[]>(`chat/rooms/${roomId}/messages`),
    enabled: !!roomId,
    refetchInterval: 4_000,
  })
}

export function useSendMessage(roomId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { body: string; kind?: 'text' | 'split-bill'; meta?: Record<string, unknown> }) =>
      api.post<ChatMessage>(`chat/rooms/${roomId}/messages`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(roomId) })
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms })
    },
  })
}

export function useEnsurePartyRoom() {
  return useMutation({
    mutationFn: (partyId: string) => api.post<{ id: string }>(`chat/parties/${partyId}/ensure`),
  })
}
