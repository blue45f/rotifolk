import { UpdatePartySchema, type CreatePartyDto } from '@rotifolk/shared'

/** 호스트 파티 개설 폼 드래프트 — HostCreatePage 전용 localStorage 키. */
export const HOST_DRAFT_KEY = 'rotifolk-host-draft'

// 길이·범위 위반(too_small/too_big)과 refine(custom)은 제출 시 resolver가 다시 잡으므로
// 드래프트에서는 그대로 살리고, 타입이 깨진 최상위 키만 버린다(스키마 변경·저장 손상 대비).
const SALVAGEABLE_CODES = new Set(['too_small', 'too_big', 'not_multiple_of', 'custom'])

/** 저장된 드래프트를 읽어 구조가 온전한 값만 돌려준다. 없거나 전부 깨졌으면 null. */
export function loadHostDraft(): Partial<CreatePartyDto> | null {
  try {
    const raw = localStorage.getItem(HOST_DRAFT_KEY)
    if (!raw) return null
    const json: unknown = JSON.parse(raw)
    if (typeof json !== 'object' || json === null || Array.isArray(json)) return null
    const result = UpdatePartySchema.safeParse(json)
    if (result.success) return result.data
    const broken = new Set(
      result.error.issues
        .filter((issue) => !SALVAGEABLE_CODES.has(issue.code))
        .map((issue) => String(issue.path[0] ?? '')),
    )
    const survivors = Object.entries(json).filter(([key]) => !broken.has(key))
    return survivors.length > 0 ? (Object.fromEntries(survivors) as Partial<CreatePartyDto>) : null
  } catch {
    return null
  }
}

/** 입력 중인 폼 값을 드래프트로 저장. 프라이빗 모드·쿼터 초과는 조용히 무시. */
export function saveHostDraft(data: unknown) {
  try {
    localStorage.setItem(HOST_DRAFT_KEY, JSON.stringify(data))
  } catch {}
}

/** 제출 성공이나 '처음부터' 선택 시 드래프트 폐기. */
export function clearHostDraft() {
  try {
    localStorage.removeItem(HOST_DRAFT_KEY)
  } catch {}
}
