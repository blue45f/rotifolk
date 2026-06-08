import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  COMMUNITY_POST_CATEGORY_LABEL,
  type CommunityComment,
  type CommunityPostDetail,
  type CommunityPostCategory,
  type CreateReportDto,
} from '@rotifolk/shared'
import { Button } from '@components/ui/Button/Button'
import { Badge } from '@components/ui/Badge/Badge'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { useCurrentUser } from '@store/authStore'
import {
  useCommunityPost,
  useCommunityPosts,
  useCreateCommunityComment,
  useCreateCommunityPost,
  useDeleteCommunityComment,
  useDeleteCommunityPost,
  useReportCommunityContent,
  useUpdateCommunityComment,
  useUpdateCommunityPost,
} from '@features/community/queries'
import {
  hasRequiredTerms,
  readTermsConsentState,
  TERMS_REQUIRED_SECTION_IDS,
  TERMS_CONSENT_CHANGED_EVENT,
  TERMS_CONSENT_STORAGE_KEY,
  toTermsConsentState,
  type TermsConsentState,
} from '@features/legal/termsConsent'
import {
  COMMUNITY_DEMO_ACTIVITY_CHANGED_EVENT,
  COMMUNITY_DEMO_ACTIVITY_KEY,
  formatCommunityDemoEventTime,
  isCommunityDemoActionBlocked,
  formatCommunityDemoEventLabel,
  logCommunityDemoActivity,
  readCommunityDemoActivityLog,
  summarizeCommunityDemoMissionState,
  toCommunityDemoActivityEntry,
  type CommunityDemoAction,
  type CommunityDemoActionMeta,
  type CommunityDemoActivityLogEntry,
} from '@features/community/demoTracker'
import { addTutorialStep, normalizeTutorialStep } from '@features/tutorial/progress'
import styles from './Community.module.css'

type ReportTargetType = 'post' | 'comment'

const CATEGORIES: Array<{ value: 'all' | CommunityPostCategory; label: string; hint: string }> = [
  { value: 'all', label: '전체', hint: '새 글과 활발한 답변' },
  { value: 'question', label: '질문', hint: '처음 참여 전 궁금한 점' },
  { value: 'after-party', label: '후기', hint: '모임 뒤 남기는 기록' },
  { value: 'venue-tip', label: '공간 팁', hint: '동네와 장소 추천' },
  { value: 'match-review', label: '매칭', hint: '연결 방식 경험담' },
]

const AREAS = ['한남동', '연남동', '북촌', '성수', '강남']

const REPORT_REASONS: Array<{ kind: CreateReportDto['kind']; label: string }> = [
  { kind: 'inappropriate', label: '부적절한 내용' },
  { kind: 'spam', label: '홍보·스팸' },
  { kind: 'harassment', label: '불쾌한 표현' },
  { kind: 'other', label: '기타' },
]

const COMMUNITY_DRAFT_STORAGE_KEY = 'rotifolk-community-composer-draft-v1'
const COMMUNITY_MISSION_STATE_KEY = 'rotifolk-community-mission-state-v1'
const COMMUNITY_REPORT_GUARD_KEY = 'rotifolk-community-report-guard-v1'
const COMMUNITY_DEMO_ACTIVITY_LIMIT = 60

type CommunityMissionState = {
  templateUsed: boolean
  postCreated: boolean
  commentPosted: boolean
  reportSubmitted: boolean
}

type CommunityReportGuard = {
  kind: CreateReportDto['kind']
  targetType: 'post' | 'comment'
  targetId: string
  at: number
}

const isCommunityPostCategory = (value: unknown): value is CommunityPostCategory =>
  typeof value === 'string' &&
  Object.prototype.hasOwnProperty.call(COMMUNITY_POST_CATEGORY_LABEL, value)

const readJSON = <T,>(raw: string | null): T | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const readDraftState = () => {
  if (typeof window === 'undefined') {
    return { title: '', body: '', tagText: '', area: '', category: 'all' as const }
  }

  const parsed = readJSON<{
    title?: string
    body?: string
    tagText?: string
    area?: string
    category?: 'all' | CommunityPostCategory
  }>(localStorage.getItem(COMMUNITY_DRAFT_STORAGE_KEY))

  const category = parsed?.category

  return {
    title: typeof parsed?.title === 'string' ? parsed.title : '',
    body: typeof parsed?.body === 'string' ? parsed.body : '',
    tagText: typeof parsed?.tagText === 'string' ? parsed.tagText : '',
    area: typeof parsed?.area === 'string' ? parsed.area : '',
    category: category === 'all' || isCommunityPostCategory(category) ? category : 'all',
  }
}

const formatTime = (value: number) => formatCommunityDemoEventTime(value)

const mergeCommunityDemoActivity = (
  prev: CommunityDemoActivityLogEntry[],
  next: CommunityDemoActivityLogEntry,
): CommunityDemoActivityLogEntry[] => {
  const filtered = prev.filter((entry) => entry.id !== next.id)
  return [...filtered, next].sort((a, b) => a.at - b.at).slice(-COMMUNITY_DEMO_ACTIVITY_LIMIT)
}

const saveDraftState = (state: {
  title: string
  body: string
  tagText: string
  area: string
  category: 'all' | CommunityPostCategory
}) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(COMMUNITY_DRAFT_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage may be blocked
  }
}

const clearDraftState = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(COMMUNITY_DRAFT_STORAGE_KEY)
  } catch {
    // storage may be blocked
  }
}

const readMissionState = (): CommunityMissionState => {
  if (typeof window === 'undefined') {
    return { templateUsed: false, postCreated: false, commentPosted: false, reportSubmitted: false }
  }

  return clampMissionState(
    readJSON<CommunityMissionState>(localStorage.getItem(COMMUNITY_MISSION_STATE_KEY)),
  )
}

const saveMissionState = (state: CommunityMissionState) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(COMMUNITY_MISSION_STATE_KEY, JSON.stringify(state))
  } catch {
    // storage may be blocked
  }
}

const readReportGuards = (): CommunityReportGuard[] => {
  if (typeof window === 'undefined') return []
  const parsed = readJSON<CommunityReportGuard[]>(localStorage.getItem(COMMUNITY_REPORT_GUARD_KEY))
  if (!Array.isArray(parsed)) return []
  const now = Date.now()

  return parsed.filter((item): item is CommunityReportGuard =>
    Boolean(
      item &&
      typeof item.kind === 'string' &&
      typeof item.targetType === 'string' &&
      typeof item.targetId === 'string' &&
      typeof item.at === 'number' &&
      now - item.at < ONE_WEEK_MS,
    ),
  )
}

const writeReportGuards = (list: CommunityReportGuard[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(COMMUNITY_REPORT_GUARD_KEY, JSON.stringify(list.slice(-40)))
  } catch {
    // storage may be blocked
  }
}

const COMMUNITY_CATEGORIES = ['question', 'after-party', 'venue-tip', 'match-review'] as const
const TERMS_LABEL_BY_ID: Record<(typeof TERMS_REQUIRED_SECTION_IDS)[number], string> = {
  refund: '환불 정책',
  privacy: '개인정보 · 민감정보',
  safety: '안전 · 지인 회피',
}

