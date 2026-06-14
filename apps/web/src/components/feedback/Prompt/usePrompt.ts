import { useContext } from 'react'

import { PromptContext, type PromptFn } from './PromptContext'

export function usePrompt(): PromptFn {
  const ctx = useContext(PromptContext)
  if (!ctx) throw new Error('usePrompt must be used within a PromptProvider')
  return ctx
}
