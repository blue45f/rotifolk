import { getSocket } from '@domains/live/socket'
import { useAuthStore } from '@store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import {
  incrementUnreadCount,
  prependRealtimeNotification,
  type NotificationItem,
} from './realtime-cache'

export const notificationKeys = {
  list: ['notifications'] as const,
  unread: ['notifications', 'unread-count'] as const,
}

export function useNotificationsRealtime() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) return

    const socket = getSocket()
    const onNotification = (payload: Parameters<typeof prependRealtimeNotification>[1]) => {
      queryClient.setQueryData<NotificationItem[] | undefined>(notificationKeys.list, (current) =>
        prependRealtimeNotification(current, payload)
      )
      queryClient.setQueryData<{ count: number } | undefined>(
        notificationKeys.unread,
        incrementUnreadCount
      )
      queryClient.invalidateQueries({ queryKey: notificationKeys.list })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread })
    }

    socket.on('notification:new', onNotification)
    return () => {
      socket.off('notification:new', onNotification)
    }
  }, [user, queryClient])
}
