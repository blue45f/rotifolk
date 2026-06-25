import { useEffect, useState } from 'react'

interface ParsedPath {
  kind: 'party' | 'home'
  partyId?: string
}

export function useHashPath(): string {
  const [path, setPath] = useState(() => window.location.hash.slice(1) || '/')
  useEffect(() => {
    const onChange = () => setPath(window.location.hash.slice(1) || '/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return path
}

export function parseRoute(rawPath: string): ParsedPath {
  const path = rawPath.split('?')[0]
  const m = path.match(/^\/part(?:ies)?\/(.+)$/)
  if (m?.[1]) {
    return { kind: 'party', partyId: decodeURIComponent(m[1]) }
  }
  return { kind: 'home' }
}

export function useRoute() {
  const path = useHashPath()
  return parseRoute(path)
}

export const navigate = (to: string) => {
  window.location.hash = to
}
