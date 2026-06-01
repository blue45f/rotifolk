import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@rotifolk/shared'
import { useAuthStore } from '@store/authStore'

let singleton: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
let socketToken: string | null = null

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  const nextToken = useAuthStore.getState().token ?? ''

  const mockMode = import.meta.env.VITE_USE_MSW === 'true' || import.meta.env.VITE_USE_MSW === '1'
  const url =
    (mockMode ? window.location.origin : import.meta.env.VITE_SOCKET_URL) ??
    (import.meta.env.DEV ? 'http://localhost:3000' : '')

  if (singleton) {
    if (socketToken !== nextToken) {
      socketToken = nextToken
      singleton.auth = { token: nextToken }
      if (singleton.connected) {
        singleton.disconnect().connect()
      } else if (!mockMode && nextToken) {
        singleton.connect()
      }
    }
    return singleton
  }

  singleton = io(url, {
    path: '/socket.io',
    auth: { token: nextToken },
    transports: ['websocket', 'polling'],
    autoConnect: !mockMode,
    reconnection: !mockMode,
    reconnectionDelay: 800,
  })
  socketToken = nextToken
  return singleton
}

export function disconnectSocket() {
  singleton?.disconnect()
  singleton = null
  socketToken = null
}