const GUIDE_TEMPLATES: Array<{
  id: 'first-question' | 'quiet-icebreaker' | 'low-cost-place'
  title: string
  body: string
  category: CommunityPostCategory
  area: string
  tags: string[]
  hint: string
}> = [
  {
    id: 'first-question',
    title: '첫 모임 전에 뭘 준비하면 좋을까요?',
    body: '첫 방문이라면 40분 이전 이동, 신분증·연락처 교환 방식, 결제 전 환불 기준 같은 기준부터 먼저 맞추면 좋아요.',
    category: 'question',
    area: '성수',
    tags: ['첫모임', '준비물'],
    hint: '질문 카테고리로 바로 시작',
  },
  {
    id: 'quiet-icebreaker',
    title: '공간이 너무 조용한데 분위기를 띄우는 팁이 있을까요?',
    body: '처음엔 아이스브레이커 2개만 던져도 대화가 훨씬 열려요. 진행자에게는 분위기 전환 포인트를 먼저 제안해 보세요.',
    category: 'after-party',
    area: '한남동',
    tags: ['분위기', '운영팁'],
    hint: '운영/후기 카테고리로 정리',
  },
  {
    id: 'low-cost-place',
    title: '동네 기준으로 가성비 좋은 장소가 궁금해요',
    body: '혼잡하지 않은 동네 기준으로 선호 동선을 적으면 더 정확한 추천이 달라져요. 이동 거리도 함께 적어 주세요.',
    category: 'venue-tip',
    area: '연남동',
    tags: ['공간', '동네'],
    hint: '공간 팁 카테고리로 제안',
  },
]

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

const clampMissionState = (value: unknown): CommunityMissionState => {
  return {
    templateUsed: Boolean(
      value && typeof value === 'object' && (value as CommunityMissionState).templateUsed,
    ),
    postCreated: Boolean(
      value && typeof value === 'object' && (value as CommunityMissionState).postCreated,
    ),
    commentPosted: Boolean(
      value && typeof value === 'object' && (value as CommunityMissionState).commentPosted,
    ),
    reportSubmitted: Boolean(
      value && typeof value === 'object' && (value as CommunityMissionState).reportSubmitted,
    ),
  }
}

function queryCategoryToState(value: string | null): 'all' | CommunityPostCategory {
  if (!value) return 'all'
  if ((COMMUNITY_CATEGORIES as readonly string[]).includes(value)) {
    return value as CommunityPostCategory
  }
  return 'all'
}

