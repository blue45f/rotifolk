import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import {
  addTutorialStep,
  readTutorialProgress,
  setTutorialProgress,
  normalizeTutorialStep,
  type TutorialStepId,
} from '@features/tutorial/progress'
import {
  hasRequiredTerms,
  TERMS_CONSENT_CHANGED_EVENT,
  TERMS_CONSENT_STORAGE_KEY,
  toTermsConsentState,
  readTermsConsentState,
  TERMS_REQUIRED_SECTION_IDS,
  type TermsConsentState,
} from '@features/legal/termsConsent'
import {
  COMMUNITY_DEMO_ACTIVITY_CHANGED_EVENT,
  COMMUNITY_DEMO_ACTIVITY_KEY,
  formatCommunityDemoEventTime,
  formatCommunityDemoEventLabel,
  isCommunityDemoActionBlocked,
  readCommunityDemoActivityLog,
  summarizeCommunityDemoMissionState,
  toCommunityDemoActivityEntry,
  type CommunityDemoActivityLogEntry,
} from '@features/community/demoTracker'
import styles from './Tutorial.module.css'

type TutorialStep = {
  id: TutorialStepId
  icon: string
  label: string
  title: string
  desc: string
  href: string
  actionLabel: string
  outcome: string
}

const COMMUNITY_STEP_IDS: ReadonlySet<TutorialStepId> = new Set([
  'community',
  'community-template',
  'community-comment',
  'community-report',
])
const TERMS_LABEL_BY_ID: Record<(typeof TERMS_REQUIRED_SECTION_IDS)[number], string> = {
  refund: '환불 정책',
  privacy: '개인정보',
  safety: '안전',
}

const STEPS: TutorialStep[] = [
  {
    id: 'help',
    icon: '📚',
    label: 'Step 01',
    title: 'FAQ로 전체 동선 한 번 이해하기',
    desc: '참가자/호스트 가이드에서 라운드, 결제, 취소, 환불을 빠르게 훑어보세요.',
    href: '/help',
    actionLabel: 'FAQ 확인',
    outcome: '서비스 진입 조건·기본 용어 파악',
  },
  {
    id: 'community',
    icon: '💬',
    label: 'Step 02',
    title: '커뮤니티로 첫 질문 쓰기',
    desc: '템플릿을 선택해 질문을 바로 등록하고 답변 흐름을 실제로 따라가 봅니다.',
    href: '/community?guide=1&template=first-question',
    actionLabel: '커뮤니티 데모 시작',
    outcome: '글 작성 → 답글 → 신고 규칙까지 체크',
  },
  {
    id: 'community-template',
    icon: '🧭',
    label: 'Step 03',
    title: '템플릿으로 한 번에 질문 등록',
    desc: '가이드 템플릿을 적용해 작성 필드를 채우고 바로 등록합니다.',
    href: '/community?guide=1&template=first-question',
    actionLabel: '템플릿 체험 시작',
    outcome: '작성 동선에서 공통 포맷을 익힘',
  },
  {
    id: 'community-comment',
    icon: '💬',
    label: 'Step 04',
    title: '댓글/답글로 대화 이어가기',
    desc: '원문에 코멘트를 남기고 답글을 이어서 대화형 커뮤니티 흐름을 확인합니다.',
    href: '/community?guide=1&template=first-question',
    actionLabel: '댓글 연동 살펴보기',
    outcome: '커뮤니티 상호작용을 실제로 체험',
  },
  {
    id: 'community-report',
    icon: '🚨',
    label: 'Step 05',
    title: '안전 리포트 접수 흐름 확인',
    desc: '부적절한 콘텐츠에 대한 신고 메뉴와 처리 안내를 확인합니다.',
    href: '/community?guide=1&template=first-question',
    actionLabel: '신고 동선 열어보기',
    outcome: '안전 모더레이션 기능 진입 경로 확보',
  },
  {
    id: 'policies',
    icon: '📜',
    label: 'Step 06',
    title: '필수 정책/동의 상태 점검',
    desc: '필수 조항을 빠르게 확인하고 동의 진행률을 조정해 보세요.',
    href: '/policies?filter=required',
    actionLabel: '필수 조항 확인',
    outcome: '동의율 및 버전 상태 이해',
  },
  {
    id: 'policies-sync',
    icon: '🔐',
    label: 'Step 07',
    title: '약관 동의 동기화/증빙 저장',
    desc: '변경된 동의 상태를 동기화하고 증빙 JSON을 내려받아 보관할 수 있습니다.',
    href: '/policies?filter=required&fromTutorial=policies-sync',
    actionLabel: '증빙 저장 경로 확인',
    outcome: '정책 변경 대응을 위한 증빙 습관 형성',
  },
  {
    id: 'demo',
    icon: '🎁',
    label: 'Step 08',
    title: '데모 계정으로 핵심 흐름 확인',
    desc: '가입 없이 데모 계정으로 로그인해 실제 화면 전환을 빠르게 체험합니다.',
    href: '/login?demo=1&auto=1',
    actionLabel: '데모 시작',
    outcome: '탐색 → 커뮤니티 → 정책 이동까지 한 번에 완료',
  },
]

