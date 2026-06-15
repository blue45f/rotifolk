const CACHE_NAME = 'rotifolk-v1'

globalThis.addEventListener('install', (event) => {
  // Precache the app shell so deep-link visitors get the '/' offline fallback below.
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add('/'))
      .catch(() => {})
  )
  globalThis.skipWaiting()
})

globalThis.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
        .catch(() => {}),
      globalThis.clients.claim(),
    ])
  )
})

globalThis.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
            .catch(() => {})
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    )
  }
})
