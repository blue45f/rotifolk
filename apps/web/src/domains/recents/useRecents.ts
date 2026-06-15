import { useCallback, useEffect, useState } from 'react'

const KEY = 'rotifolk-recents'
const MAX = 12

export interface RecentParty {
  id: string
  title: string
  category: string
  visitedAt: number
}

function isRecentParty(value: unknown): value is RecentParty {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.title === 'string' &&
    item.title.length > 0 &&
    typeof item.category === 'string' &&
    item.category.length > 0 &&
    typeof item.visitedAt === 'number' &&
    Number.isFinite(item.visitedAt)
  )
}

function load(): RecentParty[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter(isRecentParty).slice(0, MAX) : []
  } catch {
    return []
  }
}

function save(arr: RecentParty[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr))
  } catch {}
}

/** localStorage 기반 최근 본 모임 (메모리 + 영속) */
export function useRecents() {
  const [items, setItems] = useState<RecentParty[]>(() => load())

  const track = useCallback((p: { id: string; title: string; category: string }) => {
    setItems((prev) => {
      const next: RecentParty[] = [
        { id: p.id, title: p.title, category: p.category, visitedAt: Date.now() },
        ...prev.filter((x) => x.id !== p.id),
      ].slice(0, MAX)
      save(next)
      return next
    })
  }, [])

  useEffect(() => {
    // cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setItems(load())
    }
    globalThis.addEventListener('storage', onStorage)
    return () => globalThis.removeEventListener('storage', onStorage)
  }, [])

  return { items, track }
}
