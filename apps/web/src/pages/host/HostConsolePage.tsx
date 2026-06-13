import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useHostedParties } from '@features/parties/queries'
import { useAuthStore } from '@store/authStore'
import { PartyCard } from '@features/parties/PartyCard'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Chip } from '@components/ui/Chip/Chip'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { Icon, type IconName } from '@components/ui/Icon/Icon'
import { api } from '@services/api'
import { REVENUE_MONITORING_POLICY } from '@rotifolk/shared'
import styles from './HostConsole.module.css'

type StatusFilter = 'all' | 'live' | 'open' | 'ended'
type HostSummaryCompareMode = 'none' | 'previous_period' | 'previous_month' | 'previous_year'

interface HostRevenueSummary {
  totalKRW: number
  paidCount: number
  totalPaidCount: number
  totalRefundedCount: number
  totalTickets: number
  avgTicketKRW: number
  refundRatePercent: number
  partyCount: number
  refundedKRW: number
  platformFeePercent: number
  refundRetentionPercent: number
  platformFeeKRW: number
  refundRetentionKRW: number
  hostPayoutKRW: number
  previousPeriod: HostRevenueTrend | null
  comparison: HostRevenueComparison
  rangeFrom: string | null
  rangeTo: string | null
  recent: Array<{
    partyId: string
    partyTitle: string
    totalKRW: number
    paidCount: number
    refundedCount: number
    refundedKRW: number
    grossTicketCount: number
    refundRatePercent: number
    platformFeeKRW: number
    hostPayoutKRW: number
  }>
}

interface HostRevenueTrend {
  totalKRW: number
  paidCount: number
  totalPaidCount: number
  totalRefundedCount: number
  totalTickets: number
  avgTicketKRW: number
  refundRatePercent: number
  refundedKRW: number
  platformFeeKRW: number
  refundRetentionKRW: number
  hostPayoutKRW: number
  partyCount: number
}

interface HostRevenueComparison {
  mode: HostSummaryCompareMode
  enabled: boolean
  rangeFrom: string | null
  rangeTo: string | null
}

interface HostTrendKpiItem {
  label: string
  currentValue: number
  previousValue: number
  unit: 'currency' | 'percent' | 'count'
  percentDelta: number | null
  isRatePoint?: boolean
}

function compareModeLabel(mode: HostSummaryCompareMode) {
  switch (mode) {
    case 'previous_month':
      return '전월 대비'
    case 'previous_year':
      return '전년 대비'
    case 'none':
      return '비교 미사용'
    case 'previous_period':
    default:
      return '직전 기간 대비'
  }
}

