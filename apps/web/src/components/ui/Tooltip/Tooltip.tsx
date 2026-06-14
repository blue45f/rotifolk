import * as RTooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'
import styles from './Tooltip.module.css'

/**
 * App-level tooltip provider. Mount once near the root so every <Tooltip>
 * shares one hover-intent delay (and the skip-delay grace period when moving
 * between adjacent triggers).
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={300} skipDelayDuration={200}>
      {children}
    </RTooltip.Provider>
  )
}

interface TooltipProps {
  /** Visible tooltip text. The trigger must still carry its own aria-label. */
  label: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

/**
 * Radix Tooltip wrapper. Radix handles hover/focus open, Escape, and pointer
 * vs keyboard intent; positioning is portaled. The tooltip is presentational
 * (aria-hidden) — keep an aria-label on the trigger for the accessible name.
 */
export function Tooltip({ label, children, side = 'bottom', align = 'center' }: TooltipProps) {
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content className={styles.content} side={side} align={align} sideOffset={6}>
          {label}
          <RTooltip.Arrow className={styles.arrow} />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  )
}
