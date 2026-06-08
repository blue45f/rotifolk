export type TutorialStepId =
  | 'help'
  | 'community'
  | 'community-template'
  | 'community-comment'
  | 'community-report'
  | 'policies'
  | 'policies-sync'
  | 'demo'

export const TUTORIAL_PROGRESS_KEY = 'rotifolk-tutorial-progress-v1'

const VALID_STEPS = new Set<TutorialStepId>([
  'help',
  'community',
  'community-template',
  'community-comment',
  'community-report',
  'policies',
  'policies-sync',
  'demo',
])

function parseStoredProgress(raw: string | null): TutorialStepId[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is TutorialStepId => VALID_STEPS.has(item))
  } catch {
    return []
  }
}

function writeProgress(raw: TutorialStepId[]) {
  if (typeof window === 'undefined') return
  const next = Array.from(new Set(raw))
  try {
    localStorage.setItem(TUTORIAL_PROGRESS_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable or blocked
  }
}

export const readTutorialProgress = () => {
  if (typeof window === 'undefined') return [] as TutorialStepId[]
  return parseStoredProgress(localStorage.getItem(TUTORIAL_PROGRESS_KEY))
}

export const addTutorialStep = (step: TutorialStepId) => {
  if (!VALID_STEPS.has(step)) return
  const next = new Set(readTutorialProgress())
  next.add(step)
  setTutorialProgress(Array.from(next))
}

export const setTutorialProgress = (next: TutorialStepId[]) => {
  writeProgress(next.filter((item): item is TutorialStepId => VALID_STEPS.has(item)))
}

export const normalizeTutorialStep = (raw: string | null): TutorialStepId | null => {
  if (!raw) return null
  return VALID_STEPS.has(raw as TutorialStepId) ? (raw as TutorialStepId) : null
}
