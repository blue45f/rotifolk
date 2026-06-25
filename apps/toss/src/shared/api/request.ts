import type { User } from '@rotifolk/shared'

import { readAuthToken } from '@/shared/storage/authToken'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiResponseErrorBody {
  message?: string
  code?: string
  details?: unknown
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  json?: unknown
  query?: Record<string, string | number | boolean>
  signal?: AbortSignal
  headers?: HeadersInit
}

function buildUrl(path: string, query?: Record<string, string | number | boolean>) {
  const normalizedBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  const full = `${normalizedBase}/${normalizedPath}`
  const url = new URL(
    full,
    typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  )

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value))
    }
  }

  return full + (url.search ? `?${url.searchParams.toString()}` : '')
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = readAuthToken()
  const { method = 'GET', json, query, signal, headers } = options

  const headersObj = new Headers(headers)
  if (json != null) headersObj.set('Content-Type', 'application/json')
  if (token) headersObj.set('Authorization', `Bearer ${token}`)

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: headersObj,
    signal,
    body: json == null ? undefined : JSON.stringify(json),
  })

  if (!response.ok) {
    let body: ApiResponseErrorBody = {}
    try {
      body = (await response.json()) as ApiResponseErrorBody
    } catch {
      // ignore parse failure
    }
    throw new ApiError(
      response.status,
      body.code ?? 'api_error',
      body.message ?? `HTTP ${response.status}`,
      body.details
    )
  }

  const text = await response.text()
  if (!text) return undefined as T

  try {
    return JSON.parse(text) as T
  } catch {
    return undefined as T
  }
}

export type { User }
