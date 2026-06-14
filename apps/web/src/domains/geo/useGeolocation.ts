import { useEffect, useState, useCallback } from 'react'

interface GeoState {
  status: 'idle' | 'pending' | 'granted' | 'denied' | 'unsupported'
  coords?: { lat: number; lng: number }
  error?: string
}

const STORAGE_KEY = 'rotifolk-geo'

function readCache(): GeoState['coords'] | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const obj = JSON.parse(raw)
    if (typeof obj?.lat === 'number' && typeof obj?.lng === 'number') return obj
  } catch {}
  return undefined
}

/**
 * Geolocation API 래퍼.
 * 첫 호출은 권한 요청 → 받으면 localStorage 캐시.
 * 모바일 사파리/안드로이드 크롬 모두 동작.
 */
export function useGeolocation(autoRequest = false): GeoState & { request: () => void } {
  const [state, setState] = useState<GeoState>(() => {
    const cached = readCache()
    return cached ? { status: 'granted', coords: cached } : { status: 'idle' }
  })

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported' })
      return
    }
    setState((s) => ({ ...s, status: 'pending' }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(coords))
        } catch {}
        setState({ status: 'granted', coords })
      },
      (err) => setState({ status: 'denied', error: err.message }),
      { enableHighAccuracy: false, maximumAge: 60_000 * 30, timeout: 8000 }
    )
  }, [])

  useEffect(() => {
    if (!autoRequest || state.status !== 'idle') return
    const timer = window.setTimeout(request, 0)
    return () => window.clearTimeout(timer)
  }, [autoRequest, state.status, request])

  return { ...state, request }
}
