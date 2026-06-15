import { Button } from '@components/ui/Button/Button'
import { Icon, type IconName } from '@components/ui/Icon/Icon'
import { Input } from '@components/ui/Input/Input'
import { refundSchedule } from '@rotifolk/shared'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import styles from './Policies.module.css'

import {
  buildTermsEvidence,
  TERMS_REQUIRED_SECTION_IDS,
  TERMS_ALL_SECTION_IDS,
  TERMS_CURRENT_CONTENT_HASH,
  buildRates,
  hasRequiredTerms,
  isTermsVersionOutdated,
  readTermsActionLog,
  readTermsConsentHistory,
  readTermsConsentState,
  saveTermsAction,
  saveTermsAgreement,
  type TermsSectionId,
} from '@/domains/legal/termsConsent'
import { addTutorialStep, normalizeTutorialStep } from '@/domains/tutorial/progress'

type FilterMode = 'all' | 'required' | 'optional'

interface PolicySection {
  id: TermsSectionId
  /** Emoji fallback shown when no line-glyph maps to the section. */
  icon: string
  /** Line-glyph icon name; preferred over the emoji when set. */
  iconName?: IconName
  title: string
  required: boolean
  searchText: string
  body: ReactNode
}

const tiers = refundSchedule(24)
const TERMSDESK_BASE = 'https://termsdesk.vercel.app'
const SUPPORT_URL = `${TERMSDESK_BASE}/support/rotifolk`

const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'refund',
    icon: '↩️',
    title: '환불 정책',
    required: true,
    searchText:
      '환불 취소 전환 전 후 반올림 기한 환불 규정 시작 전 전액 환불 자동 취소 주최자 취소 성비 불가 피하지 못한 경우',
    body: (
      <>
        <p className={styles.lead}>
          참가비 환불은 모임 시작 시각을 기준으로, 취소 시점에 따라 단계적으로 적용돼요. 전액 환불
          마감은 모임마다 다를 수 있어요(기본 시작 24시간 전).
        </p>
        <ul className={styles.tiers}>
          {tiers.map((t) => (
            <li key={t.label} className={styles.tier}>
              <span className={styles.tierLabel}>{t.label}</span>
              <span className={styles.tierRate} data-zero={t.rate === 0}>
                {Math.round(t.rate * 100)}% 환불
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          주최자 취소 또는 성비·인원 미달로 인한 자동 취소는 시점과 무관하게{' '}
          <strong>전액 환불</strong>
          됩니다.
        </p>
      </>
    ),
  },
  {
    id: 'cancel',
    icon: '🗓️',
    title: '취소 정책',
    required: false,
    searchText: '취소 사유 자리 배정 동등한 비율 성비 미달 취소 대기자 자동 추천 순번 노쇼 방지',
    body: (
      <p>
        참가 취소는 마이 페이지에서 직접 할 수 있어요. 취소 즉시 자리가 풀려 대기자에게 기회가
        넘어가고, 위 환불 정책에 따라 환불이 진행돼요. 성비 균형을 위해 한쪽 성별이 가득 찬 경우
        취소분은 같은 성별 대기자에게 우선 배정됩니다.
      </p>
    ),
  },
  {
    id: 'noshow',
    icon: '🚪',
    title: '노쇼 정책',
    required: false,
    searchText:
      '노쇼 패널티 환불 제한 반복 노쇼 신뢰 점수 제한 참여 제한 사전 취소 중요성 참석하지 않고',
    body: (
      <p>
        예약 후 연락 없이 참석하지 않으면 <strong>환불되지 않으며</strong>, 반복 노쇼는 신뢰 점수에
        반영돼 일부 모임 참여가 제한될 수 있어요. 못 가게 되면 시작 전에 꼭 취소해 주세요.
      </p>
    ),
  },
  {
    id: 'privacy',
    icon: '🔐',
    iconName: 'shield',
    title: '개인정보 · 민감정보',
    required: true,
    searchText:
      '개인정보 연락처 회사 연차 소득 정보 동의 채팅인스타카톡번호 동의 범위 공지 및 유효기간',
    body: (
      <ul className={styles.bullets}>
        <li>
          전화번호는 <strong>해시</strong>로만 대조에 쓰이고 원본은 저장되지 않아요.
        </li>
        <li>
          연결 채널(채팅·인스타·카톡·번호)은 매칭된 상대와 <strong>양쪽이 동의한 채널만</strong>{' '}
          단계적으로 공개돼요.
        </li>
        <li>
          직업·회사·소득 같은 신상 정보는 인증 배지/구간만 저장하고 증빙 원본은 보관하지 않아요.
          항목별 공개 범위(전체·매칭된 상대·비공개)를 개별 설정할 수 있어요.
        </li>
        <li>
          받은 호감 수와 ‘오늘의 인기남/인기녀’ 선정 참여 여부는 프로필 설정에서 직접 켜고 끌 수
          있어요.
        </li>
      </ul>
    ),
  },
  {
    id: 'safety',
    icon: '🛟',
    iconName: 'shield',
    title: '안전 · 지인 회피',
    required: true,
    searchText: '안전 차단 블록 불쾌 신고 운영팀 검토 피하고 싶은 사람 회피 필터링',
    body: (
      <p>
        마주치고 싶지 않은 사람의 번호를 등록하면(해시 저장) 같은 모임에서 자동으로 매칭·좌석에서
        제외돼요. 같은 회사 자동 회피, 차단도 동일하게 적용됩니다. 불쾌한 경험은 언제든 신고할 수
        있고 신고 내역은 운영팀이 검토해요.
      </p>
    ),
  },
]

const POLICIES_TERMS_VERSION_DATE = '2026년 6월'

function resolveSafeReturnPath(raw: string | null): string {
  const fallback = '/tutorial'
  if (!raw) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.includes('://')) return fallback
  if (typeof window === 'undefined') return fallback

  try {
    const target = new URL(raw, globalThis.location.origin)
    if (target.origin !== globalThis.location.origin) return fallback
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return fallback
  }
}

