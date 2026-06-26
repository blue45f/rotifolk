/**
 * 모임 공유 키트의 공용 로직.
 *
 * 새 의존성 없이 순수 Web 표준만 쓴다:
 *  - 초대 링크 조립 (globalThis.location.origin + /invite/:codeOrId)
 *  - 공유 문구 생성
 *  - navigator.share → 실패 시 clipboard.writeText 폴백
 */
import { isTossInApp, shareInToss } from '@/infrastructure/toss'

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'unsupported'

export interface ShareArgs {
  title: string
  url: string
  /** 시스템 공유 시트에 함께 보낼 본문. 생략 시 shareText(title) 사용. */
  text?: string
}

/**
 * 초대 코드(또는 파티 id)로 절대 초대 URL을 만든다.
 * InvitePage(`/invite/:code`)가 받는 경로와 맞춘다.
 */
export function buildInviteUrl(codeOrId: string): string {
  const origin =
    typeof window !== 'undefined' && globalThis.location?.origin
      ? globalThis.location.origin
      : 'https://rotifolk.app'
  const safe = encodeURIComponent(String(codeOrId).trim())
  return `${origin}/invite/${safe}`
}

/**
 * SNS/메신저에 붙일 한 줄 공유 문구.
 */
export function shareText(title: string): string {
  const clean = title.trim() || 'Rotifolk 모임'
  return `${clean} · Rotifolk에서 같이 한 잔 어때요?`
}

function toCopyText({ title, text, url }: { title: string; text: string; url: string }): string {
  return `${title} · ${text} · ${url}`
}

/**
 * 클립보드에 텍스트를 복사한다. 보안 컨텍스트가 아니면 execCommand 폴백을 시도한다.
 * 성공하면 true.
 */
export async function copyToClipboard(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // fall through to legacy path
    }
  }
  if (typeof document === 'undefined') return false
  const ta = document.createElement('textarea')
  ta.value = value
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  ta.style.pointerEvents = 'none'

  try {
    document.body.appendChild(ta)
    ta.select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    if (document.body.contains(ta)) document.body.removeChild(ta)
  }
}

/**
 * 시스템 공유 시트를 먼저 시도하고, 없으면 클립보드 복사로 폴백한다.
 *
 *  - 'shared'      navigator.share 성공
 *  - 'copied'      공유 미지원 → 링크 복사 성공
 *  - 'cancelled'   사용자가 공유 시트를 닫음 (AbortError)
 *  - 'unsupported' 공유도 복사도 실패
 */
export async function share({ title, url, text }: ShareArgs): Promise<ShareOutcome> {
  const body = text ?? shareText(title)
  const shareMessage = toCopyText({ title, text: body, url })
  if (isTossInApp()) {
    const tossOutcome = await shareInToss(shareMessage)
    if (tossOutcome === 'shared') return 'shared'
    if (tossOutcome === 'cancelled') return 'cancelled'
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const data: ShareData = { title, text: body, url }
    try {
      if (typeof navigator.canShare !== 'function' || navigator.canShare(data)) {
        await navigator.share(data)
        return 'shared'
      }
    } catch (err) {
      // 사용자가 시트를 닫으면 'cancelled'로 보고, 실제 실패한 경우에만 폴백한다.
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // 그 외 오류는 클립보드로 폴백
    }
  }
  const copied = await copyToClipboard(shareMessage)
  return copied ? 'copied' : 'unsupported'
}

/**
 * 공유 키트 전반에서 쓰는 헬퍼 묶음을 반환하는 훅.
 */
export function useShare() {
  return { buildInviteUrl, shareText, copyToClipboard, share }
}

export default useShare
