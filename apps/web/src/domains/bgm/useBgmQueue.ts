import { useCallback, useEffect, useMemo, useState } from 'react'

export interface BgmTrack {
  id: string
  title: string
  url: string
  addedBy: string
}

interface PersistedState {
  tracks: BgmTrack[]
  current: number
}

const STORAGE_PREFIX = 'rotifolk-bgm-'

const storageKey = (partyId: string | undefined) =>
  partyId ? `${STORAGE_PREFIX}${partyId}` : `${STORAGE_PREFIX}_unknown`

function isTrack(value: unknown): value is BgmTrack {
  const candidate = value as Partial<BgmTrack>
  return (
    typeof candidate?.id === 'string' &&
    candidate.id.trim().length > 0 &&
    typeof candidate?.title === 'string' &&
    candidate.title.trim().length > 0 &&
    typeof candidate?.url === 'string' &&
    candidate.url.trim().length > 0 &&
    typeof candidate?.addedBy === 'string' &&
    candidate.addedBy.trim().length > 0
  )
}

function normalizeCurrent(value: unknown, length: number): number {
  if (length <= 0) return 0
  const idx = Number(value)
  if (!Number.isFinite(idx)) return 0
  const int = Number.isInteger(idx) ? idx : Math.trunc(idx)
  return Math.max(1, Math.min(int, length))
}

function readCache(partyId: string | undefined): PersistedState {
  if (!partyId) return { tracks: [], current: 0 }
  try {
    const raw = localStorage.getItem(storageKey(partyId))
    if (!raw) return { tracks: [], current: 0 }
    const obj = JSON.parse(raw) as PersistedState
    if (!Array.isArray(obj?.tracks)) return { tracks: [], current: 0 }

    const tracks = obj.tracks.filter(isTrack)
    if (tracks.length === 0) return { tracks: [], current: 0 }

    return {
      tracks,
      current: normalizeCurrent(obj.current, tracks.length),
    }
  } catch {
    return { tracks: [], current: 0 }
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID()
    } catch {}
  }
  return `bgm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id || null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch') {
        const v = u.searchParams.get('v')
        return v || null
      }
      const embedMatch = u.pathname.match(/^\/embed\/([^/?#]+)/)
      if (embedMatch) return embedMatch[1]
      const shortsMatch = u.pathname.match(/^\/shorts\/([^/?#]+)/)
      if (shortsMatch) return shortsMatch[1]
    }
    return null
  } catch {
    return null
  }
}

function extractSpotifyTrackId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host !== 'open.spotify.com' && host !== 'spotify.com') return null
    const match = u.pathname.match(/\/track\/([^/?#]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export function getEmbedUrl(url: string): string {
  const yt = extractYouTubeId(url)
  if (yt) return `https://www.youtube.com/embed/${yt}?autoplay=0`
  const sp = extractSpotifyTrackId(url)
  if (sp) return `https://open.spotify.com/embed/track/${sp}?utm_source=oembed`
  return url
}

export interface UseBgmQueueResult {
  tracks: BgmTrack[]
  current: number
  currentTrack: BgmTrack | null
  addTrack: (url: string, title?: string, addedBy?: string) => void
  removeTrack: (id: string) => void
  playNext: () => void
  playPrev: () => void
}

export function useBgmQueue(
  partyId: string | undefined,
  currentNickname?: string
): UseBgmQueueResult {
  const [tracks, setTracks] = useState<BgmTrack[]>(() => readCache(partyId).tracks)
  const [current, setCurrent] = useState<number>(() => readCache(partyId).current)
  // Reload when partyId changes
  useEffect(() => {
    const cached = readCache(partyId)
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setTracks(cached.tracks)
      setCurrent(cached.current)
    })
    return () => {
      cancelled = true
    }
  }, [partyId])

  // Persist on change
  useEffect(() => {
    if (!partyId) return
    try {
      localStorage.setItem(
        storageKey(partyId),
        JSON.stringify({ tracks, current } satisfies PersistedState)
      )
    } catch {}
  }, [partyId, tracks, current])

  const addTrack = useCallback(
    (url: string, title?: string, addedBy?: string) => {
      const trimmed = url.trim()
      if (!trimmed) return
      const fallbackTitle = title?.trim() || trimmed
      const track: BgmTrack = {
        id: generateId(),
        title: fallbackTitle,
        url: trimmed,
        addedBy: addedBy ?? currentNickname ?? '익명',
      }
      setTracks((prev) => {
        const next = [...prev, track]
        setCurrent((c) => {
          const current = normalizeCurrent(c, prev.length)
          return current === 0 ? 1 : current
        })
        return next
      })
    },
    [currentNickname]
  )

  const removeTrack = useCallback((id: string) => {
    setTracks((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return prev
      const next = prev.filter((t) => t.id !== id)

      setCurrent((c) => {
        if (next.length === 0) return 0

        const current = normalizeCurrent(c, prev.length)
        const nextCurrent = idx + 1 < current ? current - 1 : current
        return normalizeCurrent(nextCurrent, next.length)
      })

      return next
    })
  }, [])

  const playNext = useCallback(() => {
    setTracks((prev) => {
      if (prev.length === 0) return prev

      setCurrent((c) => {
        const current = normalizeCurrent(c, prev.length)
        return current >= prev.length ? 1 : current + 1
      })

      return prev
    })
  }, [])

  const playPrev = useCallback(() => {
    setTracks((prev) => {
      if (prev.length === 0) return prev

      setCurrent((c) => {
        const current = normalizeCurrent(c, prev.length)
        return current <= 1 ? prev.length : current - 1
      })

      return prev
    })
  }, [])

  const currentTrack = useMemo<BgmTrack | null>(() => {
    if (current < 1 || current > tracks.length) return null
    return tracks[current - 1] ?? null
  }, [tracks, current])

  return {
    tracks,
    current,
    currentTrack,
    addTrack,
    removeTrack,
    playNext,
    playPrev,
  }
}
