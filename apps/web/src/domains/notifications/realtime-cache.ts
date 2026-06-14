import type { ServerToClientEvents } from '@rotifolk/shared'

export interface NotificationItem {
  id: string
  kind: string
  title: string
  body: string | null
  link: string | null
  isRead: boolean
  createdAt: string
}

export type NotificationPayload = Parameters<ServerToClientEvents['notification:new']>[0]

export function prependRealtimeNotification(
  current: NotificationItem[] | undefined,
  payload: NotificationPayload
): NotificationItem[] | undefined {
  if (!current) return current
  const createdAt = new Date().toISOString()
  return [
    {
      id: `live_${createdAt}_${payload.kind}_${payload.title}`,
      kind: payload.kind,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
      isRead: false,
      createdAt,
    },
    ...current,
  ]
}

export function incrementUnreadCount<T extends { count: number }>(current: T | undefined) {
  if (!current) return current
  return { ...current, count: current.count + 1 }
}