function formatDate(value: string | null | undefined) {
  if (!value) return '방금 전'
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function initials(name: string) {
  return name.slice(0, 2)
}

export default function CommunityPage() {
  const me = useCurrentUser()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isGuideMode = searchParams.get('guide') === '1'
  const showGuideFlow = isGuideMode
  const tutorialStep = normalizeTutorialStep(searchParams.get('fromTutorial'))
  const isTutorialMode =
    tutorialStep === 'community' ||
    tutorialStep === 'community-template' ||
    tutorialStep === 'community-comment' ||
    tutorialStep === 'community-report'
  const showDemoFlow = isTutorialMode
  const returnPath = `${location.pathname}${location.search}${location.hash}`
  const demoLoginHref = isTutorialMode
    ? `/login?demo=1&auto=1&fromTutorial=demo&from=${encodeURIComponent(returnPath)}`
    : `/login?demo=1&auto=1&from=${encodeURIComponent(returnPath)}`
  const encodedReturnPath = encodeURIComponent(returnPath || '/')
  const tutorialReturnHref = `/tutorial?focus=community&from=${encodedReturnPath}`
  const requiredPoliciesHref = isTutorialMode
    ? `/policies?filter=required&fromTutorial=policies&from=${encodedReturnPath}`
    : `/policies?filter=required&from=${encodedReturnPath}`
  const loginHref = isTutorialMode
    ? `/login?fromTutorial=community&from=${encodedReturnPath}`
    : `/login?from=${encodedReturnPath}`
  const policyGateHref = isTutorialMode
    ? `/policies?filter=required&fromTutorial=community&from=${encodedReturnPath}`
    : `/policies?filter=required&from=${encodedReturnPath}`
  const [termsConsentState, setTermsConsentState] = useState<TermsConsentState>(() =>
    readTermsConsentState(),
  )
  const isTermsReady = hasRequiredTerms(termsConsentState.agreedIds)
  const missingRequiredTerms = TERMS_REQUIRED_SECTION_IDS.filter(
    (sectionId) => !termsConsentState.agreedIds.includes(sectionId),
  )
  const missingRequiredTermNames = missingRequiredTerms.map(
    (sectionId) => TERMS_LABEL_BY_ID[sectionId],
  )
  const termsMissionDone = isTermsReady
  const missionTotalCount = 5
  const requestedTemplate = searchParams.get('template')

  const withReturnPath = (href: string) => {
    if (href.includes('from=')) {
      return isTutorialMode && !href.includes('fromTutorial=')
        ? `${href}&fromTutorial=community`
        : href
    }

    return `${href}${href.includes('?') ? '&' : '?'}from=${encodedReturnPath}${isTutorialMode ? '&fromTutorial=community' : ''}`
  }
  const initialDraft = useMemo(() => readDraftState(), [])
  const [category, setCategory] = useState<'all' | CommunityPostCategory>(
    () => queryCategoryToState(searchParams.get('category')) || initialDraft.category,
  )
  const [area, setArea] = useState<string>(() => searchParams.get('area') ?? initialDraft.area)
  const [searchText, setSearchText] = useState<string>(() => searchParams.get('q') ?? '')
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [title, setTitle] = useState(() => initialDraft.title)
  const [body, setBody] = useState(() => initialDraft.body)
  const [tagText, setTagText] = useState(() => initialDraft.tagText)
  const [missionState, setMissionState] = useState<CommunityMissionState>(() => readMissionState())
  const [demoActivityLog, setDemoActivityLog] = useState<CommunityDemoActivityLogEntry[]>(() =>
    readCommunityDemoActivityLog(),
  )
  const [guideTemplateMeta, setGuideTemplateMeta] = useState<CommunityDemoActionMeta | null>(null)
  const [reportGuards, setReportGuards] = useState<CommunityReportGuard[]>(() => readReportGuards())
  const seenPostOpenRef = useRef<string | null>(null)
  const isReportGuarded = useCallback(
    (targetType: ReportTargetType, targetId: string, kind: CreateReportDto['kind']) =>
      reportGuards.some(
        (item) =>
          item.targetType === targetType &&
          item.targetId === targetId &&
          item.kind === kind &&
          Date.now() - item.at < ONE_WEEK_MS,
      ),
    [reportGuards],
  )

  const updateMissionState = useCallback((next: Partial<CommunityMissionState>) => {
    setMissionState((prev) => {
      const merged = { ...prev, ...next }
      saveMissionState(merged)
      return merged
    })
  }, [])
  const toast = useToast()

  const logDemoAction = useCallback(
    (action: CommunityDemoAction, label: string, meta?: CommunityDemoActionMeta) => {
      const next = logCommunityDemoActivity(action, label, meta)
      setDemoActivityLog((prev) => mergeCommunityDemoActivity(prev, next))
    },
    [],
  )
  const logBlockedDemoAction = useCallback(
    (action: CommunityDemoAction, label: string, meta?: CommunityDemoActionMeta) => {
      logDemoAction(action, `${label} (약관 미동의로 차단)`, meta)
    },
    [logDemoAction],
  )

  const missionFromActivity = useMemo(
    () => summarizeCommunityDemoMissionState(demoActivityLog),
    [demoActivityLog],
  )
  const effectiveMissionState = useMemo(
    () => ({
      templateUsed: missionState.templateUsed || missionFromActivity.templateUsed,
      postCreated: missionState.postCreated || missionFromActivity.postCreated,
      commentPosted: missionState.commentPosted || missionFromActivity.commentPosted,
      reportSubmitted: missionState.reportSubmitted || missionFromActivity.reportSubmitted,
    }),
    [missionState, missionFromActivity],
  )
  const recentDemoActivities = useMemo(
    () => [...demoActivityLog].reverse().slice(0, 6),
    [demoActivityLog],
  )
  const recentBlockedDemoActivities = useMemo(
    () => recentDemoActivities.filter((entry) => isCommunityDemoActionBlocked(entry.action)),
    [recentDemoActivities],
  )

  const markTemplateUsed = useCallback(
    (meta?: CommunityDemoActionMeta) => {
      updateMissionState({ templateUsed: true })
      logDemoAction('template-applied', '템플릿 적용 완료', meta ?? guideTemplateMeta ?? undefined)
      if (isTutorialMode) {
        addTutorialStep('community-template')
      }
    },
    [guideTemplateMeta, isTutorialMode, logDemoAction, updateMissionState],
  )

  const markPostCreated = useCallback(() => {
    updateMissionState({ postCreated: true })
    logDemoAction('post-created', '게시글 등록', {
      category: category,
      area: area,
      ...(guideTemplateMeta?.templateId ? { templateId: guideTemplateMeta.templateId } : {}),
      ...(guideTemplateMeta?.templateTitle
        ? { templateTitle: guideTemplateMeta.templateTitle }
        : {}),
    })
    if (isTutorialMode) {
      addTutorialStep('community')
    }
    setGuideTemplateMeta(null)
  }, [area, category, guideTemplateMeta, isTutorialMode, logDemoAction, updateMissionState])

  const markCommentPosted = useCallback(() => {
    updateMissionState({ commentPosted: true })
    logDemoAction('comment-posted', '댓글 작성 완료')
    if (isTutorialMode) {
      addTutorialStep('community-comment')
    }
  }, [isTutorialMode, logDemoAction, updateMissionState])

  const markReplyPosted = useCallback(() => {
    updateMissionState({ commentPosted: true })
    logDemoAction('reply-posted', '답글 작성 완료')
    if (isTutorialMode) {
      addTutorialStep('community-comment')
    }
  }, [isTutorialMode, logDemoAction, updateMissionState])

  const markReportSubmitted = useCallback(
    (targetType: ReportTargetType, targetId: string, kind: CreateReportDto['kind']) => {
      const now = Date.now()
      updateMissionState({ reportSubmitted: true })
      logDemoAction('report-submitted', '신고 접수', {
        targetType,
        reportKind: kind,
        ...(targetType === 'post' ? { postId: targetId } : { commentId: targetId }),
      })
      if (isTutorialMode) {
        addTutorialStep('community-report')
      }

      setReportGuards((prev) => {
        const next = [
          ...prev.filter(
            (item) =>
              !(
                item.targetType === targetType &&
                item.targetId === targetId &&
                item.kind === kind &&
                now - item.at < ONE_WEEK_MS
              ),
          ),
          {
            kind,
            targetType,
            targetId,
            at: now,
          },
        ].slice(-40)
        writeReportGuards(next)
        return next
      })
    },
    [isTutorialMode, logDemoAction, updateMissionState],
  )

  const markPostEdited = useCallback(() => {
    logDemoAction('edit-post', '게시글 수정')
  }, [logDemoAction])

  const markPostDeleted = useCallback(() => {
    logDemoAction('delete-post', '게시글 삭제')
  }, [logDemoAction])

  const markCommentEdited = useCallback(
    (commentId: string) => {
      logDemoAction('edit-comment', '댓글/답글 수정', { commentId })
    },
    [logDemoAction],
  )

  const markCommentDeleted = useCallback(
    (commentId: string) => {
      logDemoAction('delete-comment', '댓글/답글 삭제', { commentId })
    },
    [logDemoAction],
  )

  const canShowMissionPanel = showGuideFlow || showDemoFlow
  const missionDoneCount = useMemo(
    () =>
      Object.values(effectiveMissionState).reduce((acc, item) => acc + (item ? 1 : 0), 0) +
      (termsMissionDone ? 1 : 0),
    [effectiveMissionState, termsMissionDone],
  )
  const query = useMemo(
    () => ({
      category: category === 'all' ? undefined : category,
      area: area || undefined,
      q: searchText || undefined,
      pageSize: 16,
    }),
    [area, category, searchText],
  )
  const posts = useCommunityPosts(query)
  const detail = useCommunityPost(activePostId)
  const createPost = useCreateCommunityPost()

  const syncCategoryFilter = (nextCategory: 'all' | CommunityPostCategory) => {
    if (nextCategory === category) {
      return
    }
    const nextParams = new URLSearchParams(searchParams)
    if (nextCategory === 'all') {
      nextParams.delete('category')
    } else {
      nextParams.set('category', nextCategory)
    }
    setSearchParams(nextParams, { replace: true })
    setCategory(nextCategory)
    setActivePostId(null)
    logDemoAction('category-filter-changed', '카테고리 필터 변경', {
      category: nextCategory,
    })
  }

  const syncAreaFilter = (nextArea: string) => {
    if (nextArea === area) {
      return
    }
    const nextParams = new URLSearchParams(searchParams)
    if (!nextArea) {
      nextParams.delete('area')
    } else {
      nextParams.set('area', nextArea)
    }
    setSearchParams(nextParams, { replace: true })
    setArea(nextArea)
    setActivePostId(null)
    logDemoAction('area-filter-changed', '지역 필터 변경', {
      area: nextArea || undefined,
    })
  }

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextParams = new URLSearchParams(searchParams)
    const nextText = searchText.trim()
    if (nextText) {
      nextParams.set('q', nextText)
    } else {
      nextParams.delete('q')
    }
    setActivePostId(null)
    setSearchParams(nextParams, { replace: true })
    logDemoAction('search-submitted', '검색 실행', {
      query: nextText,
    })
  }

  const clearSearch = () => {
    setSearchText('')
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('q')
    setActivePostId(null)
    setSearchParams(nextParams, { replace: true })
    logDemoAction('search-submitted', '검색 초기화')
  }

  const applyGuideTemplate = useCallback(
    (template: (typeof GUIDE_TEMPLATES)[number]) => {
      const templateMeta: CommunityDemoActionMeta = {
        templateId: template.id,
        templateTitle: template.title,
        category: template.category,
        area: template.area,
      }

      syncCategoryFilter(template.category)
      syncAreaFilter(template.area)
      setTitle(template.title)
      setBody(template.body)
      setTagText(template.tags.join(', '))
      setGuideTemplateMeta(templateMeta)
      markTemplateUsed(templateMeta)
    },
    [markTemplateUsed, syncAreaFilter, syncCategoryFilter],
  )

  useEffect(() => {
    saveDraftState({
      title,
      body,
      tagText,
      area,
      category,
    })
  }, [title, body, tagText, area, category])

  useEffect(() => {
    if (!isGuideMode || !requestedTemplate) return

    const template = GUIDE_TEMPLATES.find((entry) => entry.id === requestedTemplate)
    if (!template) return

    applyGuideTemplate(template)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('template')
    setSearchParams(nextParams, { replace: true })
  }, [applyGuideTemplate, isGuideMode, requestedTemplate, searchParams, setSearchParams])

  useEffect(() => {
    const refreshTerms = (next?: TermsConsentState) => {
      setTermsConsentState(next ?? readTermsConsentState())
    }

    const onStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key === TERMS_CONSENT_STORAGE_KEY) {
        refreshTerms()
      }
    }

    const onTermsConsentChange = (event: Event) => {
      const detailState = toTermsConsentState((event as CustomEvent<TermsConsentState>).detail)
      refreshTerms(detailState ?? undefined)
    }

    window.addEventListener('storage', onStorageChange)
    window.addEventListener(TERMS_CONSENT_CHANGED_EVENT, onTermsConsentChange)

    return () => {
      window.removeEventListener('storage', onStorageChange)
      window.removeEventListener(TERMS_CONSENT_CHANGED_EVENT, onTermsConsentChange)
    }
  }, [])

  useEffect(() => {
    const syncDemoActivity = () => {
      setDemoActivityLog(readCommunityDemoActivityLog())
    }

    const onStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key === COMMUNITY_DEMO_ACTIVITY_KEY) {
        syncDemoActivity()
      }
    }

    const onDemoActivityChanged = (event: Event) => {
      const next = toCommunityDemoActivityEntry((event as CustomEvent<unknown>).detail)
      if (!next) {
        syncDemoActivity()
        return
      }
      setDemoActivityLog((prev) => mergeCommunityDemoActivity(prev, next))
    }

    window.addEventListener('storage', onStorageChange)
    window.addEventListener(COMMUNITY_DEMO_ACTIVITY_CHANGED_EVENT, onDemoActivityChanged)

    return () => {
      window.removeEventListener('storage', onStorageChange)
      window.removeEventListener(COMMUNITY_DEMO_ACTIVITY_CHANGED_EVENT, onDemoActivityChanged)
    }
  }, [])

  useEffect(() => {
    const nextCategory = queryCategoryToState(searchParams.get('category'))
    const nextArea = searchParams.get('area') ?? ''
    const nextSearchText = searchParams.get('q') ?? ''

    if (nextCategory !== category) {
      setCategory(nextCategory)
    }
    if (nextArea !== area) {
      setArea(nextArea)
    }
    if (nextSearchText !== searchText) {
      setSearchText(nextSearchText)
    }

    if (!activePostId && posts.data?.items[0]) setActivePostId(posts.data.items[0].id)
  }, [activePostId, posts.data?.items, searchParams, category, area, searchText])

  useEffect(() => {
    if (!activePostId) {
      seenPostOpenRef.current = null
      return
    }

    if (seenPostOpenRef.current === activePostId) {
      return
    }

    logDemoAction('post-opened', '게시글 상세 열람', {
      postId: activePostId,
      ...(detail.data?.id === activePostId
        ? {
            category: detail.data.category,
            area: detail.data.area ?? undefined,
          }
        : {}),
    })
    seenPostOpenRef.current = activePostId
  }, [activePostId, detail.data?.area, detail.data?.category, detail.data?.id, logDemoAction])

  useEffect(() => {
    if (!tutorialStep) return
    addTutorialStep(tutorialStep)
    if (tutorialStep !== 'community') {
      addTutorialStep('community')
    }
  }, [tutorialStep])

  const submitPost = async (event: FormEvent) => {
    event.preventDefault()
    if (!isTermsReady) {
      toast.show('필수 조항 동의 후 글 작성이 가능합니다.', 'error')
      logBlockedDemoAction('post-blocked', '게시글 등록 시도 차단', {
        category: category,
        area: area,
        ...(guideTemplateMeta?.templateId ? { templateId: guideTemplateMeta.templateId } : {}),
        ...(guideTemplateMeta?.templateTitle
          ? { templateTitle: guideTemplateMeta.templateTitle }
          : {}),
      })
      return
    }
    const tags = tagText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    const created = await createPost.mutateAsync({
      title,
      body,
      category: category === 'all' ? 'question' : category,
      area: area || null,
      tags,
    })
    setTitle('')
    setBody('')
    setTagText('')
    setActivePostId(created.id)
    clearDraftState()
    markPostCreated()
  }

  return (
    <div className={styles.page}>
      <section className={`container ${styles.hero}`}>
        <div className={styles.heroCopy}>
          <Badge tone="info" size="md">
            로컬 커뮤니티
          </Badge>
          <h1>모임 전후의 궁금한 점을 바로 묻고 이어가세요</h1>
          <p>
            준비물, 분위기, 연락처 교환 방식까지. 처음 온 사람도 망설이지 않도록 질문과 답변을
            한곳에 모았습니다.
          </p>
        </div>
        <div className={styles.heroPanel} aria-label="커뮤니티 이용 흐름">
          <span>질문 작성</span>
          <strong>답변과 대댓글로 맥락 유지</strong>
          <small>무한 중첩 없이 한 단계 답장만 지원해 읽기 흐름을 지켜요.</small>
        </div>
      </section>

      <main className={`container ${styles.shell}`}>
        <section className={styles.mainColumn}>
          {!isTermsReady && me ? (
            <section className={styles.policyGatePanel} role="note" aria-live="polite">
              <h3>🔒 커뮤니티 기능은 필수 조항 동의가 필요해요.</h3>
              <p>현재 미동의 항목: {missingRequiredTermNames.join(', ') || '없음'}</p>
              <div className={styles.policyGatePanelActions}>
                <Link to={policyGateHref}>필수 약관 동의로 진행</Link>
                <Link to={requiredPoliciesHref}>필수 조항만 확인</Link>
              </div>
            </section>
          ) : null}
          {isGuideMode && (
            <section className={styles.guidePanel} aria-label="커뮤니티 시작 가이드">
              <h3>💬 커뮤니티 첫 질문 가이드</h3>
              <p>처음 쓰는 글을 빠르게 완성할 수 있도록 템플릿을 제공합니다.</p>
              <div className={styles.guideTemplateGrid}>
                {GUIDE_TEMPLATES.map((template) => (
                  <button
                    key={template.title}
                    type="button"
                    className={styles.guideTemplateButton}
                    onClick={() => applyGuideTemplate(template)}
                  >
                    <strong>{template.title}</strong>
                    <p>{template.body}</p>
                    <small>{template.hint}</small>
                  </button>
                ))}
              </div>
              <div className={styles.guideLinks}>
                <Link
                  to={withReturnPath(
                    '/community?guide=1&category=question&template=first-question',
                  )}
                >
                  질문 모아보기
                </Link>
                <Link
                  to={withReturnPath(
                    '/community?guide=1&category=after-party&template=quiet-icebreaker',
                  )}
                >
                  후기 모아보기
                </Link>
                <Link
                  to={withReturnPath(
                    '/community?guide=1&category=venue-tip&template=low-cost-place',
                  )}
                >
                  공간 팁 모아보기
                </Link>
                <Link to={tutorialReturnHref}>커뮤니티 데모 튜토리얼 보기</Link>
                <Link to={requiredPoliciesHref}>필수 동의 항목 확인</Link>
                <Link to={demoLoginHref}>데모 계정으로 빠르게 체험</Link>
              </div>
            </section>
          )}
          {canShowMissionPanel && (
            <section className={styles.missionPanel} aria-label="커뮤니티 데모 미션">
              <h3>커뮤니티 데모 진행</h3>
              <p>
                템플릿 적용 → 글 등록 → 댓글 작성 → 신고 요청 → 필수 약관 동의까지 순서대로
                확인합니다.
              </p>
              <div className={styles.missionList}>
                <div className={termsMissionDone ? styles.missionDone : styles.missionPending}>
                  필수 약관 동의: {termsMissionDone ? '완료' : '대기중'}
                </div>
                <div
                  className={
                    effectiveMissionState.templateUsed ? styles.missionDone : styles.missionPending
                  }
                >
                  템플릿 적용: {effectiveMissionState.templateUsed ? '완료' : '대기중'}
                </div>
                <div
                  className={
                    effectiveMissionState.postCreated ? styles.missionDone : styles.missionPending
                  }
                >
                  첫 글 등록: {effectiveMissionState.postCreated ? '완료' : '대기중'}
                </div>
                <div
                  className={
                    effectiveMissionState.commentPosted ? styles.missionDone : styles.missionPending
                  }
                >
                  댓글/답글 등록: {effectiveMissionState.commentPosted ? '완료' : '대기중'}
                </div>
                <div
                  className={
                    effectiveMissionState.reportSubmitted
                      ? styles.missionDone
                      : styles.missionPending
                  }
                >
                  신고 접수: {effectiveMissionState.reportSubmitted ? '완료' : '대기중'}
                </div>
              </div>
              <p className={styles.missionProgress}>
                미션 진행: {missionDoneCount} / {missionTotalCount}
              </p>
              {recentBlockedDemoActivities.length > 0 ? (
                <p className={styles.missionTimelineTitle}>
                  차단된 시도: {recentBlockedDemoActivities.length}건 (필수 조항 동의 후 재시도해
                  주세요)
                </p>
              ) : null}
              <div className={styles.missionTimeline} aria-live="polite">
                <p className={styles.missionTimelineTitle}>최근 커뮤니티 데모 활동</p>
                {recentDemoActivities.length === 0 ? (
                  <p className={styles.missionTimelineEmpty}>아직 활동 로그가 없어요.</p>
                ) : (
                  <ul className={styles.missionTimelineList}>
                    {recentDemoActivities.map((entry) => (
                      <li
                        key={entry.id}
                        className={`${styles.missionTimelineItem} ${
                          isCommunityDemoActionBlocked(entry.action)
                            ? styles.missionTimelineItemBlocked
                            : ''
                        }`}
                      >
                        <span>{formatTime(entry.at)}</span>
                        <span>
                          {formatCommunityDemoEventLabel(entry)}
                          {isCommunityDemoActionBlocked(entry.action) ? ' (차단됨)' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
          <form className={styles.composer} onSubmit={submitPost}>
            <div className={styles.composerHead}>
              <div>
                <h2>새 이야기 쓰기</h2>
                <p>
                  {me
                    ? `${me.nickname}님 이름으로 게시돼요.`
                    : '로그인하면 글과 답글을 남길 수 있어요.'}
                </p>
              </div>
              {!me && (
                <div className={styles.guideLinks}>
                  <Link to={loginHref} className={styles.loginLink}>
                    로그인
                  </Link>
                  <Link to={demoLoginHref}>데모로 먼저 체험</Link>
                </div>
              )}
            </div>
            {isGuideMode && (
              <p className={styles.guideHint}>
                현재 가이드 모드입니다. 템플릿을 누르면 카테고리·동네·본문이 즉시 채워져 바로 등록할
                수 있어요.
              </p>
            )}
            <label className={styles.field}>
              <span>제목</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 첫 모임 전에 뭘 준비하면 좋을까요?"
                maxLength={80}
                disabled={!me || !isTermsReady || createPost.isPending}
                required
              />
            </label>
            <label className={styles.field}>
              <span>내용</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="상황을 짧게 적어주세요. 개인정보나 외부 연락처는 올리지 않는 것이 좋아요."
                maxLength={2000}
                disabled={!me || !isTermsReady || createPost.isPending}
                required
              />
            </label>
            <div className={styles.composerMeta}>
              <label className={styles.field}>
                <span>동네</span>
                <select
                  value={area}
                  onChange={(event) => syncAreaFilter(event.target.value)}
                  disabled={!me || !isTermsReady || createPost.isPending}
                >
                  <option value="">전체 동네</option>
                  {AREAS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>태그</span>
                <input
                  value={tagText}
                  onChange={(event) => setTagText(event.target.value)}
                  placeholder="와인초보, 첫참여"
                  disabled={!me || !isTermsReady || createPost.isPending}
                />
              </label>
            </div>
            {createPost.isError && (
              <p className={styles.error} role="alert">
                글을 저장하지 못했어요. 내용을 확인한 뒤 다시 시도해주세요.
              </p>
            )}
            <div className={styles.composerActions}>
              <span>{body.length}/2000</span>
              <Button
                type="submit"
                variant="gold"
                isLoading={createPost.isPending}
                disabled={!me || !isTermsReady}
                title={isTermsReady ? undefined : '필수 약관 동의 후 글 작성 가능'}
              >
                글 올리기
              </Button>
            </div>
          </form>

          <div className={styles.filters} aria-label="커뮤니티 글 필터">
            {CATEGORIES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`${styles.filter} ${category === item.value ? styles.filterActive : ''}`}
                onClick={() => syncCategoryFilter(item.value)}
                aria-pressed={category === item.value}
              >
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </button>
            ))}
          </div>

          <form className={styles.searchPanel} onSubmit={handleSearchSubmit}>
            <label className={styles.field}>
              <span>키워드 검색</span>
              <div className={styles.searchControls}>
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="예: 첫 모임, 동네, 분위기"
                  disabled={posts.isLoading}
                />
                <Button type="submit" size="sm" variant="soft">
                  검색
                </Button>
                {searchText.trim() && (
                  <Button type="button" size="sm" variant="ghost" onClick={clearSearch}>
                    초기화
                  </Button>
                )}
              </div>
            </label>
          </form>

          <section className={styles.threadList} aria-label="커뮤니티 글 목록">
            {posts.isLoading ? (
              <Loading />
            ) : posts.isError ? (
              <div className={styles.stateBox} role="alert">
                <strong>커뮤니티 글을 불러오지 못했어요</strong>
                <Button variant="soft" onClick={() => posts.refetch()}>
                  다시 불러오기
                </Button>
              </div>
            ) : !posts.data || posts.data.items.length === 0 ? (
              <EmptyState
                emoji="💬"
                title="아직 올라온 이야기가 없어요"
                description={
                  isGuideMode
                    ? '가이드 모드에서는 템플릿을 눌러 바로 글을 시작할 수 있어요.'
                    : '첫 질문을 남기면 같은 모임을 고민하는 사람들이 답을 이어갈 수 있어요.'
                }
              />
            ) : (
              posts.data.items.map((post) => (
                <article
                  key={post.id}
                  className={`${styles.postRow} ${activePostId === post.id ? styles.postRowActive : ''}`}
                >
                  <button type="button" onClick={() => setActivePostId(post.id)}>
                    <span className={styles.rowTop}>
                      <span>{COMMUNITY_POST_CATEGORY_LABEL[post.category]}</span>
                      <span>{formatDate(post.lastCommentAt ?? post.createdAt)}</span>
                    </span>
                    <strong>{post.title}</strong>
                    <p>{post.body}</p>
                    <span className={styles.rowMeta}>
                      <span>{post.area ?? '전체 동네'}</span>
                      <span>댓글 {post.commentCount}</span>
                      <span>{post.author.nickname}</span>
                    </span>
                  </button>
                </article>
              ))
            )}
          </section>
        </section>

        <aside className={styles.detailColumn} aria-label="선택한 커뮤니티 글">
          {!activePostId ? (
            <div className={styles.stateBox}>
              <strong>글을 선택하면 댓글이 보여요</strong>
              <p>대댓글은 한 단계만 열어 읽기 흐름을 유지합니다.</p>
            </div>
          ) : detail.isLoading ? (
            <Loading />
          ) : detail.isError || !detail.data ? (
            <div className={styles.stateBox} role="alert">
              <strong>스레드를 불러오지 못했어요</strong>
              <Button variant="soft" onClick={() => detail.refetch()}>
                다시 시도
              </Button>
            </div>
          ) : (
            <ThreadDetail
              post={detail.data}
              signedIn={!!me}
              currentUserId={me?.id}
              onPostDeleted={() => {
                setActivePostId(null)
                markPostDeleted()
              }}
              onPostEdited={markPostEdited}
              onCommentPosted={markCommentPosted}
              onReplyPosted={markReplyPosted}
              onReportSubmitted={markReportSubmitted}
              onCommentEdited={markCommentEdited}
              onCommentDeleted={markCommentDeleted}
              onDemoActionLog={logDemoAction}
              isTermsReady={isTermsReady}
              policyGateHref={policyGateHref}
              isReportGuarded={isReportGuarded}
            />
          )}
        </aside>
      </main>
    </div>
  )
}

function ThreadDetail({
  post,
  signedIn,
  currentUserId,
  onPostDeleted,
  onPostEdited,
  onCommentPosted,
  onReplyPosted,
  onReportSubmitted,
  onCommentEdited,
  onCommentDeleted,
  onDemoActionLog,
  isReportGuarded,
  isTermsReady,
  policyGateHref,
}: {
  post: CommunityPostDetail
  signedIn: boolean
  currentUserId?: string
  onPostDeleted: () => void
  onPostEdited: () => void
  onCommentPosted: () => void
  onReplyPosted: () => void
  onReportSubmitted: (
    targetType: ReportTargetType,
    targetId: string,
    kind: CreateReportDto['kind'],
  ) => void
  onCommentEdited: (commentId: string) => void
  onCommentDeleted: (commentId: string) => void
  onDemoActionLog: (
    action: CommunityDemoAction,
    label: string,
    meta?: CommunityDemoActionMeta,
  ) => void
  isReportGuarded: (
    targetType: ReportTargetType,
    targetId: string,
    kind: CreateReportDto['kind'],
  ) => boolean
  isTermsReady: boolean
  policyGateHref: string
}) {
  const [comment, setComment] = useState('')
  const [replyTarget, setReplyTarget] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [editingPost, setEditingPost] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title)
  const [editBody, setEditBody] = useState(post.body)
  const [editTagText, setEditTagText] = useState(post.tags.join(', '))
  const createComment = useCreateCommunityComment(post.id)
  const updatePost = useUpdateCommunityPost(post.id)
  const deletePost = useDeleteCommunityPost(post.id)
  const report = useReportCommunityContent()
  const toast = useToast()
  const isPostOwner = currentUserId === post.author.id

  const assertTermsReady = (
    action: string,
    blockedAction: CommunityDemoAction,
    meta?: CommunityDemoActionMeta,
  ) => {
    if (!isTermsReady) {
      toast.show(`${action}은(는) 필수 약관 동의 후에만 가능합니다.`, 'error')
      onDemoActionLog(blockedAction, `${action} 시도 차단`, meta)
      return false
    }
    return true
  }

  useEffect(() => {
    setEditingPost(false)
    setEditTitle(post.title)
    setEditBody(post.body)
    setEditTagText(post.tags.join(', '))
  }, [post.body, post.id, post.tags, post.title])

  const submitComment = async (event: FormEvent) => {
    event.preventDefault()
    if (!assertTermsReady('댓글 작성', 'comment-blocked', { postId: post.id })) {
      return
    }
    try {
      await createComment.mutateAsync({ body: comment })
      setComment('')
      onCommentPosted()
    } catch (error) {
      toast.show((error as Error).message || '댓글을 등록하지 못했어요.', 'error')
    }
  }

  const submitReply = async (event: FormEvent, parentId: string) => {
    event.preventDefault()
    if (!assertTermsReady('답글 작성', 'reply-blocked', { commentId: parentId })) {
      return
    }
    try {
      await createComment.mutateAsync({ body: replyBody, parentId })
      onReplyPosted()
      setReplyTarget(null)
      setReplyBody('')
    } catch (error) {
      toast.show((error as Error).message || '답글을 등록하지 못했어요.', 'error')
    }
  }

  const reportContent = async ({
    targetType,
    targetId,
    targetUserId,
    kind,
    label,
  }: {
    targetType: ReportTargetType
    targetId: string
    targetUserId: string
    kind: CreateReportDto['kind']
    label: string
  }) => {
    if (
      !assertTermsReady('신고 접수', 'report-blocked', {
        targetType,
        ...(targetType === 'post' ? { postId: targetId } : { commentId: targetId }),
        reportKind: kind,
      })
    ) {
      return
    }
    const dto: CreateReportDto = {
      targetUserId,
      kind,
      body: `${label}: 커뮤니티 ${targetType === 'post' ? '글' : '댓글'} 신고`,
      ...(targetType === 'post' ? { communityPostId: post.id } : { communityCommentId: targetId }),
    }
    try {
      await report.mutateAsync(dto)
      toast.show('신고가 접수됐어요. 운영팀이 확인할게요.', 'success')
      onReportSubmitted(targetType, targetId, kind)
    } catch (error) {
      toast.show((error as Error).message || '신고를 접수하지 못했어요.', 'error')
    }
  }

  const submitPostEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!assertTermsReady('글 수정', 'edit-post-blocked', { postId: post.id })) {
      return
    }
    const tags = editTagText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    try {
      await updatePost.mutateAsync({ title: editTitle, body: editBody, tags })
      setEditingPost(false)
      toast.show('글을 수정했어요.', 'success')
      onPostEdited()
    } catch (error) {
      toast.show((error as Error).message || '글을 수정하지 못했어요.', 'error')
    }
  }

  const removePost = async () => {
    if (!assertTermsReady('글 삭제', 'delete-post-blocked', { postId: post.id })) {
      return
    }
    try {
      await deletePost.mutateAsync()
      toast.show('글을 삭제했어요.', 'success')
      onPostDeleted()
    } catch (error) {
      toast.show((error as Error).message || '글을 삭제하지 못했어요.', 'error')
    }
  }

  return (
    <article className={styles.threadDetail}>
      {!isTermsReady ? (
        <div className={styles.policyGateInline}>
          <span>댓글·신고 기능은 필수 조항 동의 후 활성화돼요.</span>
          <div className={styles.policyGateInlineActions}>
            <Link to={policyGateHref}>필수 약관 동의</Link>
          </div>
        </div>
      ) : null}
      <div className={styles.detailHead}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(post.author.nickname)}
        </span>
        <div>
          <span className={styles.authorLine}>
            {post.author.nickname}
            {post.author.isVerified && <em>인증</em>}
          </span>
          <span className={styles.detailTime}>
            {post.area ?? '전체 동네'} · {formatDate(post.createdAt)}
          </span>
        </div>
      </div>
      {editingPost ? (
        <form className={styles.editPanel} onSubmit={submitPostEdit}>
          <label className={styles.field}>
            <span>제목</span>
            <input
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              maxLength={80}
              disabled={updatePost.isPending}
              required
            />
          </label>
          <label className={styles.field}>
            <span>내용</span>
            <textarea
              value={editBody}
              onChange={(event) => setEditBody(event.target.value)}
              maxLength={2000}
              disabled={updatePost.isPending}
              required
            />
          </label>
          <label className={styles.field}>
            <span>태그</span>
            <input
              value={editTagText}
              onChange={(event) => setEditTagText(event.target.value)}
              placeholder="와인초보, 첫참여"
              disabled={updatePost.isPending}
            />
          </label>
          <div className={styles.manageActions}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingPost(false)}
              disabled={updatePost.isPending}
            >
              취소
            </Button>
            <Button size="sm" type="submit" isLoading={updatePost.isPending}>
              저장
            </Button>
          </div>
        </form>
      ) : (
        <>
          <h2>{post.title}</h2>
          <p className={styles.detailBody}>{post.body}</p>
          {post.tags.length > 0 && (
            <div className={styles.tags}>
              {post.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}
        </>
      )}
      {isPostOwner && !editingPost && (
        <div className={styles.ownerRow}>
          <span>내 글</span>
          <div className={styles.manageActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingPost(true)}
              disabled={!isTermsReady}
              title={isTermsReady ? undefined : '필수 약관 동의 후 글 수정 가능'}
            >
              수정
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={removePost}
              isLoading={deletePost.isPending}
              disabled={deletePost.isPending || !isTermsReady}
              title={isTermsReady ? undefined : '필수 약관 동의 후 글 삭제 가능'}
            >
              삭제
            </Button>
          </div>
        </div>
      )}
      {signedIn && !isPostOwner && (
        <div className={styles.safetyRow}>
          <span>개인정보 유도, 홍보, 불쾌한 표현을 발견하면 알려주세요.</span>
          <ReportAction
            label="글 신고"
            disabled={report.isPending || !isTermsReady}
            isReasonBlocked={(kind) => isReportGuarded('post', post.id, kind)}
            onReport={(kind, label) =>
              reportContent({
                targetType: 'post',
                targetId: post.id,
                targetUserId: post.author.id,
                kind,
                label,
              })
            }
          />
        </div>
      )}

      <form className={styles.commentForm} onSubmit={submitComment}>
        <label>
          <span>댓글 쓰기</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={
              signedIn && isTermsReady
                ? '짧고 구체적인 답변을 남겨주세요.'
                : '댓글은 로그인 후 필수 약관 동의가 필요해요.'
            }
            maxLength={800}
            disabled={!signedIn || !isTermsReady || createComment.isPending}
            required
          />
        </label>
        <div className={styles.commentActions}>
          <span>{comment.length}/800</span>
          <Button
            size="sm"
            type="submit"
            isLoading={createComment.isPending}
            disabled={!signedIn || !isTermsReady}
          >
            댓글 등록
          </Button>
        </div>
      </form>

      <div className={styles.comments} aria-live="polite">
        {post.comments.length === 0 ? (
          <div className={styles.emptyComments}>아직 댓글이 없어요. 첫 답변을 남겨보세요.</div>
        ) : (
          post.comments.map((item) => (
            <CommentItem
              key={item.id}
              comment={item}
              signedIn={signedIn}
              replyTarget={replyTarget}
              replyBody={replyBody}
              isPending={createComment.isPending}
              reportPending={report.isPending}
              currentUserId={currentUserId}
              onReplyTarget={setReplyTarget}
              onReplyBody={setReplyBody}
              onSubmitReply={submitReply}
              postId={post.id}
              onReportComment={(targetType, targetId, targetUserId, kind, label) =>
                reportContent({ targetType, targetId, targetUserId, kind, label })
              }
              isReportGuarded={isReportGuarded}
              onDemoActionLog={onDemoActionLog}
              isTermsReady={isTermsReady}
              onCommentEdited={onCommentEdited}
              onCommentDeleted={onCommentDeleted}
            />
          ))
        )}
      </div>
    </article>
  )
}

function CommentItem({
  comment,
  signedIn,
  replyTarget,
  replyBody,
  isPending,
  reportPending,
  currentUserId,
  onReplyTarget,
  onReplyBody,
  onSubmitReply,
  postId,
  onReportComment,
  onCommentEdited,
  onCommentDeleted,
  isReportGuarded,
  isTermsReady,
  onDemoActionLog,
}: {
  comment: CommunityComment
  signedIn: boolean
  replyTarget: string | null
  replyBody: string
  isPending: boolean
  reportPending: boolean
  currentUserId?: string
  onReplyTarget: (id: string | null) => void
  onReplyBody: (value: string) => void
  onSubmitReply: (event: FormEvent, parentId: string) => void
  postId: string
  onReportComment: (
    targetType: ReportTargetType,
    targetId: string,
    targetUserId: string,
    kind: CreateReportDto['kind'],
    label: string,
  ) => void
  onCommentEdited: (commentId: string) => void
  onCommentDeleted: (commentId: string) => void
  isReportGuarded: (
    targetType: ReportTargetType,
    targetId: string,
    kind: CreateReportDto['kind'],
  ) => boolean
  isTermsReady: boolean
  onDemoActionLog: (
    action: CommunityDemoAction,
    label: string,
    meta?: CommunityDemoActionMeta,
  ) => void
}) {
  const isReplying = replyTarget === comment.id
  const [editingComment, setEditingComment] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [replyEditBody, setReplyEditBody] = useState('')
  const updateComment = useUpdateCommunityComment(postId)
  const deleteComment = useDeleteCommunityComment(postId)
  const toast = useToast()
  const isCommentOwner = currentUserId === comment.author.id

  useEffect(() => {
    setEditingComment(false)
    setEditBody(comment.body)
    setEditingReplyId(null)
    setReplyEditBody('')
  }, [comment.body, comment.id])

  const submitCommentEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isTermsReady) {
      toast.show('필수 조항 동의 후 댓글 수정이 가능합니다.', 'error')
      onDemoActionLog('edit-comment-blocked', '댓글 수정 시도 차단', {
        commentId: comment.id,
      })
      return
    }
    try {
      await updateComment.mutateAsync({ commentId: comment.id, dto: { body: editBody } })
      setEditingComment(false)
      toast.show('댓글을 수정했어요.', 'success')
      onCommentEdited(comment.id)
    } catch (error) {
      toast.show((error as Error).message || '댓글을 수정하지 못했어요.', 'error')
    }
  }

  const removeComment = async (commentId: string) => {
    if (!isTermsReady) {
      toast.show('필수 조항 동의 후 댓글 삭제가 가능합니다.', 'error')
      onDemoActionLog('delete-comment-blocked', '댓글 삭제 시도 차단', {
        commentId,
      })
      return
    }
    try {
      await deleteComment.mutateAsync(commentId)
      toast.show('댓글을 삭제했어요.', 'success')
      onCommentDeleted(commentId)
    } catch (error) {
      toast.show((error as Error).message || '댓글을 삭제하지 못했어요.', 'error')
    }
  }

  const startReplyEdit = (reply: CommunityComment) => {
    setEditingReplyId(reply.id)
    setReplyEditBody(reply.body)
  }

  const submitReplyEdit = async (event: FormEvent, replyId: string) => {
    event.preventDefault()
    if (!isTermsReady) {
      toast.show('필수 조항 동의 후 답글 수정이 가능합니다.', 'error')
      onDemoActionLog('edit-comment-blocked', '답글 수정 시도 차단', {
        commentId: replyId,
      })
      return
    }
    try {
      await updateComment.mutateAsync({ commentId: replyId, dto: { body: replyEditBody } })
      setEditingReplyId(null)
      setReplyEditBody('')
      toast.show('답글을 수정했어요.', 'success')
      onCommentEdited(replyId)
    } catch (error) {
      toast.show((error as Error).message || '답글을 수정하지 못했어요.', 'error')
    }
  }

  return (
    <div className={styles.comment}>
      <div className={styles.commentBody}>
        <span className={styles.avatarSmall} aria-hidden="true">
          {initials(comment.author.nickname)}
        </span>
        <div>
          <span className={styles.authorLine}>{comment.author.nickname}</span>
          {editingComment ? (
            <form className={styles.inlineEditForm} onSubmit={submitCommentEdit}>
              <textarea
                value={editBody}
                onChange={(event) => setEditBody(event.target.value)}
                maxLength={800}
                disabled={updateComment.isPending || !isTermsReady}
                required
              />
              <div className={styles.commentActions}>
                <button
                  type="button"
                  onClick={() => setEditingComment(false)}
                  disabled={updateComment.isPending || !isTermsReady}
                >
                  취소
                </button>
                <Button
                  size="sm"
                  type="submit"
                  isLoading={updateComment.isPending}
                  disabled={updateComment.isPending || !isTermsReady}
                >
                  저장
                </Button>
              </div>
            </form>
          ) : (
            <p>{comment.body}</p>
          )}
          <div className={styles.commentMeta}>
            <span>{formatDate(comment.createdAt)}</span>
            {!editingComment && (
              <button type="button" onClick={() => onReplyTarget(isReplying ? null : comment.id)}>
                답글
              </button>
            )}
            {isCommentOwner && !editingComment && (
              <>
                <button
                  type="button"
                  disabled={!isTermsReady}
                  onClick={() => setEditingComment(true)}
                >
                  수정
                </button>
                <button
                  type="button"
                  disabled={!isTermsReady || deleteComment.isPending}
                  title={isTermsReady ? undefined : '필수 약관 동의 후 댓글 삭제 가능'}
                  onClick={() => removeComment(comment.id)}
                >
                  삭제
                </button>
              </>
            )}
            {signedIn && !isCommentOwner && (
              <ReportAction
                label="댓글 신고"
                disabled={reportPending || !isTermsReady}
                isReasonBlocked={(kind) => isReportGuarded('comment', comment.id, kind)}
                onReport={(kind, label) =>
                  onReportComment('comment', comment.id, comment.author.id, kind, label)
                }
              />
            )}
          </div>
        </div>
      </div>
      {isReplying && (
        <form className={styles.replyForm} onSubmit={(event) => onSubmitReply(event, comment.id)}>
          <textarea
            value={replyBody}
            onChange={(event) => onReplyBody(event.target.value)}
            placeholder={
              signedIn && isTermsReady
                ? '답글을 입력하세요.'
                : '답글은 로그인 후 필수 약관 동의가 필요해요.'
            }
            maxLength={800}
            disabled={!signedIn || !isTermsReady || isPending}
            required
          />
          <div className={styles.commentActions}>
            <button type="button" onClick={() => onReplyTarget(null)}>
              취소
            </button>
            <Button
              size="sm"
              type="submit"
              isLoading={isPending}
              disabled={!signedIn || !isTermsReady}
            >
              답글 등록
            </Button>
          </div>
        </form>
      )}
      {(comment.replies ?? []).length > 0 && (
        <div className={styles.replies}>
          {comment.replies?.map((reply) => (
            <div key={reply.id} className={styles.reply}>
              <span className={styles.avatarSmall} aria-hidden="true">
                {initials(reply.author.nickname)}
              </span>
              <div>
                <span className={styles.authorLine}>{reply.author.nickname}</span>
                {editingReplyId === reply.id ? (
                  <form
                    className={styles.inlineEditForm}
                    onSubmit={(event) => submitReplyEdit(event, reply.id)}
                  >
                    <textarea
                      value={replyEditBody}
                      onChange={(event) => setReplyEditBody(event.target.value)}
                      maxLength={800}
                      disabled={updateComment.isPending || !isTermsReady}
                      required
                    />
                    <div className={styles.commentActions}>
                      <button
                        type="button"
                        onClick={() => setEditingReplyId(null)}
                        disabled={updateComment.isPending || !isTermsReady}
                      >
                        취소
                      </button>
                      <Button
                        size="sm"
                        type="submit"
                        isLoading={updateComment.isPending}
                        disabled={updateComment.isPending || !isTermsReady}
                      >
                        저장
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p>{reply.body}</p>
                )}
                <div className={styles.replyMeta}>
                  <span className={styles.detailTime}>{formatDate(reply.createdAt)}</span>
                  {currentUserId === reply.author.id && editingReplyId !== reply.id && (
                    <>
                      <button
                        type="button"
                        disabled={!isTermsReady}
                        onClick={() => startReplyEdit(reply)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        disabled={!isTermsReady || deleteComment.isPending}
                        title={isTermsReady ? undefined : '필수 약관 동의 후 답글 삭제 가능'}
                        onClick={() => removeComment(reply.id)}
                      >
                        삭제
                      </button>
                    </>
                  )}
                  {signedIn && currentUserId !== reply.author.id && (
                    <ReportAction
                      label="답글 신고"
                      disabled={reportPending || !isTermsReady}
                      isReasonBlocked={(kind) => isReportGuarded('comment', reply.id, kind)}
                      onReport={(kind, label) =>
                        onReportComment('comment', reply.id, reply.author.id, kind, label)
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReportAction({
  label,
  disabled,
  onReport,
  isReasonBlocked,
}: {
  label: string
  disabled: boolean
  onReport: (kind: CreateReportDto['kind'], label: string) => void
  isReasonBlocked?: (kind: CreateReportDto['kind']) => boolean
}) {
  return (
    <details className={styles.reportMenu}>
      <summary>{label}</summary>
      <div className={styles.reportOptions}>
        {REPORT_REASONS.map((reason) => (
          <button
            key={reason.kind}
            type="button"
            disabled={disabled || Boolean(isReasonBlocked?.(reason.kind))}
            onClick={() => onReport(reason.kind, reason.label)}
          >
            {reason.label}
          </button>
        ))}
      </div>
    </details>
  )
}
