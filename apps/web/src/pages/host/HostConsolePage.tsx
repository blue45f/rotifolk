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
  const { data, isLoading } = useHostedParties()
  const summaryQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (summaryFrom) params.set('from', summaryFrom)
    if (summaryTo) params.set('to', summaryTo)
    if (summaryPartyId) params.set('partyId', summaryPartyId)
    if (summaryCompareMode) params.set('compareMode', summaryCompareMode)
    const query = params.toString()
    return `payments/host/summary${query ? `?${query}` : ''}`
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
    queryFn: () => api.get<HostRevenueSummary>(summaryQuery),
    enabled: isSummaryRangeValid,
  })

  useEffect(() => {
    if (!revenue) return
    if (scenarioPlatformFeePercent === '') {
      setScenarioPlatformFeePercent(String(revenue.platformFeePercent))
    }
    if (scenarioRefundPercent === '') {
      setScenarioRefundPercent(String(revenue.refundRetentionPercent))
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

  if (isLoading) return <Loading />

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
        <div>
          <h1 className={styles.title}>
            안녕하세요, <span className={styles.accent}>{user?.nickname}</span> 호스트님 🎙️
          </h1>
          <p className={styles.lead}>오늘의 라운드를 준비해 볼까요?</p>
        </div>
        <Link to="/host/create">
          <Button variant="primary" size="lg">
            + 새 파티 열기
          </Button>
        </Link>
      </header>

      <section
        className="container"
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}
      >
        <Link to="/host/sourcing">
          <Button variant="gold" size="lg">
            📍 공간 섭외 스튜디오
          </Button>
        </Link>
        <Link to="/host/space">
          <Button variant="outline" size="lg">
            🏠 내 가게로 호스팅
          </Button>
        </Link>
      </section>

      <section className={`container ${styles.stats}`}>
        <StatCard label="진행 중인 파티" value={live} emoji="🔴" />
        <StatCard label="모집 중인 파티" value={open} emoji="🌙" />
        <StatCard label="총 호스팅 횟수" value={total} emoji="🏆" />
      </section>

      <section className="container">
        <Card padding="lg" variant="gradient" className={styles.revenueCard}>
          <div className={styles.revenueHead}>
            <span className={styles.revenueTitle}>호스트 매출 ✨</span>
            <span className={styles.revenueBadge}>최근 12개 파티 기준 정산</span>
          </div>

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
                leadingEmoji="🔴"
              >
                진행 중
              </Chip>
              <Chip
                selected={statusFilter === 'open'}
                onClick={() => setStatusFilter('open')}
                leadingEmoji="🌙"
              >
                모집 중
              </Chip>
              <Chip
                selected={statusFilter === 'ended'}
                onClick={() => setStatusFilter('ended')}
                leadingEmoji="🏁"
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

function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <Card padding="md" variant="soft">
      <div className={styles.stat}>
        <span className={styles.statEmoji} aria-hidden="true">
          {emoji}
        </span>
        <div>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      </div>
    </Card>
  )
}
