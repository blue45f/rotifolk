import ky, { HTTPError, type KyInstance, type Options } from 'ky'
import { useAuthStore } from '@store/authStore'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const apiClient: KyInstance = ky.create({
  prefix: API_BASE,
  timeout: 20_000,
  retry: { limit: 1, methods: ['get'] },
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const token = useAuthStore.getState().token
        if (token) request.headers.set('authorization', `Bearer ${token}`)
      },
    ],
    afterResponse: [
      async ({ response }) => {
        if (response.status === 401) {
          useAuthStore.getState().clear()
        }
        return response
      },
    ],
    beforeError: [
      async ({ error }) => {
        if (error instanceof HTTPError) {
          try {
            const body = (await error.response.clone().json()) as {
              message?: string
              code?: string
              details?: unknown
            }
            return new ApiError(
              error.response.status,
              body.code ?? 'unknown',
              body.message ?? error.message,
              body.details,
            )
          } catch {
            // JSON parsing failed, return original error
          }
        }
        return error
      },
    ],
  },
})

export const api = {
  get: <T>(path: string, opts?: Options) => apiClient.get(path, opts).json<T>(),
  post: <T>(path: string, body?: unknown, opts?: Options) =>
    apiClient.post(path, { json: body, ...opts }).json<T>(),
  put: <T>(path: string, body?: unknown, opts?: Options) =>
    apiClient.put(path, { json: body, ...opts }).json<T>(),
  patch: <T>(path: string, body?: unknown, opts?: Options) =>
    apiClient.patch(path, { json: body, ...opts }).json<T>(),
  delete: <T>(path: string, opts?: Options) => apiClient.delete(path, opts).json<T>(),
}
