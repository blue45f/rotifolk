import { useEffect } from 'react'

import { playBangTick } from '@/lib/uiSound'

const CLICKABLE_SELECTOR =
  'a[href], button, [role="button"], [role="link"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="tab"], [role="checkbox"], [role="switch"], [type="button"], [type="submit"], [type="reset"], [type="checkbox"], [type="radio"], summary, input, select, textarea, label[for], [tabindex]:not([tabindex="-1"]), [contenteditable="true"], [role="presentation"][tabindex]:not([tabindex="-1"]), [data-click-sound], [data-ui-clickable], [role="link"][tabindex]:not([tabindex="-1"])'
const CLICK_SOUND_COOLDOWN_MS = 55
const CLICK_PULSE_CLASS = 'ui-click-pulse'
const CLICK_PULSE_MS = 160
const VIBRATION_MS = 8

const isInsideInteractiveIgnore = (element: Element) => {
  return !!element.closest(
    '[data-ui-no-sound], [data-sound-off], [data-ui-local-sound], [aria-hidden="true"]'
  )
}

const isSkippableInput = (element: HTMLElement) => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const type = element.type
    if (type && ['text', 'email', 'search', 'password', 'url', 'tel', 'number'].includes(type)) {
      return true
    }
  }

  return false
}

export function useGlobalUiClickSound({ enabled = false }: { enabled?: boolean } = {}): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let lastPlayedAt = 0
    const rippleTimers = new WeakMap<HTMLElement, number>()
    const canTriggerNow = (event: MouseEvent) => {
      if (!event.target || !event.isTrusted) {
        return false
      }

      if (event.defaultPrevented) return false
      if (event.button !== undefined && event.button !== 0) return false
      return true
    }

    const onAnyClick = (event: MouseEvent) => {
      if (!canTriggerNow(event)) return
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return

      const targetLike = target.closest(CLICKABLE_SELECTOR)
      if (!(targetLike instanceof HTMLElement)) return
      if (isInsideInteractiveIgnore(targetLike)) return
      if (!targetLike.matches(CLICKABLE_SELECTOR)) {
        return
      }
      if (
        targetLike.hasAttribute('disabled') ||
        targetLike.getAttribute('aria-disabled') === 'true'
      )
        return
      if (isSkippableInput(targetLike)) return

      const now = Date.now()
      if (now - lastPlayedAt < CLICK_SOUND_COOLDOWN_MS) return
      lastPlayedAt = now

      playBangTick()

      if ('vibrate' in navigator) {
        navigator.vibrate(VIBRATION_MS)
      }

      if (targetLike.classList.contains(CLICK_PULSE_CLASS)) {
        targetLike.classList.remove(CLICK_PULSE_CLASS)
        // force reflow to allow re-apply animation quickly
        void targetLike.offsetWidth
      }

      targetLike.classList.add(CLICK_PULSE_CLASS)

      const existingTimer = rippleTimers.get(targetLike)
      if (existingTimer != null) {
        window.clearTimeout(existingTimer)
      }

      rippleTimers.set(
        targetLike,
        window.setTimeout(() => {
          targetLike.classList.remove(CLICK_PULSE_CLASS)
          rippleTimers.delete(targetLike)
        }, CLICK_PULSE_MS)
      )
    }

    document.addEventListener('click', onAnyClick, true)
    return () => document.removeEventListener('click', onAnyClick, true)
  }, [enabled])
}
