import type { User } from '@rotifolk/shared'

const PRIMARY_KEY = 'toss-auth'
const LEGACY_KEY = 'rotifolk-auth'

interface LegacyZustandEnvelope {
  state?: {
    token?: string | null
    user?: User | null
  }
}

export function readAuthToken(): string | null {
  const fromPrimary = readTokenFromPrimary()
  if (fromPrimary) return fromPrimary
  return readTokenFromLegacy()
}

export function readAuthSession(): { token: string | null; user: User | null } {
  const primary = readStorageValue(PRIMARY_KEY)
  if (primary && isAuthSession(primary)) return primary

  const legacy = readRawValue(LEGACY_KEY)
  if (legacy && isLegacyEnvelope(legacy)) {
    const token = typeof legacy.state?.token === 'string' ? (legacy.state?.token ?? null) : null
    const user =
      legacy.state?.user && isObject(legacy.state.user) ? (legacy.state.user as User) : null
    return { token: token ?? null, user: user ?? null }
  }

  return { token: null, user: null }
}

function isAuthSession(value: unknown): value is { token: string | null; user: User | null } {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, 'token')
  )
}

function isLegacyEnvelope(value: unknown): value is LegacyZustandEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, 'state') &&
    !!(value as { state?: unknown }).state &&
    typeof (value as { state?: unknown }).state === 'object'
  )
}

function readTokenFromPrimary(): string | null {
  const primary = readStorageValue(PRIMARY_KEY)
  return primary?.token ?? null
}

function readTokenFromLegacy(): string | null {
  const legacy = readRawValue(LEGACY_KEY)
  if (legacy && isLegacyEnvelope(legacy)) {
    const token = legacy.state?.token
    if (typeof token === 'string') return token
  }
  return null
}

function readStorageValue(rawKey: string): { token: string | null; user: User | null } | null {
  // zustand persist는 `{ state: { token, user }, version }` 형태로 저장해요.
  // 같은 키를 직접 읽을 때도 envelope를 풀어 token/user에 접근해야 해요.
  const raw = unwrapEnvelope(readRawValue(rawKey))
  if (!raw) return null
  if (isAuthSession(raw)) return raw
  return null
}

function unwrapEnvelope(value: unknown): unknown {
  if (isObject(value) && 'state' in value && isObject((value as { state?: unknown }).state)) {
    return (value as { state: unknown }).state
  }
  return value
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readRawValue(key: string): unknown {
  try {
    const raw = globalThis.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}
