import { useCallback, useEffect, useState } from 'react'

const KEY = 'rotifolk-recent-searches'
const MAX = 8

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x.length > 0) : []
  } catch {
    return []
  }
}

function save(arr: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr))
  } catch {}
}

export function useRecentSearches() {
  const [items, setItems] = useState<string[]>(() => load())

  const remember = useCallback((term: string) => {
    const t = term.trim()
    if (!t) return
    setItems((prev) => {
      const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX)
      save(next)
      return next
    })
  }, [])

  const forget = useCallback((term: string) => {
    setItems((prev) => {
      const next = prev.filter((x) => x !== term)
      save(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setItems([])
    save([])
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setItems(load())
    }
    globalThis.addEventListener('storage', onStorage)
    return () => globalThis.removeEventListener('storage', onStorage)
  }, [])

  return { items, remember, forget, clearAll }
}