function formatDeltaPercent(delta: number | null, asRatePoint = false): string {
  if (delta === null) return '비교 불가'
  const rounded = Math.round(delta * 10) / 10
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded.toFixed(1)}${asRatePoint ? 'pp' : '%'}`
}

function trendTone(delta: number | null): 'up' | 'down' | 'flat' | 'none' {
  if (delta === null) return 'none'
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'flat'
}

function parseMonitorTone(rate: number) {
  const { warningRefundRatePercent, dangerRefundRatePercent } =
    REVENUE_MONITORING_POLICY.healthAlerts
  if (rate >= dangerRefundRatePercent) return 'danger'
  if (rate >= warningRefundRatePercent) return 'warning'
  return null
}

function formatTrendValue(value: number, unit: 'currency' | 'percent' | 'count') {
  if (unit === 'percent') return `${value.toFixed(1)}%`
  if (unit === 'count') return `${value.toLocaleString()}건`
  return `${value.toLocaleString()}원`
}

function parsePercentInput(value: string): number | null {
  const text = value.trim()
  if (text.length === 0) return null
  const parsed = Number(text)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null
  return parsed
}

function parseMoneyInput(value: string): number | null {
  const text = value.trim()
  if (text.length === 0) return null
  const parsed = Number(text)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

function clampPercentToRange(value: number) {
  return Math.max(0, Math.min(100, value))
}

function calcSummaryDays(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null
  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const deltaMs = end.getTime() - start.getTime()
  if (deltaMs < 0) return null
  return Math.floor(deltaMs / (1000 * 60 * 60 * 24)) + 1
}

export default function HostConsolePage() {
  const user = useAuthStore((s) => s.user)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [summaryFrom, setSummaryFrom] = useState('')
  const [summaryTo, setSummaryTo] = useState('')
  const [summaryPartyId, setSummaryPartyId] = useState('')
  const [summaryCompareMode, setSummaryCompareMode] =
    useState<HostSummaryCompareMode>('previous_period')
  const [scenarioPlatformFeePercent, setScenarioPlatformFeePercent] = useState('')
  const [scenarioRefundPercent, setScenarioRefundPercent] = useState('')
  const [targetPayoutAmount, setTargetPayoutAmount] = useState('')
  const { data, isLoading } = useHostedParties()
  const summaryQueryParams = useMemo(() => {
    const params: Record<string, string> = {}
    if (summaryFrom) params.from = summaryFrom
    if (summaryTo) params.to = summaryTo
    if (summaryPartyId) params.partyId = summaryPartyId
    if (summaryCompareMode) params.compareMode = summaryCompareMode
    return params
  }, [summaryPartyId, summaryCompareMode, summaryFrom, summaryTo])
  const isSummaryRangeValid = !summaryFrom || !summaryTo || summaryFrom <= summaryTo
  const { data: revenue } = useQuery({
    queryKey: [
      'payments',
      'host',
      'summary',
      summaryFrom,
      summaryTo,
      summaryPartyId,
      summaryCompareMode,
    ],
    queryFn: () =>
      api.get<HostRevenueSummary>('payments/host/summary', { searchParams: summaryQueryParams }),
    enabled: isSummaryRangeValid,
  })

  useEffect(() => {
    if (!revenue) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      if (scenarioPlatformFeePercent === '') {
        setScenarioPlatformFeePercent(String(revenue.platformFeePercent))
      }
      if (scenarioRefundPercent === '') {
        setScenarioRefundPercent(String(revenue.refundRetentionPercent))
      }
    })
    return () => {
      cancelled = true
    }
  }, [revenue, scenarioPlatformFeePercent, scenarioRefundPercent])

  const summaryRangeLabelFrom = summaryFrom ? new Date(summaryFrom).toLocaleDateString('ko-KR') : ''
  const summaryRangeLabelTo = summaryTo ? new Date(summaryTo).toLocaleDateString('ko-KR') : ''

  const setSummaryRange = (days: number) => {
    const to = new Date()
    const from = new Date()
    from.setDate(to.getDate() - (days - 1))
    setSummaryTo(to.toISOString().slice(0, 10))
    setSummaryFrom(from.toISOString().slice(0, 10))
  }
  const clearSummaryFilter = () => {
    setSummaryFrom('')
    setSummaryTo('')
    setSummaryPartyId('')
    setSummaryCompareMode('previous_period')
  }

  const total = data?.length ?? 0
  const live = data?.filter((p) => p.status === 'live').length ?? 0
  const open = data?.filter((p) => p.status === 'open').length ?? 0
  const totalPayout = revenue?.hostPayoutKRW ?? 0
  const platformFee = revenue?.platformFeeKRW ?? 0
  const refundRetention = revenue?.refundRetentionKRW ?? 0
  const paidCount = revenue?.paidCount ?? 0
  const totalRefunded = revenue?.totalRefundedCount ?? 0
  const totalTickets = revenue?.totalTickets ?? 0
  const avgTicket = revenue?.avgTicketKRW ?? 0
  const partyCount = revenue?.partyCount ?? 0
  const refundRate = revenue?.refundRatePercent ?? 0
  const parsedPlatformFee = parsePercentInput(scenarioPlatformFeePercent)
  const parsedRefundPercent = parsePercentInput(scenarioRefundPercent)
  const hasHostScenario = parsedPlatformFee !== null && parsedRefundPercent !== null && !!revenue
  const hostScenarioPlatformFeeKRW =
    revenue && hasHostScenario ? Math.round((revenue.totalKRW * parsedPlatformFee) / 100) : null
  const hostScenarioRefundRetentionKRW =
    revenue && hasHostScenario
      ? Math.round((revenue.refundedKRW * parsedRefundPercent) / 100)
      : null
  const hostScenarioPlatformRevenueKRW =
    hostScenarioPlatformFeeKRW !== null && hostScenarioRefundRetentionKRW !== null
      ? hostScenarioPlatformFeeKRW + hostScenarioRefundRetentionKRW
      : null
  const hostScenarioPayoutKRW =
    revenue && hostScenarioPlatformFeeKRW !== null
      ? Math.max(revenue.totalKRW - hostScenarioPlatformFeeKRW, 0)
      : null
  const scenarioHostPayoutDelta =
    hostScenarioPayoutKRW !== null ? hostScenarioPayoutKRW - totalPayout : null
  const scenarioHostPlatformRevenueDelta =
    hostScenarioPlatformRevenueKRW !== null
      ? hostScenarioPlatformRevenueKRW - (platformFee + refundRetention)
      : null
  const scenarioPlatformShareRate =
    revenue?.totalKRW && hostScenarioPlatformRevenueKRW !== null
      ? Math.round((hostScenarioPlatformRevenueKRW / revenue.totalKRW) * 1000) / 10
      : null
  const scenarioHostShareRate =
    revenue?.totalKRW && hostScenarioPayoutKRW !== null
      ? Math.round((hostScenarioPayoutKRW / revenue.totalKRW) * 1000) / 10
      : null
  const parsedTargetPayoutAmount = parseMoneyInput(targetPayoutAmount)
  const hostScenarioTargetPayoutReachedRate =
    parsedTargetPayoutAmount !== null &&
    hostScenarioPayoutKRW !== null &&
    parsedTargetPayoutAmount > 0
      ? (hostScenarioPayoutKRW / parsedTargetPayoutAmount) * 100
      : null
  const hostScenarioTargetPayoutGap =
    parsedTargetPayoutAmount !== null && hostScenarioPayoutKRW !== null
      ? hostScenarioPayoutKRW - parsedTargetPayoutAmount
      : null
  const summaryDaysInRange = calcSummaryDays(summaryFrom, summaryTo)
  const hasSummaryPeriod =
    !!summaryFrom && !!summaryTo && isSummaryRangeValid && summaryDaysInRange !== null
  const hostScenarioDailyPayout =
    hasHostScenario && hasSummaryPeriod && hostScenarioPayoutKRW !== null
      ? hostScenarioPayoutKRW / (summaryDaysInRange ?? 0)
      : null
  const targetPayoutShortfall =
    parsedTargetPayoutAmount !== null && hostScenarioPayoutKRW !== null
      ? Math.max(0, parsedTargetPayoutAmount - hostScenarioPayoutKRW)
      : null
  const targetPayoutTargetToReachDays =
    targetPayoutShortfall === null || targetPayoutShortfall <= 0 || !hostScenarioDailyPayout
      ? null
      : Math.ceil(targetPayoutShortfall / hostScenarioDailyPayout)
  const targetPayoutReachDate = targetPayoutTargetToReachDays
    ? (() => {
        const date = new Date()
        date.setDate(date.getDate() + targetPayoutTargetToReachDays)
        return date.toLocaleDateString('ko-KR')
      })()
    : null
  const targetPayoutTransactionsEstimate =
    targetPayoutShortfall === null || targetPayoutShortfall <= 0
      ? null
      : paidCount > 0 && hasHostScenario && hostScenarioPayoutKRW !== null
        ? Math.ceil(targetPayoutShortfall / (hostScenarioPayoutKRW / Math.max(paidCount, 1)))
        : null
  const targetFeeForPayout =
    revenue?.totalKRW && parsedTargetPayoutAmount !== null && revenue.totalKRW > 0
      ? clampPercentToRange(
          ((revenue.totalKRW - parsedTargetPayoutAmount) / revenue.totalKRW) * 100,
        )
      : null
  const targetFeeReachable =
    hostScenarioPayoutKRW !== null &&
    parsedTargetPayoutAmount !== null &&
    revenue?.totalKRW !== undefined &&
    revenue.totalKRW > 0 &&
    parsedTargetPayoutAmount <= revenue.totalKRW &&
    targetFeeForPayout !== null &&
    targetFeeForPayout >= 0 &&
    targetFeeForPayout <= 100

  const previousPeriod = revenue?.previousPeriod ?? null
  const comparisonMeta = revenue?.comparison ?? {
    mode: summaryCompareMode,
    enabled: false,
    rangeFrom: null,
    rangeTo: null,
  }
  const comparisonLabel = compareModeLabel(comparisonMeta.mode)
  const hasPreviousPeriod = !!previousPeriod && comparisonMeta.enabled
  const calcDelta = (currentValue: number, previousValue: number): number | null =>
    previousValue === 0 ? null : ((currentValue - previousValue) / previousValue) * 100
  const trendComparisonKpis = useMemo<HostTrendKpiItem[]>(
    () =>
      !hasPreviousPeriod || !previousPeriod
        ? []
        : [
            {
              label: '총 매출',
              currentValue: revenue?.totalKRW ?? 0,
              previousValue: previousPeriod.totalKRW,
              unit: 'currency',
              percentDelta: calcDelta(revenue?.totalKRW ?? 0, previousPeriod.totalKRW),
            },
            {
              label: '플랫폼 수수료',
              currentValue: platformFee,
              previousValue: previousPeriod.platformFeeKRW,
              unit: 'currency',
              percentDelta: calcDelta(platformFee, previousPeriod.platformFeeKRW),
            },
            {
              label: '환불 보전',
              currentValue: refundRetention,
              previousValue: previousPeriod.refundRetentionKRW,
              unit: 'currency',
              percentDelta: calcDelta(refundRetention, previousPeriod.refundRetentionKRW),
            },
            {
              label: '호스트 정산',
              currentValue: totalPayout,
              previousValue: previousPeriod.hostPayoutKRW,
              unit: 'currency',
              percentDelta: calcDelta(totalPayout, previousPeriod.hostPayoutKRW),
            },
            {
              label: '환불률',
              currentValue: refundRate,
              previousValue: previousPeriod.refundRatePercent,
              unit: 'percent',
              percentDelta: refundRate - previousPeriod.refundRatePercent,
              isRatePoint: true,
            },
            {
              label: '총 거래 건수',
              currentValue: totalTickets,
              previousValue: previousPeriod.totalTickets,
              unit: 'count',
              percentDelta: calcDelta(totalTickets, previousPeriod.totalTickets),
            },
          ],
    [
      hasPreviousPeriod,
      previousPeriod,
      platformFee,
      refundRate,
      refundRetention,
      revenue?.totalKRW,
      totalPayout,
      totalTickets,
    ],
  )

  if (isLoading) return <Loading />

  const filteredParties =
    statusFilter === 'all'
      ? (data ?? [])
      : (data ?? []).filter((p) => {
          if (statusFilter === 'ended') return p.status !== 'live' && p.status !== 'open'
          return p.status === statusFilter
        })

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <div className={styles.headIntro}>
          <span className={styles.kicker}>HOST CONSOLE</span>
          <h1 className={styles.title}>
            안녕하세요, <span className={styles.accent}>{user?.nickname}</span> 호스트님
          </h1>
          <p className={styles.lead}>오늘의 라운드를 준비해 볼까요?</p>
        </div>
        <div className={styles.headActions}>
          <Link to="/host/create" className={styles.actionLink}>
            <Button variant="primary" size="lg" leftIcon={<Icon name="plus" />}>
              새 파티 열기
            </Button>
          </Link>
          <Link to="/host/sourcing" className={styles.actionLink}>
            <Button variant="gold" size="lg" leftIcon={<Icon name="pin" />}>
              공간 섭외 스튜디오
            </Button>
          </Link>
          <Link to="/host/space" className={styles.actionLink}>
            <Button variant="outline" size="lg" leftIcon={<Icon name="home" />}>
              내 가게로 호스팅
            </Button>
          </Link>
        </div>
      </header>

      <section className={`container ${styles.stageLedger}`} aria-label="호스팅 현황">
        <span className={styles.stageLedgerCaption}>스테이지 현황</span>
        <dl className={styles.ledger}>
          <StageRow label="진행 중인 파티" value={live} active={live > 0} icon="live" />
          <StageRow label="모집 중인 파티" value={open} icon="moon" />
          <StageRow label="총 호스팅 횟수" value={total} icon="sparkle" />
        </dl>
      </section>

      <section className="container">
        <details className={styles.revenueDisclosure}>
          <summary className={styles.revenueSummary}>
            <span className={styles.revenueSummaryMain}>
              <Icon name="sparkle" aria-hidden />
              정산·매출 자세히 보기
            </span>
            <span className={styles.revenueSummaryNote}>최근 12개 파티 기준 정산</span>
            <Icon name="chevron-right" className={styles.revenueSummaryChevron} aria-hidden />
          </summary>
          <Card padding="lg" variant="gradient" className={styles.revenueCard}>
            <div className={styles.revenueFilter}>
              <label className={styles.filterField}>
                <span>비교 모드</span>
                <select
                  value={summaryCompareMode}
                  onChange={(event) =>
                    setSummaryCompareMode(event.target.value as HostSummaryCompareMode)
                  }
                >
                  <option value="previous_period">직전 기간</option>
                  <option value="previous_month">전월</option>
                  <option value="previous_year">전년</option>
                  <option value="none">비교 미사용</option>
                </select>
              </label>
              <label className={styles.filterField}>
                <span>조회 시작</span>
                <input
                  type="date"
                  value={summaryFrom}
                  onChange={(event) => setSummaryFrom(event.target.value)}
                />
              </label>
              <label className={styles.filterField}>
                <span>조회 종료</span>
                <input
                  type="date"
                  value={summaryTo}
                  onChange={(event) => setSummaryTo(event.target.value)}
                />
              </label>
              <label className={styles.filterField}>
                <span>파티 필터(ID)</span>
                <input
                  type="text"
                  value={summaryPartyId}
                  onChange={(event) => setSummaryPartyId(event.target.value.trim())}
                  placeholder="예: p_abc123"
                  maxLength={40}
                />
              </label>
              <div className={styles.filterActions}>
                <Button variant="ghost" size="sm" onClick={() => setSummaryRange(7)}>
                  최근 7일
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSummaryRange(30)}>
                  최근 30일
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSummaryFilter}>
                  전체
                </Button>
              </div>
              <div className={styles.filterActions}>
                <Button variant="ghost" size="sm" onClick={() => setSummaryTo('')}>
                  종료일 초기화
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSummaryFrom('')}>
                  시작일 초기화
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSummaryPartyId('')}>
                  파티 필터 초기화
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSummaryCompareMode('previous_period')}
                >
                  비교 모드 초기화
                </Button>
              </div>
            </div>

            {!isSummaryRangeValid ? (
              <p className={styles.sectionHint}>시작일이 종료일보다 늦으면 안 돼요.</p>
            ) : summaryFrom || summaryTo || summaryPartyId ? (
              <p className={styles.sectionNote}>
                조회 구간: {summaryRangeLabelFrom || '전체 시작'} ~{' '}
                {summaryRangeLabelTo || '전체 종료'}· {comparisonLabel}· 이전 구간 적용{' '}
                {comparisonMeta.enabled ? '예' : '아니오'}
                {summaryPartyId ? ` · 파티 ${summaryPartyId}` : ''}
                {comparisonMeta.rangeFrom
                  ? ` · 비교 ${comparisonMeta.rangeFrom} ~ ${comparisonMeta.rangeTo ?? '미적용'}`
                  : ''}
              </p>
            ) : null}

            <div className={styles.revenueStats}>
              <div className={`${styles.revenueStat} ${styles.revenueStatHero}`}>
                <span className={styles.revenueLabel}>누적 매출</span>
                <strong className={styles.revenueValue}>
                  {(revenue?.totalKRW ?? 0).toLocaleString()}원
                </strong>
              </div>
              <div className={styles.revenueStat}>
                <span className={styles.revenueLabel}>플랫폼 수수료</span>
                <strong className={styles.revenueValue}>
                  {platformFee.toLocaleString()}원
                  <span className={styles.revenueSubBadge}>
                    ({(revenue?.platformFeePercent ?? 0).toFixed(1)}%)
                  </span>
                </strong>
              </div>
              <div className={styles.revenueStat}>
                <span className={styles.revenueLabel}>환불 보전</span>
                <strong className={styles.revenueValue}>
                  {refundRetention.toLocaleString()}원
                  <span className={styles.revenueSubBadge}>
                    ({(revenue?.refundRetentionPercent ?? 0).toFixed(1)}%)
                  </span>
                </strong>
              </div>
              <div className={styles.revenueStat}>
                <span className={styles.revenueLabel}>내 정산 예정액</span>
                <strong className={styles.revenueValue}>{totalPayout.toLocaleString()}원</strong>
              </div>
              <div className={styles.revenueStat}>
                <span className={styles.revenueLabel}>결제 건수</span>
                <strong className={styles.revenueValue}>{paidCount.toLocaleString()}건</strong>
              </div>
              <div className={styles.revenueStat}>
                <span className={styles.revenueLabel}>환불 건수</span>
                <strong className={styles.revenueValue}>{totalRefunded.toLocaleString()}건</strong>
              </div>
              <div className={styles.revenueStat}>
                <span className={styles.revenueLabel}>환불 금액</span>
                <strong className={styles.revenueValue}>
                  {(revenue?.refundedKRW ?? 0).toLocaleString()}원
                </strong>
              </div>
              <div className={styles.revenueStat}>
                <span className={styles.revenueLabel}>거래 건수</span>
                <strong className={styles.revenueValue}>{totalTickets.toLocaleString()}건</strong>
              </div>
              <div className={styles.revenueStat}>
                <span className={styles.revenueLabel}>환불률</span>
                <strong className={styles.revenueValue}>{refundRate.toFixed(1)}%</strong>
              </div>
              <div className={styles.revenueStat}>
                <span className={styles.revenueLabel}>평균 결제액</span>
                <strong className={styles.revenueValue}>{avgTicket.toLocaleString()}원</strong>
              </div>
              <div className={styles.revenueStat}>
                <span className={styles.revenueLabel}>운영 파티</span>
                <strong className={styles.revenueValue}>{partyCount.toLocaleString()}개</strong>
              </div>
              <div className={styles.revenueStat}>
                <span className={styles.revenueLabel}>정산 시뮬레이션</span>
                <div className={styles.scenarioForm}>
                  <label>
                    <span className={styles.scenarioLabel}>플랫폼 수수료(%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={scenarioPlatformFeePercent}
                      onChange={(event) => setScenarioPlatformFeePercent(event.target.value)}
                    />
                  </label>
                  <label>
                    <span className={styles.scenarioLabel}>환불보전(%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={scenarioRefundPercent}
                      onChange={(event) => setScenarioRefundPercent(event.target.value)}
                    />
                  </label>
                  {hasHostScenario && hostScenarioPayoutKRW !== null ? (
                    <span className={styles.scenarioOutput}>
                      수수료 {hostScenarioPlatformFeeKRW?.toLocaleString()}원 · 환불보전{' '}
                      {hostScenarioRefundRetentionKRW?.toLocaleString()}원
                      <br />
                      플랫폼 수익 {hostScenarioPlatformRevenueKRW?.toLocaleString()}원
                      <span
                        className={
                          scenarioHostPlatformRevenueDelta !== null &&
                          scenarioHostPlatformRevenueDelta > 0
                            ? styles.scenarioDeltaUp
                            : scenarioHostPlatformRevenueDelta !== null &&
                                scenarioHostPlatformRevenueDelta < 0
                              ? styles.scenarioDeltaDown
                              : ''
                        }
                      >
                        {' '}
                        (
                        {scenarioHostPlatformRevenueDelta !== null &&
                        scenarioHostPlatformRevenueDelta > 0
                          ? '+'
                          : ''}
                        {scenarioHostPlatformRevenueDelta?.toLocaleString()}원)
                      </span>
                      <br />
                      정산 {hostScenarioPayoutKRW.toLocaleString()}원
                      {scenarioHostPayoutDelta !== null ? (
                        <span
                          className={
                            scenarioHostPayoutDelta > 0
                              ? styles.scenarioDeltaUp
                              : scenarioHostPayoutDelta < 0
                                ? styles.scenarioDeltaDown
                                : ''
                          }
                        >
                          {' '}
                          ({scenarioHostPayoutDelta > 0 ? '+' : ''}
                          {scenarioHostPayoutDelta.toLocaleString()}원)
                        </span>
                      ) : null}
                      <br />
                      분배율{' '}
                      {scenarioPlatformShareRate !== null
                        ? `플랫폼 ${scenarioPlatformShareRate.toFixed(1)}%, 호스트 ${scenarioHostShareRate?.toFixed(1)}%`
                        : '계산 중'}
                    </span>
                  ) : (
                    <span className={styles.scenarioHint}>0~100 사이 비율을 입력해 주세요.</span>
                  )}
                  <div className={styles.goalSection}>
                    <label>
                      <span className={styles.scenarioLabel}>목표 정산액(원)</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={targetPayoutAmount}
                        onChange={(event) => setTargetPayoutAmount(event.target.value)}
                      />
                    </label>
                    {parsedTargetPayoutAmount === null ? (
                      <span className={styles.scenarioHint}>
                        목표 정산액을 입력하면 달성률을 계산해요.
                      </span>
                    ) : (
                      <div>
                        <p className={styles.scenarioOutput}>
                          목표 정산액 대비 달성률:{' '}
                          {hostScenarioTargetPayoutReachedRate === null
                            ? '-'
                            : `${hostScenarioTargetPayoutReachedRate.toFixed(1)}%`}
                          {hostScenarioTargetPayoutGap !== null
                            ? ` (${hostScenarioTargetPayoutGap >= 0 ? '+' : ''}${hostScenarioTargetPayoutGap.toLocaleString()}원)`
                            : ''}
                        </p>
                        {targetFeeForPayout !== null && parsedPlatformFee !== null ? (
                          <p className={styles.scenarioHint}>
                            목표 정산액 달성을 위해서는 수수료를{' '}
                            <strong>{targetFeeForPayout.toFixed(1)}%</strong>로 설정하는 게
                            필요해요.
                            {targetFeeReachable ? (
                              <>
                                {' '}
                                (현재 {parsedPlatformFee.toFixed(1)}% 대비{' '}
                                {targetFeeForPayout >= parsedPlatformFee ? '상향 ' : '하향 '}
                                {Math.abs(targetFeeForPayout - parsedPlatformFee).toFixed(1)}pp)
                              </>
                            ) : (
                              <span className={styles.scenarioDeltaDown}>
                                {' '}
                                목표 정산액이 현재 거래 합계(총매출)보다 큽니다.
                              </span>
                            )}
                          </p>
                        ) : null}
                        <div className={styles.goalSectionForecast}>
                          {hasHostScenario ? (
                            targetPayoutShortfall !== null && targetPayoutShortfall > 0 ? (
                              <>
                                <p className={styles.scenarioOutput}>
                                  추가로 필요한 정산액: {targetPayoutShortfall.toLocaleString()}원
                                </p>
                                {hasSummaryPeriod && targetPayoutTargetToReachDays !== null ? (
                                  <p className={styles.scenarioHint}>
                                    현재 조회 구간 기준 일평균 정산액{' '}
                                    {hostScenarioDailyPayout?.toLocaleString()}원을 기준으로
                                    {targetPayoutTargetToReachDays}일 안에 달성 가능해요. (예상
                                    달성일 {targetPayoutReachDate ?? '-'})
                                    {targetPayoutTransactionsEstimate !== null
                                      ? ` · 거래 건수 기준으로는 약 ${targetPayoutTransactionsEstimate.toLocaleString()}건 추가`
                                      : ''}
                                  </p>
                                ) : (
                                  <p className={styles.scenarioHint}>
                                    조회 구간(시작일/종료일) 기준을 지정하면 일자 기반 도달 시점을
                                    예측할 수 있어요.
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className={styles.scenarioOutput}>
                                목표 정산액을 이미 달성했어요.
                              </p>
                            )
                          ) : (
                            <p className={styles.scenarioHint}>
                              수수료/환불보전 입력값을 먼저 맞춰 주세요.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className={styles.filterActions}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTargetPayoutAmount(String(totalPayout))
                        }}
                        disabled={!revenue}
                      >
                        내 정산 기준 채우기
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTargetPayoutAmount('')}
                      >
                        초기화
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {hasPreviousPeriod ? (
              <div className={styles.compareSection}>
                <h3 className={styles.compareTitle}>
                  {comparisonLabel} 비교
                  <span className={styles.compareRange}>
                    · {comparisonMeta.rangeFrom ?? '미적용'} ~ {comparisonMeta.rangeTo ?? '미적용'}
                  </span>
                </h3>
                <div className={styles.compareStats}>
                  {trendComparisonKpis.map((kpi) => {
                    const trend = trendTone(kpi.percentDelta)
                    const deltaText = formatDeltaPercent(kpi.percentDelta, !!kpi.isRatePoint)
                    const currentText = formatTrendValue(kpi.currentValue, kpi.unit)
                    const previousText = formatTrendValue(kpi.previousValue, kpi.unit)
                    const deltaClassName =
                      trend === 'up'
                        ? styles.compareTrendUp
                        : trend === 'down'
                          ? styles.compareTrendDown
                          : trend === 'flat'
                            ? styles.compareTrendFlat
                            : styles.compareTrendNone

                    return (
                      <div key={kpi.label} className={styles.compareStat}>
                        <span className={styles.compareLabel}>{kpi.label}</span>
                        <strong className={styles.compareValue}>{currentText}</strong>
                        <div className={styles.compareMeta}>
                          <span className={styles.comparePrev}>이전 {previousText}</span>
                          <span className={`${styles.compareDelta} ${deltaClassName}`}>
                            {deltaText}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className={styles.revenueDivider} />

            {(revenue?.totalKRW ?? 0) === 0 ? (
              <p className={styles.revenueEmpty}>첫 모임이 결제되면 여기에 표시돼요</p>
            ) : (
              <ul className={styles.revenueList}>
                {revenue?.recent
                  .filter((r) => r.grossTicketCount > 0)
                  .map((r) => (
                    <li key={r.partyId} className={styles.revenueListItem}>
                      <div className={styles.revenueListTitleRow}>
                        <span className={styles.revenueListTitle} title={r.partyTitle}>
                          {r.partyTitle}
                        </span>
                        {(() => {
                          const tone = parseMonitorTone(r.refundRatePercent)
                          return tone ? (
                            <span
                              className={`${styles.refundBadge} ${
                                tone === 'danger'
                                  ? styles.refundBadgeDanger
                                  : styles.refundBadgeWarning
                              }`}
                            >
                              {tone === 'danger' ? '고위험 환불률' : '주의 환불률'}
                            </span>
                          ) : null
                        })()}
                      </div>
                      <div className={styles.revenueListMetaGroup}>
                        <span className={styles.revenueListMeta}>
                          매출 ₩{r.totalKRW.toLocaleString()}
                          <span className={styles.revenueListCount}>· 결제 {r.paidCount}건</span>
                        </span>
                        <span className={styles.revenueListMeta}>
                          환불 {r.refundedCount}건 / {r.refundRatePercent.toFixed(1)}%
                          <span className={styles.revenueListCount}>
                            · 환불 ₩{r.refundedKRW.toLocaleString()}
                          </span>
                        </span>
                        <span className={styles.revenueListMeta}>
                          수수료 ₩{r.platformFeeKRW.toLocaleString()}
                          <span className={styles.revenueListCount}>
                            · 정산 ₩{r.hostPayoutKRW.toLocaleString()}
                          </span>
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </details>
      </section>

      <section className={`container ${styles.list}`}>
        <h2 className={styles.h2}>내 파티</h2>
        {!data || data.length === 0 ? (
          <EmptyState
            emoji="✨"
            title="첫 파티를 열어볼 시간이에요"
            description="장소를 고르고 라운드 컨셉을 정하면 끝. 5분이면 충분해요."
            action={
              <Link to="/host/create">
                <Button variant="primary" size="lg">
                  파티 만들기
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className={styles.filterRow} role="group" aria-label="파티 상태 필터">
              <Chip selected={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                전체
              </Chip>
              <Chip
                selected={statusFilter === 'live'}
                onClick={() => setStatusFilter('live')}
                leadingIcon={<Icon name="live" />}
              >
                진행 중
              </Chip>
              <Chip
                selected={statusFilter === 'open'}
                onClick={() => setStatusFilter('open')}
                leadingIcon={<Icon name="moon" />}
              >
                모집 중
              </Chip>
              <Chip
                selected={statusFilter === 'ended'}
                onClick={() => setStatusFilter('ended')}
                leadingIcon={<Icon name="archive" />}
              >
                지난 파티
              </Chip>
            </div>
            {filteredParties.length === 0 ? (
              <p className={styles.filterEmpty}>이 상태의 파티가 없어요.</p>
            ) : (
              <div className={styles.grid}>
                {filteredParties.map((p) => (
                  <Link key={p.id} to={`/host/parties/${p.id}`} className={styles.cardLink}>
                    <PartyCard party={p} />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function StageRow({
  label,
  value,
  icon,
  active = false,
}: {
  label: string
  value: number
  icon: IconName
  active?: boolean
}) {
  return (
    <div className={`${styles.ledgerRow} ${active ? styles.ledgerRowActive : ''}`}>
      <dt className={styles.ledgerLabel}>
        <span className={styles.ledgerCue} aria-hidden="true">
          <Icon name={icon} />
        </span>
        {label}
      </dt>
      <dd className={styles.ledgerFigure}>{value.toLocaleString()}</dd>
    </div>
  )
}
