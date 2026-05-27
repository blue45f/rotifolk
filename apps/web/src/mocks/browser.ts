import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

export async function startMockServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
  // eslint-disable-next-line no-console
  console.info('🧪 MSW running — Rotifolk is in mock mode')
}
