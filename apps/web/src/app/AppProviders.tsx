import { ConfirmProvider } from '@components/feedback/Confirm/ConfirmProvider'
import { PromptProvider } from '@components/feedback/Prompt/PromptProvider'
import { ToastProvider } from '@components/feedback/Toast/ToastProvider'
import { router } from '@router/index'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'

import { queryClient } from './queryClient'

import { I18nProvider } from '@/domains/i18n/i18n'

export default function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <PromptProvider>
            <I18nProvider>
              <RouterProvider router={router} />
            </I18nProvider>
          </PromptProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
