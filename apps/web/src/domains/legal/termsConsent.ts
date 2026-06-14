export const TERMS_VERSION = 'v2026-06-08'

export const TERMS_CONSENT_STORAGE_KEY = 'rotifolk-terms-consent-status-v1'
export const TERMS_HISTORY_KEY = 'rotifolk-terms-consent-history-v1'
export const TERMS_ACTION_LOG_KEY = 'rotifolk-terms-action-log-v1'
export const TERMS_CONSENT_CHANGED_EVENT = 'rotifolk:terms-consent-changed'

export const TERMS_ALL_SECTION_IDS = ['refund', 'cancel', 'noshow', 'privacy', 'safety'] as const
export const TERMS_REQUIRED_SECTION_IDS = ['refund', 'privacy', 'safety'] as const

const MAX_HISTORY_ENTRIES = 24
const MAX_ACTION_LOG_ENTRIES = 30

export type TermsSectionId = (typeof TERMS_ALL_SECTION_IDS)[number]

const TERMS_SECTION_CONTENTS: Record<TermsSectionId, string> = {
  refund:
    '환불은 모임 시작 시각 기준으로 자동 환불 규정이 적용된다. 전액 환불 마감은 모임별로 상이할 수 있으며 기본은 시작 24시간 전이다. 주최자 취소 또는 성비·인원 미달 자동 취소는 시점과 무관하게 전액 환불한다.',
  cancel:
    '참가 취소는 앱 내 신청 페이지에서 가능하다. 대기자 배치 정책은 플랫폼 정책에 따라 운영되며 동일 성별의 대기자가 우선 배정될 수 있다. 취소 즉시 좌석은 대기로 반환된다.',
  noshow:
    '연락 없이 불참하면 환불이 제한되고 반복 노쇼는 신뢰 점수에 영향을 줄 수 있다. 원활한 운영을 위해 사전 취소를 권장한다.',
  privacy:
    '개인정보는 동의 범위 내에서 최소한으로 수집·보관한다. 연락처 해시는 원본을 보관하지 않으며, 매칭된 상대와 동의한 채널만 단계적으로 공개한다.',
  safety:
    '불쾌하거나 위험한 상황을 신고할 수 있다. 신고 이력은 운영팀이 검토하고, 이용자의 신고 데이터는 허위 악용을 줄이기 위해 관리된다.',
}

function toNormalizedText(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim()
}

function hashString(value: string) {
  const normalized = toNormalizedText(value)
  let hash = 2166136261
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
    hash >>>= 0
  }
  return hash.toString(16).padStart(8, '0')
}

const buildSectionHashes = () => {
  const ordered = Object.fromEntries(
    TERMS_ALL_SECTION_IDS.map((id) => [id, hashString(TERMS_SECTION_CONTENTS[id])])
  ) as Record<TermsSectionId, string>

  return ordered
}

export type TermsConsentState = {
  version: string
  agreedIds: TermsSectionId[]
  updatedAt: number
}

export type TermsConsentEvidence = {
  contentVersion: string
  contentHash: string
  sectionHashes: Record<TermsSectionId, string>
}

export type TermsHistoryRecord = TermsConsentState & {
  requiredRate: number
  totalRate: number
  evidence?: TermsConsentEvidence
}

export type TermsActionLog = {
  id: string
  at: number
  action: string
  label: string
}

const isWindow = () => typeof window !== 'undefined'

const isTermsSectionId = (value: unknown): value is TermsSectionId =>
  typeof value === 'string' && (TERMS_ALL_SECTION_IDS as readonly string[]).includes(value)

export const toTermsConsentState = (value: unknown): TermsConsentState | null => {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<TermsConsentState>

  if (
    typeof candidate.version !== 'string' ||
    typeof candidate.updatedAt !== 'number' ||
    !Array.isArray(candidate.agreedIds)
  ) {
    return null
  }

  return {
    version: candidate.version,
    updatedAt: candidate.updatedAt,
    agreedIds: candidate.agreedIds.filter(
      (sectionId): sectionId is TermsSectionId =>
        typeof sectionId === 'string' &&
        (TERMS_ALL_SECTION_IDS as readonly string[]).includes(sectionId)
    ),
  }
}