function formatDate(value: number) {
  if (!value) return '아직 적용되지 않음'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function isFilterMode(value: string | null): value is FilterMode {
  return value === 'all' || value === 'required' || value === 'optional'
}

function normalizeSection(value: string | null): TermsSectionId | null {
  if (!value) return null
  return TERMS_ALL_SECTION_IDS.includes(value as TermsSectionId) ? (value as TermsSectionId) : null
}

function formatHash(value: string) {
  if (!value) return '-'
  if (value.length <= 16) return value
  return `${value.slice(0, 8)}…${value.slice(-8)}`
}

export default function PoliciesPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialState = readTermsConsentState()
  const tutorialStep = normalizeTutorialStep(searchParams.get('fromTutorial'))
  const isTutorialMode = tutorialStep === 'policies' || tutorialStep === 'policies-sync'
  const [search, setSearch] = useState<string>(searchParams.get('q') ?? '')
  const filterParam = searchParams.get('filter')
  const [filter, setFilter] = useState<FilterMode>(isFilterMode(filterParam) ? filterParam : 'all')
  const [agreedIds, setAgreedIds] = useState<TermsSectionId[]>(() => initialState.agreedIds)
  const [version, setVersion] = useState(initialState.version)
  const [updatedAt, setUpdatedAt] = useState(initialState.updatedAt)
  const [history, setHistory] = useState(() => readTermsConsentHistory())
  const [actionLogs, setActionLogs] = useState(() => readTermsActionLog())
  const focusedSection = useMemo(
    () => normalizeSection(searchParams.get('section')),
    [searchParams]
  )

  const refreshActionLogs = useCallback(() => {
    setActionLogs(readTermsActionLog())
  }, [])
  const recordTermsAction = useCallback(
    (action: string, label: string) => {
      saveTermsAction(action, label)
      refreshActionLogs()
    },
    [refreshActionLogs]
  )

  const currentPath = `${location.pathname}${location.search}${location.hash}`
  const { requiredRate, totalRate } = useMemo(() => buildRates(agreedIds), [agreedIds])
  const currentEvidence = useMemo(() => buildTermsEvidence(agreedIds), [agreedIds])
  const latestEvidence = useMemo(() => {
    const latest = history[history.length - 1]
    return latest?.evidence ?? currentEvidence
  }, [currentEvidence, history])
  const isOutdated = isTermsVersionOutdated(version)
  const isContentOutdated = currentEvidence.contentHash !== TERMS_CURRENT_CONTENT_HASH
  const isReady = hasRequiredTerms(agreedIds)
  const missingRequired = TERMS_REQUIRED_SECTION_IDS.filter((id) => !agreedIds.includes(id))
  const lastUpdated = formatDate(updatedAt)
  const backTarget = useMemo(() => resolveSafeReturnPath(searchParams.get('from')), [searchParams])

  const normalizedQuery = search.trim().toLowerCase()
  const visibleSections = useMemo(() => {
    return POLICY_SECTIONS.filter((section) => {
      if (filter === 'required' && !section.required) return false
      if (filter === 'optional' && section.required) return false
      if (!normalizedQuery) return true
      const searchable = `${section.title} ${section.searchText}`.toLowerCase()
      return searchable.includes(normalizedQuery)
    })
  }, [filter, normalizedQuery])

  const sectionLinkVisited = useMemo(
    () => actionLogs.some((entry) => entry.action === 'section-jump'),
    [actionLogs]
  )
  const searchActionUsed = useMemo(
    () => actionLogs.some((entry) => entry.action === 'search' || entry.action === 'search-reset'),
    [actionLogs]
  )
  const filterActionUsed = useMemo(
    () => actionLogs.some((entry) => entry.action === 'filter'),
    [actionLogs]
  )

  const policyReadinessChecks = useMemo(
    () => [
      {
        label: '필수 조항 동의',
        icon: 'shield' as IconName,
        done: isReady,
        detail: isReady
          ? '필수 동의 항목이 모두 동의되어 있어요.'
          : '필수 조항을 먼저 동의해 주세요.',
      },
      {
        label: '동의 최신성 유지',
        icon: 'clock' as IconName,
        done: !isOutdated && !isContentOutdated,
        detail:
          !isOutdated && !isContentOutdated
            ? '버전과 본문 해시가 현재 상태와 일치해요.'
            : '버전 또는 해시가 변경되었으면 동기화가 필요합니다.',
      },
      {
        label: '동의 이력 남기기',
        icon: 'archive' as IconName,
        done: history.length > 0,
        detail:
          history.length > 0
            ? '동의 변경 이력이 남아있어요.'
            : '동의 조작 후 이력을 먼저 남겨 보세요.',
      },
      {
        label: '조항 탐색하기',
        icon: 'compass' as IconName,
        done: searchActionUsed || filterActionUsed || sectionLinkVisited,
        detail:
          searchActionUsed || filterActionUsed || sectionLinkVisited
            ? '탐색 동선이 기록돼요.'
            : '검색, 필터, 조항 이동 중 하나를 시도해 주세요.',
      },
    ],
    [
      filterActionUsed,
      history.length,
      isContentOutdated,
      isOutdated,
      isReady,
      searchActionUsed,
      sectionLinkVisited,
    ]
  )

  const sectionLink = (sectionId: TermsSectionId) => {
    const params = new URLSearchParams(searchParams)
    if (filter === 'all') {
      params.delete('filter')
    } else {
      params.set('filter', filter)
    }
    params.set('section', sectionId)
    return `/policies${params.toString() ? `?${params.toString()}` : ''}`
  }

  const trackSectionJump = useCallback(
    (sectionId: TermsSectionId) => {
      recordTermsAction('section-jump', `조항 항목 이동: ${sectionId}`)
    },
    [recordTermsAction]
  )

  useEffect(() => {
    if (!focusedSection) return
    const element = document.getElementById(focusedSection)
    if (!element) return
    const id = globalThis.setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => globalThis.clearTimeout(id)
  }, [focusedSection])

  useEffect(() => {
    if (!tutorialStep) return
    addTutorialStep(tutorialStep)
  }, [tutorialStep])

  const syncQueryParams = (next: { q: string; filter: FilterMode }) => {
    const params = new URLSearchParams(searchParams)
    const trimmedSearch = next.q.trim()

    if (next.filter !== filter) {
      recordTermsAction('filter', `조항 필터 변경: ${next.filter}`)
    }

    if (trimmedSearch && trimmedSearch !== search.trim()) {
      recordTermsAction('search', `조항 검색: ${trimmedSearch}`)
    }

    if (!trimmedSearch && search.trim()) {
      recordTermsAction('search-reset', '조항 검색 초기화')
    }

    if (next.filter === 'all') {
      params.delete('filter')
    } else {
      params.set('filter', next.filter)
    }
    if (next.q) {
      params.set('q', next.q)
    } else {
      params.delete('q')
    }
    setSearchParams(params, { replace: true })
  }

  const applyAgreement = (next: TermsSectionId[]) => {
    const normalized = Array.from(new Set(next)).filter((item): item is TermsSectionId =>
      [...TERMS_REQUIRED_SECTION_IDS, 'cancel', 'noshow'].includes(item)
    )
    const nextState = saveTermsAgreement(normalized)
    setAgreedIds(nextState.agreedIds)
    setVersion(nextState.version)
    setUpdatedAt(nextState.updatedAt)
    setHistory(readTermsConsentHistory())
    refreshActionLogs()
  }

  const toggleSection = (sectionId: TermsSectionId, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...agreedIds, sectionId]))
      : agreedIds.filter((item) => item !== sectionId)
    recordTermsAction(checked ? 'agree' : 'disagree', `${sectionId} ${checked ? '동의' : '미동의'}`)
    applyAgreement(next)
  }

  const agreeRequired = () => {
    recordTermsAction('agree', '필수 조항 일괄 동의')
    applyAgreement(Array.from(new Set([...agreedIds, ...TERMS_REQUIRED_SECTION_IDS])))
    if (isTutorialMode) {
      addTutorialStep('policies')
    }
  }

  const syncVersion = () => {
    recordTermsAction('sync', '버전 동기화')
    applyAgreement(agreedIds)
    if (isTutorialMode) {
      addTutorialStep('policies-sync')
    }
  }

  const agreeAll = () => {
    recordTermsAction('agree', '전체 조항 동의')
    applyAgreement([...TERMS_REQUIRED_SECTION_IDS, 'cancel', 'noshow'])
    if (isTutorialMode) {
      addTutorialStep('policies')
    }
  }

  const resetAgreement = () => {
    recordTermsAction('reset', '동의 초기화')
    applyAgreement([])
  }

  const copySummary = async () => {
    const text = [
      'Rotifolk 정책 동의 요약',
      `콘텐츠 해시: ${currentEvidence.contentHash}`,
      `버전: ${version}`,
      `필수 동의율: ${requiredRate}%`,
      `전체 동의율: ${totalRate}%`,
      `마지막 동의: ${lastUpdated}`,
      `동의 항목: ${agreedIds.join(', ') || '없음'}`,
    ].join('\n')
    if (!navigator?.clipboard) return
    try {
      await navigator.clipboard.writeText(text)
      recordTermsAction('copy-success', '동의 요약 복사')
    } catch {
      recordTermsAction('copy-failed', '동의 요약 복사 실패')
    }
  }

  const exportReceipt = useCallback(async () => {
    const timestamp = Date.now()
    const payload = {
      generatedAt: timestamp,
      version,
      isVersionOutdated: isOutdated,
      isContentOutdated,
      agreedIds,
      requiredRate,
      totalRate,
      hash: currentEvidence.contentHash,
      sectionHashes: currentEvidence.sectionHashes,
      lastUpdatedAt: updatedAt,
      history: history.slice(-5).map((item) => ({
        version: item.version,
        updatedAt: item.updatedAt,
        requiredRate: item.requiredRate,
        totalRate: item.totalRate,
        hash: item.evidence?.contentHash,
      })),
      activity: actionLogs.slice(-6).map((entry) => ({
        at: entry.at,
        action: entry.action,
        label: entry.label,
      })),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `rotifolk-terms-evidence-${timestamp}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    recordTermsAction('export-evidence', '동의 증빙 저장')
    if (isTutorialMode) {
      addTutorialStep('policies-sync')
    }
  }, [
    agreedIds,
    actionLogs,
    history,
    isOutdated,
    isContentOutdated,
    requiredRate,
    totalRate,
    updatedAt,
    version,
    currentEvidence,
    isTutorialMode,
    recordTermsAction,
  ])

  return (
    <div className={`container ${styles.page}`} id="policies-top">
      <header className={styles.head}>
        <span className={styles.kicker}>
          <Icon name="shield" size={1} aria-hidden="true" />
          ROTIFOLK POLICIES
        </span>
        <h1 className={styles.title}>이용 · 환불 · 개인정보 정책</h1>
        <p className={styles.sub}>
          누구나 안심하고 동네 로테이션 모임을 열고 참여할 수 있도록 정한 약속이에요. 동의 상태는 이
          페이지에서 바로 관리할 수 있어요.
        </p>
        <div className={styles.footerLinks} aria-label="약관 전문">
          <Link to="/terms">이용약관 전문</Link>
          <span aria-hidden="true">·</span>
          <Link to="/privacy">개인정보처리방침 전문</Link>
          <span aria-hidden="true">·</span>
          <Link to="/cancel-policy">환불 정책 전문</Link>
        </div>
      </header>

      <section className={styles.statusPanel} aria-label="약관 동의 상태">
        <div className={styles.statusRow}>
          <span className={styles.statusItem}>
            정책 버전 <strong>{version}</strong> · 마지막 업데이트 {POLICIES_TERMS_VERSION_DATE}
          </span>
          <span className={styles.statusItem}>마지막 저장 {lastUpdated}</span>
          <span
            className={`${styles.statusChip} ${isOutdated ? styles.statusChipWarn : styles.statusChipOk}`}
          >
            <Icon name={isOutdated ? 'bell' : 'check'} size={0.9} aria-hidden="true" />
            {isOutdated ? '버전 갱신 필요' : '최신 버전 반영 완료'}
          </span>
        </div>

        <div className={styles.progressGrid}>
          <div>
            <div className={styles.progressLabel}>
              <span>필수 조항 동의율</span>
              <span>{requiredRate}%</span>
            </div>
            <div className={styles.progressTrack} aria-hidden="true">
              <span style={{ width: `${requiredRate}%` }} />
            </div>
          </div>
          <div>
            <div className={styles.progressLabel}>
              <span>전체 조항 동의율</span>
              <span>{totalRate}%</span>
            </div>
            <div className={styles.progressTrack} aria-hidden="true">
              <span style={{ width: `${totalRate}%` }} />
            </div>
          </div>
        </div>

        <div className={styles.policyActions}>
          <Button size="sm" variant={isReady ? 'secondary' : 'primary'} onClick={agreeRequired}>
            필수 조항 동의
          </Button>
          <Button size="sm" variant="soft" onClick={agreeAll}>
            전체 조항 동의
          </Button>
          <Button size="sm" variant="soft" onClick={syncVersion}>
            버전 동기화
          </Button>
          <Button size="sm" variant="soft" onClick={exportReceipt}>
            약관 증빙 저장
          </Button>
          <Button size="sm" variant="ghost" onClick={resetAgreement}>
            동의 초기화
          </Button>
          <Button size="sm" variant="ghost" onClick={copySummary}>
            동의 요약 복사
          </Button>
        </div>

        {!isReady && (
          <p className={styles.statusWarn} role="note">
            <Icon name="bell" size={0.9} aria-hidden="true" />
            필수 동의가 필요해요: {missingRequired.join(', ')}
          </p>
        )}
        {isContentOutdated ? (
          <p className={styles.statusWarn} role="note">
            <Icon name="bell" size={0.9} aria-hidden="true" />
            정책 본문 해시가 최신 기준과 다릅니다. 문구 변경이 있을 수 있으니 동의 상태를 동기화해
            주세요.
          </p>
        ) : (
          <p className={styles.statusOk}>
            <Icon name="check" size={0.9} aria-hidden="true" />
            정책 본문 무결성: {formatHash(latestEvidence.contentHash)}
          </p>
        )}
      </section>

      <section className={styles.readinessPanel} aria-label="약관 진입 체크리스트">
        <h2 className={styles.readinessTitle}>
          <Icon name="check" size={1} aria-hidden="true" />
          커뮤니티 진입 준비 체크
        </h2>
        <p className={styles.readinessLead}>
          커뮤니티/튜토리얼 동작을 원활하게 진행하려면 동의 상태, 최신성, 탐색 로그가 필요해요.
        </p>
        <ul className={styles.readinessList}>
          {policyReadinessChecks.map((check) => (
            <li
              key={check.label}
              className={`${styles.readinessItem} ${check.done ? styles.readinessDone : styles.readinessPending}`}
            >
              <span className={styles.readinessIcon}>
                <Icon name={check.done ? 'check' : check.icon} size={1} aria-hidden="true" />
              </span>
              <span>{check.label}</span>
              <small>{check.detail}</small>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.filterPanel} aria-label="조항 탐색">
        <Input
          type="search"
          placeholder="조항명을 검색해 주세요"
          value={search}
          onChange={(event) => {
            const next = event.currentTarget.value
            setSearch(next)
            syncQueryParams({ q: next, filter })
          }}
        />
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${filter === 'all' ? styles.tabActive : ''}`}
            onClick={() => {
              setFilter('all')
              syncQueryParams({ q: search, filter: 'all' })
            }}
          >
            전체 ({TERMS_REQUIRED_SECTION_IDS.length + 2})
          </button>
          <button
            type="button"
            className={`${styles.tab} ${filter === 'required' ? styles.tabActive : ''}`}
            onClick={() => {
              setFilter('required')
              syncQueryParams({ q: search, filter: 'required' })
            }}
          >
            필수 ({TERMS_REQUIRED_SECTION_IDS.length})
          </button>
          <button
            type="button"
            className={`${styles.tab} ${filter === 'optional' ? styles.tabActive : ''}`}
            onClick={() => {
              setFilter('optional')
              syncQueryParams({ q: search, filter: 'optional' })
            }}
          >
            선택
          </button>
        </div>
      </section>

      {visibleSections.length > 0 ? (
        <nav className={styles.toc} aria-label="조항 목차">
          <span className={styles.tocLabel}>조항 바로가기</span>
          {visibleSections.map((section) => (
            <Link
              key={`${section.id}-toc`}
              to={`${sectionLink(section.id)}#${section.id}`}
              className={styles.tocLink}
              onClick={() => trackSectionJump(section.id)}
            >
              {section.iconName ? (
                <Icon name={section.iconName} size={0.9} aria-hidden="true" />
              ) : (
                <span aria-hidden="true">{section.icon}</span>
              )}
              {section.title}
            </Link>
          ))}
        </nav>
      ) : null}

      <section className={styles.sections}>
        {visibleSections.length === 0 ? (
          <p className={styles.emptyResult}>검색어에 맞는 항목이 없어요.</p>
        ) : (
          visibleSections.map((section) => (
            <article key={section.id} id={section.id} className={styles.section}>
              <label
                className={styles.sectionHead}
                htmlFor={`${section.id}-agree`}
                aria-label={`${section.title} 동의 ${section.required ? '필수' : '선택'} 항목`}
              >
                <div className={styles.sectionTitleWrap}>
                  <input
                    id={`${section.id}-agree`}
                    type="checkbox"
                    className={styles.sectionCheck}
                    checked={agreedIds.includes(section.id)}
                    onChange={(event) => toggleSection(section.id, event.currentTarget.checked)}
                  />
                  {section.iconName ? (
                    <Icon name={section.iconName} aria-hidden="true" />
                  ) : (
                    <span className={styles.sectionEmoji} aria-hidden="true">
                      {section.icon}
                    </span>
                  )}
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                </div>
                <span
                  className={`${styles.scopeBadge} ${
                    section.required ? styles.scopeRequired : styles.scopeOptional
                  }`}
                >
                  {section.required ? '필수' : '선택'}
                </span>
              </label>
              <div className={styles.sectionBody}>{section.body}</div>
              <p className={styles.sectionBack}>
                <Icon name="chevron-right" size={0.9} aria-hidden="true" />
                <Link
                  to={`${sectionLink(section.id)}#${section.id}`}
                  onClick={() => trackSectionJump(section.id)}
                >
                  해당 조항 이동
                </Link>
              </p>
            </article>
          ))
        )}
      </section>

      <section className={styles.metaCards}>
        <div>
          <h3>
            <Icon name="archive" size={1} aria-hidden="true" />
            동의 이력
          </h3>
          <ul>
            {history.length === 0 ? (
              <li>아직 기록이 없어요.</li>
            ) : (
              history
                .slice(-3)
                .reverse()
                .map((item) => (
                  <li key={`${item.version}-${item.updatedAt}`}>
                    {formatDate(item.updatedAt)} · 필수 {item.requiredRate}% · 전체 {item.totalRate}
                    %
                  </li>
                ))
            )}
          </ul>
        </div>
        <div>
          <h3>
            <Icon name="shield" size={1} aria-hidden="true" />
            약관 증빙
          </h3>
          <ul>
            <li>콘텐츠 해시: {formatHash(latestEvidence.contentHash)}</li>
            <li>
              필수 동의율/전체 동의율: {requiredRate}% / {totalRate}%
            </li>
            <li>해시 기준 일치: {isContentOutdated ? '미일치' : '동일'}</li>
            <li>추적 가능 조항 수: {Object.keys(latestEvidence.sectionHashes).length}개</li>
          </ul>
        </div>
        <div>
          <h3>
            <Icon name="clock" size={1} aria-hidden="true" />
            최근 활동
          </h3>
          <ul>
            {actionLogs.length === 0 ? (
              <li>아직 활동 로그가 없어요.</li>
            ) : (
              actionLogs.slice(-4).map((item) => (
                <li key={item.id}>
                  <span>{formatDate(item.at)}</span>
                  <span> · {item.action}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <p className={styles.footer}>
        마지막 업데이트 {POLICIES_TERMS_VERSION_DATE} · 문의는 인앱 문의 폼으로 보내주세요. 접수가
        안 될 때는{' '}
        <a href={SUPPORT_URL} target="_blank" rel="noreferrer">
          외부 지원 보드
        </a>
        가 폴백이에요.
      </p>

      <div className={styles.footerLinks}>
        <Link to={backTarget}>이전 단계로 돌아가기</Link>
        <span aria-hidden="true">·</span>
        <Link to="/support?category=contact">사이트 문의</Link>
        <span aria-hidden="true">·</span>
        <Link to="/support?category=partnership">제휴 문의</Link>
        <span aria-hidden="true">·</span>
        <Link to="/support?category=bug">버그 제보</Link>
        <span aria-hidden="true">·</span>
        <Link
          to={
            isTutorialMode
              ? `/help?topic=guest&fromTutorial=help&from=${encodeURIComponent(currentPath || '/')}`
              : `/help?topic=guest&from=${encodeURIComponent(currentPath || '/')}`
          }
        >
          FAQ 시작 가이드
        </Link>
        <span aria-hidden="true">·</span>
        <Link
          to={
            isTutorialMode
              ? `/tutorial?focus=${tutorialStep === 'policies-sync' ? 'policies-sync' : 'policies'}&fromTutorial=${tutorialStep ?? 'policies'}&from=${encodeURIComponent(currentPath || '/')}`
              : `/tutorial?focus=policies&from=${encodeURIComponent(currentPath || '/')}`
          }
        >
          약관 체크 단계로
        </Link>
        <span aria-hidden="true">·</span>
        <Link
          to={
            isTutorialMode
              ? `/community?guide=1&fromTutorial=community&from=${encodeURIComponent(currentPath || '/')}`
              : `/community?guide=1&from=${encodeURIComponent(currentPath || '/')}`
          }
        >
          커뮤니티 첫 질문
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/discover">파티 탐색하러 가기</Link>
      </div>
    </div>
  )
}
