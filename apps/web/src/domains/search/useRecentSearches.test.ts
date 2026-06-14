import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useRecentSearches } from './useRecentSearches'

describe('useRecentSearches', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('normalizes, deduplicates by case-insensitive term, and caps list size', () => {
    const { result } = renderHook(() => useRecentSearches())

    act(() => {
      result.current.remember('  와인  ')
      result.current.remember('와인')
      result.current.remember('위스키')
      result.current.remember('beer')
      result.current.remember('SoDa')
      result.current.remember('soda')
      result.current.remember('tea')
      result.current.remember('coffee')
      result.current.remember('juice')
    })

    expect(result.current.items).toHaveLength(7)
    expect(result.current.items[0]).toBe('juice')
    expect(result.current.items).toContain('와인')
    expect(result.current.items.filter((item) => item === '와인')).toHaveLength(1)
    expect(result.current.items).toContain('soda')
    expect(result.current.items).not.toContain('SoDa')
  })

  it('forgets terms and clears all with persistence', () => {
    const { result } = renderHook(() => useRecentSearches())

    act(() => {
      result.current.remember('first')
      result.current.remember('second')
    })

    expect(result.current.items).toEqual(['second', 'first'])

    act(() => {
      result.current.forget('second')
    })

    expect(result.current.items).toEqual(['first'])

    act(() => {
      result.current.clearAll()
    })

    expect(result.current.items).toEqual([])
  })

  it('reloads across storage events', () => {
    const { result } = renderHook(() => useRecentSearches())
    window.localStorage.setItem('rotifolk-recent-searches', JSON.stringify(['foo', 'bar']))

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'rotifolk-recent-searches' }))
    })

    expect(result.current.items).toEqual(['foo', 'bar'])
  })
})
