/** Prisma SQLite는 JSON 컬럼이 없어 문자열로 저장 — 안전 헬퍼. */
export function parseJsonArray<T = unknown>(raw: string | null | undefined): T[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? (v as T[]) : []
  } catch {
    return []
  }
}

export function parseJsonObject<T extends Record<string, unknown> = Record<string, unknown>>(
  raw: string | null | undefined,
): T {
  if (!raw) return {} as T
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : ({} as T)
  } catch {
    return {} as T
  }
}

export function toJsonString(value: unknown): string {
  return JSON.stringify(value ?? null)
}
