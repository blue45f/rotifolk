import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getEmbedUrl, useBgmQueue } from './useBgmQueue'

const storageKey = (partyId: string) => `rotifolk-bgm-${partyId}`

const sampleTrack = {
  id: 'track-1',
  title: 'first',
  url: 'https://open.spotify.com/track/abc123',
  addedBy: 'alice',
}

describe('useBgmQueue', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useRealTimers()
  })

  it('loads cached queue and clamps out-of-range current index', () => {
    window.localStorage.setItem(
      storageKey('party-1'),
      JSON.stringify({
        tracks: [sampleTrack, { ...sampleTrack, id: 'track-2', title: 'second' }],
        current: 9,
      })
    )

    const { result } = renderHook(() => useBgmQueue('party-1'))

    expect(result.current.tracks).toHaveLength(2)
    expect(result.current.current).toBe(2)
    expect(result.current.currentTrack?.id).toBe('track-2')
  })

  it('adds first track and ignores empty input', async () => {
    const { result } = renderHook(() => useBgmQueue('party-1', '닉네임'))

    act(() => {
      result.current.addTrack('')
      result.current.addTrack(' https://www.youtube.com/watch?v=yt-id', '유튜브', '박지현')
    })

    expect(result.current.tracks).toHaveLength(1)
    expect(result.current.current).toBe(1)
    expect(result.current.currentTrack).toMatchObject({
      title: '유튜브',
      addedBy: '박지현',
      url: 'https://www.youtube.com/watch?v=yt-id',
    })
  })

  it('removes a track and keeps a valid current pointer', () => {
    const { result } = renderHook(() => useBgmQueue('party-1'))

    act(() => {
      result.current.addTrack('https://www.youtube.com/watch?v=1', 'A', '유저')
      result.current.addTrack('https://www.youtube.com/watch?v=2', 'B', '유저')
      result.current.addTrack('https://www.youtube.com/watch?v=3', 'C', '유저')
      result.current.playNext()
    })

    const secondId = result.current.tracks[1].id
    act(() => {
      result.current.removeTrack(secondId)
    })

    expect(result.current.tracks).toHaveLength(2)
    expect(result.current.current).toBe(2)
    expect(result.current.currentTrack?.title).toBe('C')

    const persisted = JSON.parse(window.localStorage.getItem(storageKey('party-1')) ?? '{}')
    expect(persisted.current).toBe(2)
    expect(persisted.tracks).toHaveLength(2)
  })

  it('normalizes prev/next playback boundaries', () => {
    const { result } = renderHook(() => useBgmQueue('party-1'))

    act(() => {
      result.current.addTrack('https://www.youtube.com/watch?v=1', 'A')
      result.current.addTrack('https://www.youtube.com/watch?v=2', 'B')
    })

    act(() => {
      result.current.playPrev()
    })
    expect(result.current.current).toBe(2)

    act(() => {
      result.current.playNext()
    })
    expect(result.current.current).toBe(1)
  })
})

describe('getEmbedUrl', () => {
  it('converts supported music URLs to embeddable links', () => {
    expect(getEmbedUrl('https://youtu.be/abc123')).toBe(
      'https://www.youtube.com/embed/abc123?autoplay=0'
    )
    expect(getEmbedUrl('https://www.youtube.com/watch?v=xyz987')).toBe(
      'https://www.youtube.com/embed/xyz987?autoplay=0'
    )
    expect(getEmbedUrl('https://www.youtube.com/shorts/shorty')).toBe(
      'https://www.youtube.com/embed/shorty?autoplay=0'
    )
    expect(getEmbedUrl('https://open.spotify.com/track/track123')).toBe(
      'https://open.spotify.com/embed/track/track123?utm_source=oembed'
    )
    expect(getEmbedUrl('https://example.com/raw-track')).toBe('https://example.com/raw-track')
  })
})
