const TOSS_QUERY_FLAGS = [
  'inToss',
  'inTossApp',
  'isToss',
  'isInToss',
  'isInTossApp',
  'in_toss',
  'toss_inapp',
  'fromToss',
  'source',
] as const
const TOSS_BRIDGE_KEYS = [
  'appsInToss',
  'appsInTossWebFramework',
  'appsInTossBridge',
  'appsInTossWebView',
  'appsInTossWebview',
  'appsInTossUI',
  'Toss',
  'toss',
  '__toss__',
  '__toss__inApp',
  '__toss__web',
  '__toss_web__',
  '__appsInToss',
] as const
const TOSS_WINDOW_FLAGS = [
  '__appsInToss',
  '__toss__inApp',
  '__APP__IN__TOSS__',
  '__tossInApp',
] as const
const TOSS_TRUE_FLAGS = new Set(['1', 'true', 'yes', 'on', 'y'])
const TOSS_FALSE_FLAGS = new Set(['0', 'false', 'no', 'off', 'n'])
const TOSS_UA_MATCHER = /(toss|apps-in-toss|앱인토스|app-in-toss)/i
const TOSS_HOST_MATCHER =
  /(?:^|\.)app[ -.]?in[ -.]?toss(?:\.|$)|(?:^|\.)apps[ -.]?in[ -.]?toss(?:\.|$)|(?:^|\.)tossmini\.com(?:\.|$)|(?:^|\.)apps-intoss\.io(?:\.|$)|(?:^|\.)apps-in-toss\.com(?:\.|$)/i
const TOSS_PROTOCOL_MATCHER = /^(?:intoss|toss):/i
const TOSS_REFERRER_MATCHER = /(?:apps[-.]?in[-.]?toss|toss)\.im|apps-in-toss/i

let cached = null as boolean | null

type TossBridgeShareLike = {
  share?: (payload: unknown) => Promise<unknown> | unknown
  nativeShare?: (payload: unknown) => Promise<unknown> | unknown
  webShare?: (payload: unknown) => Promise<unknown> | unknown
  shareMessage?: (message: string) => Promise<unknown> | unknown
  shareText?: (text: string, type?: string) => Promise<unknown> | unknown
  canShare?: (payload: unknown) => Promise<unknown> | unknown
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

function getTossBridgeShareFunction(): ((payload: unknown) => Promise<unknown> | unknown) | null {
  if (typeof window === 'undefined') return null

  const win = window as unknown as Record<string, unknown>
  const candidates = TOSS_BRIDGE_KEYS.map((key) => win[key])

  for (const candidate of candidates) {
    const bridge = toRecord(candidate) as TossBridgeShareLike | null
    if (!bridge) continue
    if (typeof bridge.share === 'function') return bridge.share
    if (typeof bridge.nativeShare === 'function') return bridge.nativeShare
    if (typeof bridge.webShare === 'function') return bridge.webShare
    if (typeof bridge.shareMessage === 'function')
      return (payload) =>
        bridge.shareMessage!(String(toRecord(payload)?.message ?? (payload as string)))
  }

  const reactNativeWebView = toRecord(win.ReactNativeWebView) as {
    postMessage?: (payload: string) => void
  } | null

  const reactNativePostMessage = reactNativeWebView?.postMessage
  if (typeof reactNativePostMessage === 'function') {
    return (payload: unknown) => {
      reactNativePostMessage(
        JSON.stringify({
          type: 'share',
          data: toRecord(payload),
        })
      )
    }
  }

  const globalShare = ((window as unknown as Record<string, unknown>).share ?? null) as
    | ((payload: unknown) => Promise<unknown> | unknown)
    | null
  if (typeof globalShare === 'function') {
    return globalShare
  }
  const nativeShare = ((window as unknown as Record<string, unknown>).nativeShare ?? null) as
    | ((payload: unknown) => Promise<unknown> | unknown)
    | null
  if (typeof nativeShare === 'function') {
    return nativeShare
  }
  return null
}

function readBoolQueryFlag(value: string | null): boolean | null {
  if (!value) return null
  const normalized = value.toLowerCase().trim()
  if (TOSS_TRUE_FLAGS.has(normalized)) return true
  if (TOSS_FALSE_FLAGS.has(normalized)) return false
  return null
}

export function isTossInApp(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return false
  }

  if (cached !== null) return cached

  const win = window as unknown as Record<string, unknown>

  try {
    const query = new URLSearchParams(window.location.search)
    for (const key of TOSS_QUERY_FLAGS) {
      const parsed = readBoolQueryFlag(query.get(key))
      if (parsed !== null) {
        cached = parsed
        return parsed
      }
    }
  } catch {}
  if (window.location.search.includes('from=toss')) {
    cached = true
    return true
  }

  if (window.location.pathname.startsWith('/toss')) {
    cached = true
    return true
  }

  if (window.location.hostname.includes('apps-in-toss')) {
    cached = true
    return true
  }

  for (const key of TOSS_WINDOW_FLAGS) {
    if (win[key] === true) {
      cached = true
      return true
    }
    if (typeof win[key] === 'string' && readBoolQueryFlag(win[key] as string | null) === true) {
      cached = true
      return true
    }
  }

  if (
    (win.ReactNativeWebView && typeof win.ReactNativeWebView === 'object') ||
    win.ReactNativeWebView === true
  ) {
    cached = true
    return true
  }

  if (win.__toss__inApp === true || win.__appsInToss === true || win.__APP__IN__TOSS__ === true) {
    cached = true
    return true
  }

  if (TOSS_PROTOCOL_MATCHER.test(window.location.protocol || '')) {
    cached = true
    return true
  }

  if (TOSS_PROTOCOL_MATCHER.test(window.location.href || '')) {
    cached = true
    return true
  }

  if (TOSS_UA_MATCHER.test(navigator.userAgent || '')) {
    cached = true
    return true
  }

  if (TOSS_HOST_MATCHER.test(window.location.hostname || '')) {
    cached = true
    return true
  }

  if (document.referrer && TOSS_REFERRER_MATCHER.test(document.referrer)) {
    cached = true
    return true
  }

  cached = false
  return false
}

export async function shareInToss(
  message: string
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!isTossInApp()) return 'unsupported'

  const bridgeShare = getTossBridgeShareFunction()
  if (!bridgeShare) return 'unsupported'

  const sharedPayloads: unknown[] = [
    { message },
    { text: message },
    { content: message },
    { title: 'Rotifolk', text: message },
    message,
  ]

  for (const payload of sharedPayloads) {
    try {
      await bridgeShare(payload)
      return 'shared'
    } catch {
      // try next payload shape
    }
  }

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: message })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled'
      }
      // 폴백으로 클립보드 공유.
    }
  }

  return 'unsupported'
}
