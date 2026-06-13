import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import AppProviders from '@/app/AppProviders'
import '@/styles/global.css'

async function bootstrap() {
  if (import.meta.env.VITE_USE_MSW === 'true' || import.meta.env.VITE_USE_MSW === '1') {
    const { startMockServiceWorker } = await import('@/mocks/browser')
    await startMockServiceWorker()
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders />
    </StrictMode>
  )
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
}

bootstrap()
