// 지인 회피 — 전화번호는 해시로만 대조 (원본 미저장). 해싱은 서버(crypto)에서, 여기선 정규화 + 순수 대조.

/** 한국 번호 정규화: 숫자만, +82 → 0 보정. */
export function normalizePhoneKR(phone: string): string {
  let d = (phone ?? '').replace(/\D/g, '')
  if (d.startsWith('82')) d = '0' + d.slice(2)
  return d
}

export type AvoidReason =
  | 'blocked' // 내가 차단함
  | 'avoid-list' // 내 회피 연락처에 있음
  | 'they-avoid-me' // 상대 회피 연락처에 내가 있음
  | 'same-company' // 같은 회사 (회피 옵션 on)

export const AVOID_REASON_LABEL: Record<AvoidReason, string> = {
  blocked: '내가 차단한 사람',
  'avoid-list': '회피 연락처에 등록됨',
  'they-avoid-me': '상대가 나를 피하고 싶어함',
  'same-company': '같은 회사',
}

export interface AvoidanceAttendee {
  userId: string
  phoneHash?: string | null
  /** 상대가 등록한 회피 해시들 (양방향 감지용) */
  avoidHashes?: string[]
  company?: string | null
}

export interface AvoidanceViewer {
  myPhoneHash?: string | null
  myAvoidHashes?: readonly string[]
  myBlockedUserIds?: readonly string[]
  myCompany?: string | null
  avoidSameCompany?: boolean
}

export interface AvoidOverlap {
  userId: string
  reasons: AvoidReason[]
}

/** 같은 모임 참가자들 중 회피 대상 감지 (해시 대조 기반, 양방향). */
export function detectAvoidOverlaps(
  viewer: AvoidanceViewer,
  attendees: readonly AvoidanceAttendee[],
): AvoidOverlap[] {
  const myAvoid = new Set(viewer.myAvoidHashes ?? [])
  const blocked = new Set(viewer.myBlockedUserIds ?? [])
  const out: AvoidOverlap[] = []

  for (const a of attendees) {
    const reasons: AvoidReason[] = []
    if (blocked.has(a.userId)) reasons.push('blocked')
    if (a.phoneHash && myAvoid.has(a.phoneHash)) reasons.push('avoid-list')
    if (viewer.myPhoneHash && (a.avoidHashes ?? []).includes(viewer.myPhoneHash)) {
      reasons.push('they-avoid-me')
    }
    if (
      viewer.avoidSameCompany &&
      viewer.myCompany &&
      a.company &&
      viewer.myCompany.trim().toLowerCase() === a.company.trim().toLowerCase()
    ) {
      reasons.push('same-company')
    }
    if (reasons.length > 0) out.push({ userId: a.userId, reasons })
  }
  return out
}
