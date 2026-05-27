import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { ToastProvider } from '@components/feedback/Toast/ToastProvider'
import { I18nProvider } from '@features/i18n/i18n'
import { router } from '@router/index'
import { queryClient } from './queryClient'

export default function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <I18nProvider>
          <RouterProvider router={router} />
        </I18nProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