function resolveSafeReturnPath(raw: string | null): string {
  const fallback = '/'
  if (!raw) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.includes('://')) return fallback
  if (typeof window === 'undefined') return fallback

  try {
    const target = new URL(raw, window.location.origin)
    if (target.origin !== window.location.origin) return fallback
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return fallback
  }
}

function withReturnAndTutorialParam(basePath: string, encodedFrom: string, stepId: TutorialStepId) {
  const queryPrefix = basePath.includes('?') ? '&' : '?'
  return `${basePath}${queryPrefix}from=${encodedFrom}&fromTutorial=${stepId}`
}

export default function TutorialPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const currentPath = `${location.pathname}${location.search}${location.hash}` || '/'
  const encodedFrom = encodeURIComponent(currentPath)
  const returnHref = resolveSafeReturnPath(searchParams.get('from'))
  const focusRaw = searchParams.get('focus')
  const fromTutorial = normalizeTutorialStep(searchParams.get('fromTutorial'))
  const [termsConsentState, setTermsConsentState] = useState<TermsConsentState>(() =>
    readTermsConsentState(),
  )
  const isTermsReady = hasRequiredTerms(termsConsentState.agreedIds)
  const missingRequiredTerms = TERMS_REQUIRED_SECTION_IDS.filter(
    (id) => !termsConsentState.agreedIds.includes(id),
  )
  const missingRequiredTermNames = missingRequiredTerms.map((id) => TERMS_LABEL_BY_ID[id])
  const [communityDemoLog, setCommunityDemoLog] = useState<CommunityDemoActivityLogEntry[]>(() =>
    readCommunityDemoActivityLog(),
  )
  const communityDemoMission = useMemo(
    () => summarizeCommunityDemoMissionState(communityDemoLog),
    [communityDemoLog],
  )
  const communityDemoRecent = useMemo(
    () => [...communityDemoLog].reverse().slice(0, 6),
    [communityDemoLog],
  )
  const blockedDemoActionCount = useMemo(
    () => communityDemoLog.filter((entry) => isCommunityDemoActionBlocked(entry.action)).length,
    [communityDemoLog],
  )
  const focus =
    focusRaw === 'help' ||
    focusRaw === 'community' ||
    focusRaw === 'community-template' ||
    focusRaw === 'community-comment' ||
    focusRaw === 'community-report' ||
    focusRaw === 'policies' ||
    focusRaw === 'policies-sync' ||
    focusRaw === 'demo'
      ? (focusRaw as TutorialStepId)
      : null
  const quickHelpHref = withReturnAndTutorialParam('/help', encodedFrom, 'help')
  const quickCommunityHref = isTermsReady
    ? withReturnAndTutorialParam(
        '/community?guide=1&template=first-question',
        encodedFrom,
        'community',
      )
    : `/policies?filter=required&from=${encodedFrom}&fromTutorial=policies`
  const quickCommunityLabel = isTermsReady ? '커뮤니티 가이드' : '커뮤니티 진행 전 약관 동의'
  const quickPoliciesHref = withReturnAndTutorialParam(
    '/policies?filter=required',
    encodedFrom,
    'policies',
  )
  const [completed, setCompleted] = useState<TutorialStepId[]>(() => {
    return readTutorialProgress()
  })

  const doneSet = useMemo(() => new Set(completed), [completed])
  const effectiveDoneSet = useMemo(() => {
    if (isTermsReady) {
      const next = new Set(doneSet)
      if (communityDemoMission.templateUsed) next.add('community-template')
      if (communityDemoMission.postCreated) next.add('community')
      if (communityDemoMission.commentPosted) next.add('community-comment')
      if (communityDemoMission.reportSubmitted) next.add('community-report')
      return next
    }

    const next = new Set(doneSet)
    COMMUNITY_STEP_IDS.forEach((stepId) => {
      next.delete(stepId)
    })
    return next
  }, [communityDemoMission, doneSet, isTermsReady])
  const completionRate = useMemo(
    () => Math.round((effectiveDoneSet.size / STEPS.length) * 100),
    [effectiveDoneSet],
  )

  const stepItems = useMemo(
    () =>
      STEPS.map((step) => {
        const locked = COMMUNITY_STEP_IDS.has(step.id) && !isTermsReady
        return {
          ...step,
          href: locked
            ? `/policies?filter=required&from=${encodedFrom}&fromTutorial=policies`
            : withReturnAndTutorialParam(step.href, encodedFrom, step.id),
          done: effectiveDoneSet.has(step.id),
          locked,
          actionLabel: locked ? '약관 동의 후 진행' : step.actionLabel,
        }
      }),
    [effectiveDoneSet, encodedFrom, isTermsReady],
  )
  const nextRecommendedStep = useMemo(() => {
    return (
      stepItems.find((step) => !step.done && !step.locked) ??
      stepItems.find((step) => !step.done) ??
      null
    )
  }, [stepItems])

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
      const next = toTermsConsentState((event as CustomEvent<TermsConsentState>).detail)
      refreshTerms(next ?? undefined)
    }

    window.addEventListener('storage', onStorageChange)
    window.addEventListener(TERMS_CONSENT_CHANGED_EVENT, onTermsConsentChange)

    return () => {
      window.removeEventListener('storage', onStorageChange)
      window.removeEventListener(TERMS_CONSENT_CHANGED_EVENT, onTermsConsentChange)
    }
  }, [])

  useEffect(() => {
    const syncDemoLog = () => {
      setCommunityDemoLog(readCommunityDemoActivityLog())
    }

    const onStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key === COMMUNITY_DEMO_ACTIVITY_KEY) {
        syncDemoLog()
      }
    }

    const onDemoActivityChanged = (event: Event) => {
      const next = toCommunityDemoActivityEntry((event as CustomEvent<unknown>).detail)
      if (!next) {
        syncDemoLog()
        return
      }

      setCommunityDemoLog((prev) => {
        const merged = [...prev.filter((item) => item.id !== next.id), next]
        return merged.sort((a, b) => a.at - b.at).slice(-60)
      })
    }

    window.addEventListener('storage', onStorageChange)
    window.addEventListener(COMMUNITY_DEMO_ACTIVITY_CHANGED_EVENT, onDemoActivityChanged)

    return () => {
      window.removeEventListener('storage', onStorageChange)
      window.removeEventListener(COMMUNITY_DEMO_ACTIVITY_CHANGED_EVENT, onDemoActivityChanged)
    }
  }, [])

  const allDone = effectiveDoneSet.size >= STEPS.length

  const mark = (id: TutorialStepId, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...completed, id]))
      : completed.filter((stepId) => stepId !== id)

    setCompleted(next)
    setTutorialProgress(next)
  }

  const reset = () => {
    setCompleted([])
    setTutorialProgress([])
  }

  useEffect(() => {
    if (!fromTutorial) return
    addTutorialStep(fromTutorial)
    setCompleted(readTutorialProgress())
  }, [fromTutorial])

  useEffect(() => {
    if (!focus) return
    const timeout = window.setTimeout(() => {
      const node = document.getElementById(`tutorial-step-${focus}`)
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 80)
    return () => window.clearTimeout(timeout)
  }, [focus])

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <Badge tone="info" size="md">
          Tutorial Hub
        </Badge>
        <h1 className={styles.title}>8단계로 익히는 첫 진입 루트</h1>
        <p className={styles.lead}>
          새 계정이든 데모 유저든, 여기에서 동선을 8단계로 점검해보면 실제 이용 경로를 금방 이해할
          수 있어요.
        </p>
      </header>

      <section className={styles.progressPanel} aria-label="튜토리얼 진행률">
        <div className={styles.progressMeta}>
          <span>진행률</span>
          <strong>{completionRate}%</strong>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completionRate}
        >
          <span style={{ width: `${completionRate}%` }} />
        </div>
        <div className={styles.progressText}>
          <span>
            완료 {effectiveDoneSet.size} / {STEPS.length} 단계
          </span>
          {allDone ? (
            <span>데모 루트를 모두 체험했어요.</span>
          ) : (
            <span>남은 단계: {STEPS.length - effectiveDoneSet.size}</span>
          )}
        </div>
        {blockedDemoActionCount > 0 && (
          <p className={styles.progressText}>
            <span role="note">
              차단된 시도 {blockedDemoActionCount}건이 기록됐어요. 약관 동의 후 동작을 재실행해
              주세요.
            </span>
          </p>
        )}
        {!isTermsReady ? (
          <div className={styles.progressText}>
            <span role="note">필수 조항 미동의: {missingRequiredTermNames.join(', ')}</span>
            <Link to={`/policies?filter=required&from=${encodedFrom}&fromTutorial=policies`}>
              필수 조항 동의로 계속
            </Link>
          </div>
        ) : null}
      </section>

      <section className={styles.communityPanel} aria-label="커뮤니티 데모 연동">
        <h2 className={styles.sectionTitle}>커뮤니티 데모 연동 상태</h2>
        <div className={styles.communityChecklist}>
          <span className={styles.communityChecklistItem}>
            템플릿 적용: {communityDemoMission.templateUsed ? '완료' : '대기중'}
          </span>
          <span className={styles.communityChecklistItem}>
            첫 글 등록: {communityDemoMission.postCreated ? '완료' : '대기중'}
          </span>
          <span className={styles.communityChecklistItem}>
            댓글/답글 등록: {communityDemoMission.commentPosted ? '완료' : '대기중'}
          </span>
          <span className={styles.communityChecklistItem}>
            신고 접수: {communityDemoMission.reportSubmitted ? '완료' : '대기중'}
          </span>
        </div>
        <div className={styles.communityActivity} aria-live="polite">
          <h3 className={styles.sectionTitle}>최근 커뮤니티 데모 액션</h3>
          {communityDemoRecent.length === 0 ? (
            <p className={styles.emptyState}>아직 커뮤니티 데모 로그가 없습니다.</p>
          ) : (
            <ul>
              {communityDemoRecent.map((entry) => (
                <li
                  key={entry.id}
                  className={`${styles.communityActivityItem} ${
                    isCommunityDemoActionBlocked(entry.action)
                      ? styles.communityActivityItemBlocked
                      : ''
                  }`}
                >
                  <span>{formatCommunityDemoEventTime(entry.at)}</span>
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

      <section className={styles.steps} aria-label="튜토리얼 스텝">
        <h2 className={styles.sectionTitle}>기능별 실사용 가이드</h2>
        <div className={styles.stepList}>
          {stepItems.map((step) => (
            <article key={step.id} id={`tutorial-step-${step.id}`} className={styles.stepCard}>
              <div className={styles.stepHead}>
                <span className={styles.stepBadge}>🗂 {step.label}</span>
                <label className={styles.doneMark}>
                  <input
                    type="checkbox"
                    checked={step.done}
                    disabled={step.locked}
                    onChange={(e) => mark(step.id, e.currentTarget.checked)}
                    aria-label={`${step.title} 완료 체크`}
                    title={step.locked ? '필수 조항 동의 후 잠금 해제됩니다.' : undefined}
                  />
                  <span>{step.done ? '완료' : step.locked ? '잠금' : '미완료'}</span>
                </label>
              </div>
              <div className={styles.stepContent}>
                <h3>
                  <span aria-hidden="true">{step.icon}</span>
                  {step.title}
                </h3>
                <p>{step.desc}</p>
                {step.locked ? (
                  <p className={styles.outcome}>진행 잠금: 필수 조항 동의 후 이용 가능합니다.</p>
                ) : null}
                <p className={styles.outcome}>기대 결과: {step.outcome}</p>
              </div>
              <div className={styles.stepActions}>
                <Link to={step.href}>
                  <Button type="button" size="sm" variant={step.done ? 'secondary' : 'primary'}>
                    {step.actionLabel}
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.playbook}>
        <h2 className={styles.sectionTitle}>다음 동작 추천</h2>
        <div className={styles.playbookGrid}>
          <div className={styles.playbookCard}>
            <h3>데모 시작 후 바로가기</h3>
            <p>FAQ → 커뮤니티 → 정책 동의 순으로 체험하면 실제 이용 흐름이 제일 자연스럽습니다.</p>
            <p>현재 링크는 각 페이지에서 되돌아갈 위치를 자동 기억합니다.</p>
          </div>
          <div className={styles.playbookCard}>
            <h3>복습용 검색어</h3>
            <ul>
              <li>help에서 ‘노쇼’ 검색</li>
              <li>community에서 ‘질문 템플릿’ 검색</li>
              <li>policies에서 ‘필수’ 필터 켜기</li>
            </ul>
          </div>
          <div className={styles.playbookCard}>
            <h3>바로 시작</h3>
            <div className={styles.gridLinks}>
              <Link to={quickHelpHref}>도움말 시작</Link>
              <Link to={quickCommunityHref}>{quickCommunityLabel}</Link>
              <Link to={quickPoliciesHref}>필수 정책 보기</Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.finish}>
        <div>
          <h2>체크포인트 정리</h2>
          <p>
            이 튜토리얼은 데모 가용성, 커뮤니티 입문, 정책 동의, 보안 동선을 함께 묶어 첫 오더라도
            길을 잃지 않게 만들도록 구성했습니다.
          </p>
        </div>
        <div className={styles.finishActions}>
          {nextRecommendedStep ? (
            <Link to={nextRecommendedStep.href}>
              <Button type="button" size="sm" variant="primary">
                다음 추천 단계로 이동
              </Button>
            </Link>
          ) : null}
          <Button type="button" size="sm" variant="ghost" onClick={reset}>
            진행 상태 초기화
          </Button>
          <Link to={returnHref}>
            <Button type="button" size="sm" variant="outline">
              이전으로 돌아가기
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
