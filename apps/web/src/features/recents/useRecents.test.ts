import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useRecents } from './useRecents'

const STORAGE_KEY = 'rotifolk-recents'

describe('useRecents', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useRealTimers()
  })

  it('ignores malformed stored entries', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'valid', title: '성수 와인', category: 'wine', visitedAt: 1_000 },
        { id: 'no-category', title: '카테고리 없음', visitedAt: 2_000 },
        { id: 'bad-visited', title: '시간 문자열', category: 'coffee', visitedAt: 'soon' },
        { id: '', title: '빈 id', category: 'tea', visitedAt: 3_000 },
        null,
      ])
    )

    const { result } = renderHook(() => useRecents())

    expect(result.current.items).toEqual([
      { id: 'valid', title: '성수 와인', category: 'wine', visitedAt: 1_000 },
    ])
  })

  it('tracks the newest party first, deduplicates by id, and caps the list', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))
    const { result } = renderHook(() => useRecents())

    act(() => {
      for (let i = 0; i < 13; i += 1) {
        result.current.track({ id: `party-${i}`, title: `모임 ${i}`, category: 'wine' })
      }
      result.current.track({ id: 'party-3', title: '업데이트된 모임 3', category: 'coffee' })
    })

    expect(result.current.items).toHaveLength(12)
    expect(result.current.items[0]).toMatchObject({
      id: 'party-3',
      title: '업데이트된 모임 3',
      category: 'coffee',
    })
    expect(result.current.items.filter((item) => item.id === 'party-3')).toHaveLength(1)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(
      result.current.items
    )
  })

  it('reloads items from localStorage when another tab updates the key', () => {
    const { result } = renderHook(() => useRecents())

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ id: 'external', title: '다른 탭 모임', category: 'tea', visitedAt: 123 }])
    )
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
    })

    expect(result.current.items).toEqual([
      { id: 'external', title: '다른 탭 모임', category: 'tea', visitedAt: 123 },
    ])
  })
})
