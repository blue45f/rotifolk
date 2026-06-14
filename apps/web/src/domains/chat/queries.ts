import { api } from '@infrastructure/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface ChatRoomSummary {
  id: string
  kind: 'group' | 'pair'
  title: string | null
  partyId: string | null
  partyTitle: string | null
  lastMessage: { body: string; kind: string; createdAt: string } | null
  members: {
    userId: string
    nickname: string
    avatarId: string | null
    /** 업로드한 프로필 사진(data URL) — 없으면 프리셋/이니셜 폴백. */
    avatarImage?: string | null
  }[]
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
  unread: ['chat', 'unread-count'] as const,
  messages: (roomId: string) => ['chat', 'messages', roomId] as const,
}

export function useMyChatRooms() {
  return useQuery({
    queryKey: chatKeys.rooms,
    queryFn: () => api.get<ChatRoomSummary[]>('chat/rooms'),
  })
}

export function useChatMessages(roomId: string | undefined) {
  return useQuery({
    queryKey: roomId ? chatKeys.messages(roomId) : ['chat', 'messages', 'none'],
    queryFn: () => api.get<ChatMessage[]>(`chat/rooms/${roomId}/messages`),
    enabled: !!roomId,
  })
}

export function useSendMessage(roomId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      body: string
      kind?: 'text' | 'split-bill'
      meta?: Record<string, unknown>
    }) => api.post<ChatMessage>(`chat/rooms/${roomId}/messages`, payload),
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

export function useMarkChatRead(roomId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => {
      if (!roomId) return Promise.reject(new Error('roomId is required'))
      return api.post<{ ok: true }>(`chat/rooms/${roomId}/read`, {})
    },
    onSuccess: () => {
      if (roomId) queryClient.invalidateQueries({ queryKey: chatKeys.messages(roomId) })
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms })
      queryClient.invalidateQueries({ queryKey: chatKeys.unread })
    },
  })
}
