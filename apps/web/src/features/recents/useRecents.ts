import { useCallback, useEffect, useState } from 'react'

const KEY = 'rotifolk-recents'
const MAX = 12

export interface RecentParty {
  id: string
  title: string
  category: string
  visitedAt: number
}

function load(): RecentParty[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => x?.id && x?.title) : []
  } catch {
    return []
  }
}

function save(arr: RecentParty[]) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)) } catch {}
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
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return { items, track }
}
