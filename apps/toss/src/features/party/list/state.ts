import { useCallback, useEffect, useMemo, useState } from 'react'

import { getParties, type Party } from '@/features/party/lib/partyApi'

export interface PartyListPageState {
  items: Party[]
  loading: boolean
  error: string | null
  query: string
  selectedCategory: string
  categories: string[]
  filteredItems: Party[]
  filteredCount: number
  setQuery: (query: string) => void
  setSelectedCategory: (category: string) => void
  retry: () => void
}

const ALL_CATEGORY = '전체'

export function usePartyListPageState(): PartyListPageState {
  const [items, setItems] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await getParties({ pageSize: 20 })
      setItems(next)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '목록을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const categories = useMemo(() => {
    const countByCategory = new Map<string, number>()
    for (const item of items) {
      const cat = item.categoryLabel
      countByCategory.set(cat, (countByCategory.get(cat) ?? 0) + 1)
    }
    return [
      ALL_CATEGORY,
      ...[...countByCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([category]) => category)
        .slice(0, 7),
    ]
  }, [items])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((party) => {
      const isCategoryMatch =
        selectedCategory === ALL_CATEGORY || party.categoryLabel === selectedCategory
      if (!isCategoryMatch) return false
      if (!q) return true

      const payload = [
        party.title,
        party.description,
        party.venueName,
        party.area,
        party.categoryLabel,
        ...(party.tags ?? []),
      ]

      return payload.filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }, [items, query, selectedCategory])

  return {
    items,
    loading,
    error,
    query,
    selectedCategory,
    categories,
    filteredItems,
    filteredCount: filteredItems.length,
    setQuery,
    setSelectedCategory,
    retry: () => {
      void fetchList()
    },
  }
}
