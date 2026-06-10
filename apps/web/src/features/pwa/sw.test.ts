import { describe, expect, it, vi } from 'vitest'
import swSource from '../../../public/sw.js?raw'

interface SwRequest {
  mode: string
  url: string
}

interface SwEvent {
  request?: SwRequest
  waitUntil: (promise: Promise<unknown>) => void
  respondWith: (response: Promise<unknown>) => void
}

type SwListener = (event: SwEvent) => void

function createServiceWorker(cacheKeys: string[] = []) {
  const listeners = new Map<string, SwListener>()
  const cache = {
    add: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  }
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue(cacheKeys),
    delete: vi.fn().mockResolvedValue(true),
    match: vi.fn().mockResolvedValue(undefined),
  }
  const swSelf = {
    addEventListener: (type: string, listener: SwListener) => {
      listeners.set(type, listener)
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
  }
  const fetchMock = vi.fn()

  new Function('self', 'caches', 'fetch', swSource)(swSelf, caches, fetchMock)

  const dispatch = (type: string, request?: SwRequest) => {
    const waited: Promise<unknown>[] = []
    const responded: Promise<unknown>[] = []
    listeners.get(type)?.({
      request,
      waitUntil: (promise) => waited.push(promise),
      respondWith: (response) => responded.push(response),
    })
    return { waited, responded }
  }

  return { cache, caches, swSelf, fetchMock, dispatch }
}

describe('sw.js', () => {
  it('precaches the app shell and skips waiting on install', async () => {
    const sw = createServiceWorker()

    const { waited } = sw.dispatch('install')
    await Promise.all(waited)

    expect(sw.caches.open).toHaveBeenCalledWith('rotifolk-v1')
    expect(sw.cache.add).toHaveBeenCalledWith('/')
    expect(sw.swSelf.skipWaiting).toHaveBeenCalledTimes(1)
  })

  it('keeps installing when the shell precache fails', async () => {
    const sw = createServiceWorker()
    sw.cache.add.mockRejectedValueOnce(new Error('offline'))

    const { waited } = sw.dispatch('install')

    await expect(Promise.all(waited)).resolves.toBeDefined()
    expect(sw.swSelf.skipWaiting).toHaveBeenCalledTimes(1)
  })

  it('drops stale caches and claims clients on activate', async () => {
    const sw = createServiceWorker(['rotifolk-v0', 'rotifolk-v1', 'rotifolk-v2'])

    const { waited } = sw.dispatch('activate')
    await Promise.all(waited)

    expect(sw.caches.delete).toHaveBeenCalledTimes(2)
    expect(sw.caches.delete).toHaveBeenCalledWith('rotifolk-v0')
    expect(sw.caches.delete).toHaveBeenCalledWith('rotifolk-v2')
    expect(sw.caches.delete).not.toHaveBeenCalledWith('rotifolk-v1')
    expect(sw.swSelf.clients.claim).toHaveBeenCalledTimes(1)
  })

  it('falls back to the precached shell for offline deep links', async () => {
    const sw = createServiceWorker()
    const shell = { kind: 'shell' }
    sw.fetchMock.mockRejectedValue(new Error('offline'))
    sw.caches.match.mockImplementation((target: unknown) =>
      Promise.resolve(target === '/' ? shell : undefined),
    )

    const { responded } = sw.dispatch('fetch', {
      mode: 'navigate',
      url: 'https://rotifolk.example/parties/7',
    })

    await expect(responded[0]).resolves.toBe(shell)
  })

  it('ignores non-navigation fetches', () => {
    const sw = createServiceWorker()

    const { responded } = sw.dispatch('fetch', {
      mode: 'cors',
      url: 'https://rotifolk.example/api/parties',
    })

    expect(responded).toHaveLength(0)
    expect(sw.fetchMock).not.toHaveBeenCalled()
  })
})
