export const COMMUNITY_DEMO_ACTIVITY_CHANGED_EVENT = 'rotifolk:community-demo-activity-changed'
export const COMMUNITY_DEMO_ACTIVITY_KEY = 'rotifolk-community-demo-activity-log-v1'

const MAX_COMMUNITY_DEMO_ACTIVITY_ENTRIES = 60

export type CommunityDemoAction =
  | 'template-applied'
  | 'post-created'
  | 'comment-posted'
  | 'reply-posted'
  | 'report-submitted'
  | 'report-blocked'
  | 'post-opened'
  | 'search-submitted'
  | 'category-filter-changed'
  | 'area-filter-changed'
  | 'post-blocked'
  | 'comment-blocked'
  | 'reply-blocked'
  | 'edit-post-blocked'
  | 'delete-post-blocked'
  | 'edit-comment-blocked'
  | 'delete-comment-blocked'
  | 'edit-post'
  | 'delete-post'
  | 'edit-comment'
  | 'delete-comment'

export interface CommunityDemoActionMeta {
  postId?: string
  commentId?: string
  category?: string
  area?: string
  templateId?: string
  templateTitle?: string
  query?: string
  targetType?: 'post' | 'comment'
  reportKind?: 'inappropriate' | 'spam' | 'harassment' | 'other'
}

export interface CommunityDemoActivityLogEntry {
  id: string
  at: number
  action: CommunityDemoAction
  label: string
  meta?: CommunityDemoActionMeta
}

export type CommunityDemoMissionState = {
  templateUsed: boolean
  postCreated: boolean
  commentPosted: boolean
  reportSubmitted: boolean
}

const VALID_ACTIONS: Set<CommunityDemoAction> = new Set([
  'template-applied',
  'post-created',
  'comment-posted',
  'reply-posted',
  'report-submitted',
  'report-blocked',
  'post-opened',
  'search-submitted',
  'category-filter-changed',
  'area-filter-changed',
  'post-blocked',
  'comment-blocked',
  'reply-blocked',
  'edit-post-blocked',
  'delete-post-blocked',
  'edit-comment-blocked',
  'delete-comment-blocked',
  'edit-post',
  'delete-post',
  'edit-comment',
  'delete-comment',
])

export const isCommunityDemoActionBlocked = (action: CommunityDemoAction) =>
  action.endsWith('-blocked')

export const formatCommunityDemoEventTime = (value: number) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

const isWindow = () => typeof window !== 'undefined'

const readJSON = <T>(raw: string | null): T | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const isCommunityDemoAction = (value: unknown): value is CommunityDemoAction =>
  typeof value === 'string' && VALID_ACTIONS.has(value as CommunityDemoAction)

const isCommunityDemoActivityLogEntry = (
  value: unknown
): value is CommunityDemoActivityLogEntry => {
  if (!value || typeof value !== 'object') return false

  const entry = value as Partial<CommunityDemoActivityLogEntry>

  return (
    typeof entry.id === 'string' &&
    typeof entry.at === 'number' &&
    typeof entry.label === 'string' &&
    isCommunityDemoAction(entry.action)
  )
}

const writeEntries = (entries: CommunityDemoActivityLogEntry[]) => {
  if (!isWindow()) return
  try {
    localStorage.setItem(COMMUNITY_DEMO_ACTIVITY_KEY, JSON.stringify(entries))
  } catch {
    // storage may be blocked
  }
}

const makeCommunityDemoEventId = () => {
  const rand = Math.random().toString(36).slice(2, 8)
  return `community-demo-${Date.now()}-${rand}`
}

const dispatchActivityChanged = (entry: CommunityDemoActivityLogEntry) => {
  if (!isWindow()) return

  const event = new CustomEvent<CommunityDemoActivityLogEntry>(
    COMMUNITY_DEMO_ACTIVITY_CHANGED_EVENT,
    {
      detail: entry,
    }
  )

  window.dispatchEvent(event)
}

export const toCommunityDemoActivityEntry = (
  value: unknown
): CommunityDemoActivityLogEntry | null => {
  if (!isCommunityDemoActivityLogEntry(value)) return null

  return value
}

export const readCommunityDemoActivityLog = (): CommunityDemoActivityLogEntry[] => {
  if (!isWindow()) return []

  const parsed = readJSON<unknown>(localStorage.getItem(COMMUNITY_DEMO_ACTIVITY_KEY))
  if (!Array.isArray(parsed)) return []

  const entries = parsed.filter(isCommunityDemoActivityLogEntry)

  return entries.sort((a, b) => a.at - b.at).slice(-MAX_COMMUNITY_DEMO_ACTIVITY_ENTRIES)
}

export const logCommunityDemoActivity = (
  action: CommunityDemoAction,
  label: string,
  meta?: CommunityDemoActionMeta
): CommunityDemoActivityLogEntry => {
  const entry: CommunityDemoActivityLogEntry = {
    id: makeCommunityDemoEventId(),
    at: Date.now(),
    action,
    label,
    ...(meta ? { meta } : {}),
  }

  const nextEntries = [...readCommunityDemoActivityLog(), entry].slice(
    -MAX_COMMUNITY_DEMO_ACTIVITY_ENTRIES
  )

  writeEntries(nextEntries)
  dispatchActivityChanged(entry)

  return entry
}

export const clearCommunityDemoActivityLog = () => {
  if (!isWindow()) return
  try {
    localStorage.removeItem(COMMUNITY_DEMO_ACTIVITY_KEY)
  } catch {
    // storage may be blocked
  }
}

export const summarizeCommunityDemoMissionState = (
  entries: CommunityDemoActivityLogEntry[]
): CommunityDemoMissionState => {
  const actionSet = new Set(entries.map((entry) => entry.action))

  return {
    templateUsed: actionSet.has('template-applied'),
    postCreated: actionSet.has('post-created'),
    commentPosted: actionSet.has('comment-posted') || actionSet.has('reply-posted'),
    reportSubmitted: actionSet.has('report-submitted'),
  }
}

export const formatCommunityDemoEventLabel = (entry: CommunityDemoActivityLogEntry) => {
  if (entry.meta?.templateTitle) {
    return `${entry.label} (${entry.meta.templateTitle})`
  }

  if (entry.meta?.query) {
    return `${entry.label} (${entry.meta.query})`
  }

  if (entry.meta?.category) {
    return `${entry.label} (${entry.meta.category})`
  }

  return entry.label
}
