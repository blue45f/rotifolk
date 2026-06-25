import { useCallback, useEffect, useMemo, useState } from 'react'

interface BookmarkItem {
  id: string
  title: string
}

const STORAGE_KEY = 'rotifolk:toss:bookmark-parties:v1'

function readStoredBookmarks(): BookmarkItem[] {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return []
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is BookmarkItem => {
        return Boolean(item && typeof item.id === 'string' && typeof item.title === 'string')
      })
      .filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx)
  } catch {
    return []
  }
}

function writeBookmarks(items: BookmarkItem[]) {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // storage quota or privacy mode
  }
}

export function usePartyBookmarks() {
  const [items, setItems] = useState<BookmarkItem[]>(() => readStoredBookmarks())

  useEffect(() => {
    const onStorage = () => setItems(readStoredBookmarks())
    globalThis.addEventListener('storage', onStorage)
    return () => globalThis.removeEventListener('storage', onStorage)
  }, [])

  const ids = useMemo(() => new Set(items.map((item) => item.id)), [items])

  const toggle = useCallback((id: string, title: string) => {
    setItems((prev) => {
      const exists = prev.some((item) => item.id === id)
      const next = exists ? prev.filter((item) => item.id !== id) : [...prev, { id, title }]
      writeBookmarks(next)
      return next
    })
  }, [])

  const isBookmarked = useCallback((id: string) => ids.has(id), [ids])

  return { items, isBookmarked, toggle, count: items.length }
}
