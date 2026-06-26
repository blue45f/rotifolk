import { ConfirmProvider } from '@components/feedback/Confirm/ConfirmProvider'
import { PromptProvider } from '@components/feedback/Prompt/PromptProvider'
import { ToastProvider } from '@components/feedback/Toast/ToastProvider'
import { TooltipProvider } from '@components/ui/Tooltip/Tooltip'
import { router } from '@router/index'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'

import { queryClient } from './queryClient'

import { I18nProvider } from '@/domains/i18n/i18n'
import { useUiAudioEnabled } from '@/domains/sound/useUiAudio'
import { useGlobalUiClickSound } from '@/hooks/useGlobalUiClickSound'

export default function AppProviders() {
  const uiAudio = useUiAudioEnabled()
  useGlobalUiClickSound({ enabled: uiAudio.isEnabled })

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <ConfirmProvider>
            <PromptProvider>
              <I18nProvider>
                <RouterProvider router={router} />
              </I18nProvider>
            </PromptProvider>
          </ConfirmProvider>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
