import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@rotifolk/shared'
import { useAuthStore } from '@store/authStore'

let singleton: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (singleton) return singleton
  const token = useAuthStore.getState().token
  // dev: Vite HMR ws와 충돌 회피 위해 NestJS 서버로 직접 연결
  const url =
    import.meta.env.VITE_SOCKET_URL ??
    (import.meta.env.DEV ? 'http://localhost:3000' : '')
  singleton = io(url, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 800,
  })
  return singleton
}

export function disconnectSocket() {
  singleton?.disconnect()
  singleton = null
}
