import { createContext } from 'react'

export interface PromptOptions {
  title: string
  description?: string
  /** Visible label for the text field (also its accessible name). */
  label: string
  placeholder?: string
  defaultValue?: string
  confirmLabel?: string
  cancelLabel?: string
  maxLength?: number
}

/** Resolves to the entered string, or `null` when cancelled/dismissed. */
export type PromptFn = (options: PromptOptions) => Promise<string | null>

export const PromptContext = createContext<PromptFn | null>(null)