const readJSON = <T>(raw: string | null): T | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const writeJSON = (key: string, value: unknown) => {
  if (!isWindow()) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage may be blocked in private mode or unavailable
  }
}

const dispatchConsentUpdated = (state: TermsConsentState) => {
  if (!isWindow()) return

  const event = new CustomEvent<TermsConsentState>(TERMS_CONSENT_CHANGED_EVENT, {
    detail: state,
  })

  window.dispatchEvent(event)
}

const normalizeSectionHashes = (value: unknown): Record<TermsSectionId, string> => {
  const result = buildSectionHashes()
  if (!value || typeof value !== 'object') return result

  const raw = value as Partial<Record<TermsSectionId, unknown>>
  TERMS_ALL_SECTION_IDS.forEach((sectionId) => {
    if (typeof raw[sectionId] === 'string') {
      result[sectionId] = raw[sectionId] as string
    }
  })

  return result
}

export const buildTermsEvidence = (agreedIds: readonly TermsSectionId[]): TermsConsentEvidence => {
  const sectionHashes = buildSectionHashes()
  const orderedSectionTokens = TERMS_ALL_SECTION_IDS.map((id) => `${id}:${sectionHashes[id]}`).join(
    '|'
  )
  const selectedSectionTokens = TERMS_ALL_SECTION_IDS.filter((id) => agreedIds.includes(id))
    .map((id) => `${id}:${sectionHashes[id]}`)
    .join('|')

  return {
    contentVersion: TERMS_VERSION,
    contentHash: hashString(`${orderedSectionTokens}|selected:${selectedSectionTokens}`),
    sectionHashes,
  }
}

export const TERMS_CURRENT_CONTENT_HASH = buildTermsEvidence(TERMS_ALL_SECTION_IDS).contentHash

export const readTermsConsentState = (): TermsConsentState => {
  if (!isWindow()) {
    return { version: TERMS_VERSION, agreedIds: [], updatedAt: 0 }
  }

  const parsed = readJSON<Partial<TermsConsentState>>(
    localStorage.getItem(TERMS_CONSENT_STORAGE_KEY)
  )
  const agreedIds = Array.isArray(parsed?.agreedIds)
    ? (parsed.agreedIds.filter(isTermsSectionId) as TermsSectionId[])
    : []

  return {
    version: typeof parsed?.version === 'string' ? parsed.version : TERMS_VERSION,
    agreedIds,
    updatedAt: typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : 0,
  }
}

const writeTermsState = (state: TermsConsentState) => {
  writeJSON(TERMS_CONSENT_STORAGE_KEY, state)
}

export const buildRates = (agreedIds: readonly TermsSectionId[]) => {
  const requiredRate = Math.round(
    (TERMS_REQUIRED_SECTION_IDS.filter((id) => agreedIds.includes(id)).length /
      TERMS_REQUIRED_SECTION_IDS.length) *
      100
  )
  const totalRate = Math.round((agreedIds.length / TERMS_ALL_SECTION_IDS.length) * 100)

  return { requiredRate, totalRate }
}

export const isTermsVersionOutdated = (value?: string) => value !== TERMS_VERSION

export const hasRequiredTerms = (agreedIds: readonly TermsSectionId[]) =>
  TERMS_REQUIRED_SECTION_IDS.every((id) => agreedIds.includes(id))

export const readTermsConsentHistory = (): TermsHistoryRecord[] => {
  if (!isWindow()) return []

  const parsed = readJSON<unknown>(localStorage.getItem(TERMS_HISTORY_KEY))
  if (!Array.isArray(parsed)) return []

  const getRates = (value: Partial<TermsHistoryRecord>) => {
    const nextAgreedIds = Array.isArray(value.agreedIds)
      ? value.agreedIds.filter(isTermsSectionId)
      : []
    const { requiredRate, totalRate } = buildRates(nextAgreedIds)

    return { requiredRate, totalRate }
  }

  const isValidRecord = (value: unknown): value is TermsHistoryRecord => {
    if (!value || typeof value !== 'object') return false
    const item = value as Partial<TermsHistoryRecord>
    return (
      typeof item.version === 'string' &&
      Array.isArray(item.agreedIds) &&
      typeof item.updatedAt === 'number'
    )
  }

  return parsed.filter(isValidRecord).map((record) => {
    const agreedIds = record.agreedIds.filter(isTermsSectionId)
    const { requiredRate, totalRate } = getRates(record)
    const evidenceContent = (() => {
      if (
        record.evidence &&
        typeof record.evidence === 'object' &&
        record.evidence !== null &&
        typeof (record.evidence as TermsConsentEvidence).contentHash === 'string'
      ) {
        return {
          sectionHashes: normalizeSectionHashes(
            (record.evidence as TermsConsentEvidence).sectionHashes
          ),
          contentHash: (record.evidence as TermsConsentEvidence).contentHash,
          contentVersion: (record.evidence as TermsConsentEvidence).contentVersion ?? TERMS_VERSION,
        }
      }

      return {
        sectionHashes: buildSectionHashes(),
        contentHash: buildTermsEvidence(agreedIds).contentHash,
        contentVersion: TERMS_VERSION,
      }
    })()

    return {
      ...record,
      agreedIds,
      requiredRate,
      totalRate,
      evidence: {
        contentVersion: evidenceContent.contentVersion,
        contentHash: evidenceContent.contentHash,
        sectionHashes: evidenceContent.sectionHashes,
      },
    } as TermsHistoryRecord
  })
}

export const readTermsActionLog = (): TermsActionLog[] => {
  if (!isWindow()) return []

  const parsed = readJSON<unknown>(localStorage.getItem(TERMS_ACTION_LOG_KEY))
  if (!Array.isArray(parsed)) return []

  const isValidAction = (value: unknown): value is TermsActionLog =>
    Boolean(
      value &&
      typeof value === 'object' &&
      typeof (value as TermsActionLog).id === 'string' &&
      typeof (value as TermsActionLog).at === 'number' &&
      typeof (value as TermsActionLog).action === 'string' &&
      typeof (value as TermsActionLog).label === 'string'
    )

  return parsed.filter(isValidAction)
}

export const makeTermsActionId = () =>
  `term-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const saveTermsAgreement = (agreedIds: TermsSectionId[]) => {
  const nextAgreedIds = Array.from(new Set(agreedIds.filter(isTermsSectionId)))
  const timestamp = Date.now()
  const nextState: TermsConsentState = {
    version: TERMS_VERSION,
    agreedIds: nextAgreedIds,
    updatedAt: timestamp,
  }
  const { requiredRate, totalRate } = buildRates(nextAgreedIds)
  const nextHistory = readTermsConsentHistory()
  const nextEvidence = buildTermsEvidence(nextAgreedIds)

  writeTermsState(nextState)
  writeJSON(
    TERMS_HISTORY_KEY,
    [...nextHistory, { ...nextState, requiredRate, totalRate, evidence: nextEvidence }].slice(
      -MAX_HISTORY_ENTRIES
    )
  )
  dispatchConsentUpdated(nextState)

  return nextState
}

export const saveTermsAction = (action: string, label: string) => {
  const nextLog = readTermsActionLog()
  writeJSON(
    TERMS_ACTION_LOG_KEY,
    [...nextLog, { id: makeTermsActionId(), at: Date.now(), action, label }].slice(
      -MAX_ACTION_LOG_ENTRIES
    )
  )
}
