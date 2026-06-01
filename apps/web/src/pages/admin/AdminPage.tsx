import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Tabs } from '@components/ui/Tabs/Tabs'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { api } from '@services/api'
import { REVENUE_MONITORING_POLICY, type RevenueHealthAlertThreshold } from '@rotifolk/shared'
import styles from './Admin.module.css'

interface AdminReport {
  id: string
  kind: string
  body: string
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  reporter: { id: string; nickname: string }
  target: { id: string; nickname: string } | null
  party: { id: string; title: string } | null
  createdAt: string
}

interface RevenueRuleConfig {
  platformFeePercent: number
  refundRetentionPercent: number
  updatedAt: string
  updatedBy: string | null
}

interface RevenueRuleHistory {
  id: string
  key: string
  fromPlatformFeePercent: number
  toPlatformFeePercent: number
  fromRefundRetentionPercent: number
  toRefundRetentionPercent: number
  changedBy: string | null
  changedAt: string
  reason: string | null
}

interface AdminRevenueTopParty {
  partyId: string
  partyTitle: string
  paidCount: number
  refundedCount: number
  paidGrossKRW: number
  refundedGrossKRW: number
  platformFeeKRW: number
  hostPayoutKRW: number
  netGrossKRW: number
  refundRatePercent: number
  grossTicketCount: number
}

interface AdminRevenueTrend {
  grossPaidKRW: number
  grossRefundedKRW: number
  netSalesKRW: number
  platformFeeKRW: number
  refundRetentionKRW: number
  hostPayoutKRW: number
  platformRevenueKRW: number
  totalPaidCount: number
  totalRefundedCount: number
  refundRatePercent: number
}

interface AdminRevenueHealthAlert {
  code: string
  level: 'warning' | 'danger'
  title: string
  detail: string
}

interface MonitoringPolicyConfig {
  healthAlerts: {
    warningRefundRatePercent: number
    dangerRefundRatePercent: number
    topPartyConcentrationPercent: number
  }
  updatedAt: string
  updatedBy: string | null
}

interface MonitoringPolicyHistory {
  id: string
  key: string
  fromWarningRefundRatePercent: number
  toWarningRefundRatePercent: number
  fromDangerRefundRatePercent: number
  toDangerRefundRatePercent: number
  fromTopPartyConcentrationPercent: number
  toTopPartyConcentrationPercent: number
  changedBy: string | null
  changedAt: string
  reason: string | null
}

type AdminSummaryCompareMode = 'none' | 'previous_period' | 'previous_month' | 'previous_year'

interface AdminRevenueComparison {
  mode: AdminSummaryCompareMode
  enabled: boolean
  rangeFrom: string | null
  rangeTo: string | null
}

interface RevenueTrendKpiItem {
  label: string
  currentValue: number
  previousValue: number
  unit: 'currency' | 'percent'
  percentDelta: number | null
  isRatePoint?: boolean
}

interface RevenuePlanningProjection {
  projectedGrossPaidKRW: number
  projectedGrossRefundedKRW: number
  platformFeeKRW: number
  refundRetentionKRW: number
  platformRevenueKRW: number
  hostPayoutKRW: number
  platformShareRate: number
  hostShareRate: number
  platformDeltaKRW: number
  hostPayoutDeltaKRW: number
  requiredPlatformFeePercent?: number | null
  requiredFeeReachable?: boolean
}

interface PlannerSensitivityScenario {
  id: string
  label: string
  projectedGrossPaidKRW: number
  projectedGrossRefundedKRW: number
  platformRevenueKRW: number
  hostPayoutKRW: number
  platformShareRate: number
  hostPayoutDeltaKRW: number
  platformRevenueDeltaKRW: number
  note?: string
  noteForTarget?: string
}

interface RevenueHealthScore {
  score: number
  level: 'good' | 'warning' | 'critical'
  levelLabel: string
  topPartyConcentrationPercent: number
  reasons: string[]
  summary: string
}

interface MonitoringThresholdSignal {
  tone: 'good' | 'warning' | 'critical'
  current: number
  warning: number
  danger: number
  remainingToWarning: number
  remainingToDanger: number
}

interface MonitoringThresholdSimulation {
  currentHealthScore: RevenueHealthScore
  simulatedHealthScore: RevenueHealthScore
  scoreDelta: number
  refundSignal: MonitoringThresholdSignal
  concentrationSignal: {
    tone: 'good' | 'warning' | 'critical'
    current: number
    threshold: number
    remainingToLimit: number
  }
}

interface AdminRevenueSummary {
  totalPaidCount: number
  totalRefundedCount: number
  grossPaidKRW: number
  grossRefundedKRW: number
  netSalesKRW: number
  platformFeeKRW: number
  refundRetentionKRW: number
  hostPayoutKRW: number
  platformRevenueKRW: number
  avgTicketKRW: number
  topParties: AdminRevenueTopParty[]
  rules: RevenueRuleConfig
  partyCount: number
  refundRatePercent: number
  rangeFrom: string | null
  rangeTo: string | null
  previousPeriod: AdminRevenueTrend | null
  comparison: AdminRevenueComparison
  healthAlerts: AdminRevenueHealthAlert[]
}

type TabKey = 'open' | 'reviewing' | 'resolved'

const STATUS_TONE: Record<AdminReport['status'], 'danger' | 'warning' | 'success' | 'neutral'> = {
  open: 'danger',
  reviewing: 'warning',
  resolved: 'success',
  dismissed: 'neutral',
}

const STATUS_LABEL: Record<AdminReport['status'], string> = {
  open: '미처리',
  reviewing: '검토 중',
  resolved: '처리 완료',
  dismissed: '기각',
}

const KIND_LABEL: Record<string, string> = {
  harassment: '괴롭힘',
  spam: '스팸',
  inappropriate: '부적절',
  other: '기타',
}

const FALLBACK_MONITORING_ALERTS = REVENUE_MONITORING_POLICY.healthAlerts

function formatKpiValue(value: number, unit: 'currency' | 'percent') {
  return unit === 'percent' ? `${value.toFixed(1)}%` : `${value.toLocaleString()}원`
}

function formatDeltaPercent(delta: number | null, withPercentPoint = false): string {
  if (delta === null) return '비교 불가'
  const rounded = Math.round(delta * 10) / 10
  const sign = rounded > 0 ? '+' : ''
  const suffix = withPercentPoint ? 'pp' : '%'
  return `${sign}${rounded.toFixed(1)}${suffix}`
}

function deltaTone(delta: number | null): 'up' | 'down' | 'flat' | 'none' {
  if (delta === null) return 'none'
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'flat'
}

function compareModeLabel(mode: AdminSummaryCompareMode) {
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

function escapeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

function parsePercentInput(value: string): number | null {
  const text = value.trim()
  if (text.length === 0) return null
  const parsed = Number(text)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null
  return parsed
}

function parsePositiveIntegerInput(value: string): number | null {
  const text = value.trim()
  if (text.length === 0) return null
  const parsed = Number(text)
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) return null
  return parsed
}

function parseMoneyInput(value: string): number | null {
  const text = value.trim()
  if (text.length === 0) return null
  const parsed = Number(text)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

function roundMoney(value: number) {
  return Math.round(value)
}

function roundPercentWithOneDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function clampPercentToRange(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function monitoringLevel(
  refundRatePercent: number,
  warning: number,
  danger: number,
): 'good' | 'warning' | 'critical' {
  if (refundRatePercent >= danger) return 'critical'
  if (refundRatePercent >= warning) return 'warning'
  return 'good'
}

function buildMonitoringThresholdSimulation(args: {
  baseMonitoringThresholds: RevenueHealthAlertThreshold
  simulatedMonitoringThresholds: RevenueHealthAlertThreshold
  totalPaidKRW: number
  totalTickets: number
  refundRatePercent: number
  platformRevenueKRW: number
  topPartyConcentrationPercent: number
  netSalesChangePercent: number | null
}): MonitoringThresholdSimulation | null {
  const baseHealthScore = computeRevenueHealthScore({
    totalPaidKRW: args.totalPaidKRW,
    totalTickets: args.totalTickets,
    refundRatePercent: args.refundRatePercent,
    platformRevenueKRW: args.platformRevenueKRW,
    topPartyConcentrationPercent: args.topPartyConcentrationPercent,
    monitoring: args.baseMonitoringThresholds,
    netSalesChangePercent: args.netSalesChangePercent,
  })
  const simulatedHealthScore = computeRevenueHealthScore({
    totalPaidKRW: args.totalPaidKRW,
    totalTickets: args.totalTickets,
    refundRatePercent: args.refundRatePercent,
    platformRevenueKRW: args.platformRevenueKRW,
    topPartyConcentrationPercent: args.topPartyConcentrationPercent,
    monitoring: args.simulatedMonitoringThresholds,
    netSalesChangePercent: args.netSalesChangePercent,
  })

  const refundTone = monitoringLevel(
    args.refundRatePercent,
    args.simulatedMonitoringThresholds.warningRefundRatePercent,
    args.simulatedMonitoringThresholds.dangerRefundRatePercent,
  )
  const concentrationTone =
    args.topPartyConcentrationPercent >=
    args.simulatedMonitoringThresholds.topPartyConcentrationPercent
      ? 'critical'
      : 'good'

  return {
    currentHealthScore: baseHealthScore,
    simulatedHealthScore,
    scoreDelta: simulatedHealthScore.score - baseHealthScore.score,
    refundSignal: {
      tone: refundTone,
      current: args.refundRatePercent,
      warning: args.simulatedMonitoringThresholds.warningRefundRatePercent,
      danger: args.simulatedMonitoringThresholds.dangerRefundRatePercent,
      remainingToWarning:
        args.simulatedMonitoringThresholds.warningRefundRatePercent - args.refundRatePercent,
      remainingToDanger:
        args.simulatedMonitoringThresholds.dangerRefundRatePercent - args.refundRatePercent,
    },
    concentrationSignal: {
      tone: concentrationTone,
      current: args.topPartyConcentrationPercent,
      threshold: args.simulatedMonitoringThresholds.topPartyConcentrationPercent,
      remainingToLimit:
        args.simulatedMonitoringThresholds.topPartyConcentrationPercent -
        args.topPartyConcentrationPercent,
    },
  }
}

function createPlannerProjection(args: {
  transactionCount: number
  avgTicket: number
  refundRate: number
  platformFeePercent: number
  refundRetentionPercent: number
  basePlatformRevenue: number
  baseHostPayout: number
  targetPlatformRevenue?: number | null
}): RevenuePlanningProjection {
  const projectedGrossPaidKRW = roundMoney(args.transactionCount * args.avgTicket)
  if (projectedGrossPaidKRW <= 0) {
    return {
      projectedGrossPaidKRW: 0,
      projectedGrossRefundedKRW: 0,
      platformFeeKRW: 0,
      refundRetentionKRW: 0,
      platformRevenueKRW: 0,
      hostPayoutKRW: 0,
      platformShareRate: 0,
      hostShareRate: 0,
      platformDeltaKRW: -args.basePlatformRevenue,
      hostPayoutDeltaKRW: -args.baseHostPayout,
      requiredPlatformFeePercent: null,
      requiredFeeReachable: false,
    }
  }

  const safeRefundRate = clampPercentToRange(args.refundRate)
  const projectedGrossRefundedKRW = roundMoney((projectedGrossPaidKRW * safeRefundRate) / 100)
  const platformFeeKRW = roundMoney((projectedGrossPaidKRW * args.platformFeePercent) / 100)
  const refundRetentionKRW = roundMoney(
    (projectedGrossRefundedKRW * args.refundRetentionPercent) / 100,
  )
  const platformRevenueKRW = platformFeeKRW + refundRetentionKRW
  const hostPayoutKRW = Math.max(projectedGrossPaidKRW - platformFeeKRW, 0)
  const targetRateRaw =
    args.targetPlatformRevenue === undefined ||
    args.targetPlatformRevenue === null ||
    args.targetPlatformRevenue === 0
      ? null
      : ((args.targetPlatformRevenue - refundRetentionKRW) / projectedGrossPaidKRW) * 100
  const requiredPlatformFeePercent =
    targetRateRaw === null ? null : roundPercentWithOneDecimal(targetRateRaw)

  return {
    projectedGrossPaidKRW,
    projectedGrossRefundedKRW,
    platformFeeKRW,
    refundRetentionKRW,
    platformRevenueKRW,
    hostPayoutKRW,
    platformShareRate: roundPercentWithOneDecimal(
      (platformRevenueKRW / projectedGrossPaidKRW) * 100,
    ),
    hostShareRate: roundPercentWithOneDecimal((hostPayoutKRW / projectedGrossPaidKRW) * 100),
    platformDeltaKRW: platformRevenueKRW - args.basePlatformRevenue,
    hostPayoutDeltaKRW: hostPayoutKRW - args.baseHostPayout,
    requiredPlatformFeePercent,
    requiredFeeReachable:
      requiredPlatformFeePercent !== null &&
      targetRateRaw !== null &&
      targetRateRaw >= 0 &&
      targetRateRaw <= 100,
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

function computeRevenueHealthScore(args: {
  totalPaidKRW: number
  totalTickets: number
  refundRatePercent: number
  platformRevenueKRW: number
  topPartyConcentrationPercent: number
  monitoring: RevenueHealthAlertThreshold
  netSalesChangePercent: number | null
}): RevenueHealthScore {
  const {
    totalPaidKRW,
    totalTickets,
    refundRatePercent,
    platformRevenueKRW,
    topPartyConcentrationPercent,
    monitoring,
    netSalesChangePercent,
  } = args

  if (totalTickets <= 0 || totalPaidKRW <= 0) {
    return {
      score: 0,
      level: 'critical',
      levelLabel: '거래 미확보',
      topPartyConcentrationPercent,
      summary: '현재 구간에서 거래 데이터가 부족해 위험도 판단이 제한돼요.',
      reasons: ['거래/환불 데이터가 없어 점검 항목이 보류됩니다.'],
    }
  }

  const warningRefundRatePercent = clampNumber(monitoring.warningRefundRatePercent, 0, 100)
  const dangerRefundRatePercent = clampNumber(monitoring.dangerRefundRatePercent, 0, 100)
  const topPartyThreshold = clampNumber(monitoring.topPartyConcentrationPercent, 0, 100)
  const reasons: string[] = []

  const refundPenalty =
    refundRatePercent <= warningRefundRatePercent
      ? 0
      : dangerRefundRatePercent <= warningRefundRatePercent
        ? 40
        : refundRatePercent >= dangerRefundRatePercent
          ? 40
          : ((refundRatePercent - warningRefundRatePercent) /
              (dangerRefundRatePercent - warningRefundRatePercent)) *
            40

  if (refundPenalty > 0) {
    reasons.push(
      `환불률이 경고 임계값(${warningRefundRatePercent.toFixed(1)}%)을 넘겨 추가 모니터링이 필요해요.`,
    )
  }

  const concentrationPenalty =
    topPartyConcentrationPercent <= topPartyThreshold
      ? 0
      : ((topPartyConcentrationPercent - topPartyThreshold) /
          Math.max(1, 100 - topPartyThreshold)) *
        20

  if (concentrationPenalty > 0) {
    reasons.push(
      `상위 파티 매출 집중도가 ${topPartyConcentrationPercent.toFixed(1)}%로 편중이 커요.`,
    )
  }

  const platformShare = clampNumber((platformRevenueKRW / totalPaidKRW) * 100, 0, 100)
  const platformPenalty = platformShare > 35 ? ((platformShare - 35) / 65) * 10 : 0
  if (platformPenalty > 0) {
    reasons.push(
      `플랫폼 수익 비중이 ${platformShare.toFixed(1)}%로 상대적으로 높아 호스트 수익이 압박될 수 있어요.`,
    )
  }

  const trendPenalty =
    netSalesChangePercent === null || netSalesChangePercent >= 0
      ? 0
      : Math.min(20, Math.abs(netSalesChangePercent) * 0.4)
  if (trendPenalty > 6) {
    reasons.push('실결제액이 직전 대비 하락해 운영 개선 트리거가 보입니다.')
  }

  const score = Math.round(
    clampNumber(
      100 - refundPenalty - concentrationPenalty - platformPenalty - trendPenalty,
      0,
      100,
    ),
  )

  if (score >= 85) {
    return {
      score,
      level: 'good',
      levelLabel: '양호',
      topPartyConcentrationPercent,
      summary: '현재 수익 건전성이 안정적이에요. 모니터링 정책 유지가 적절해 보입니다.',
      reasons: reasons.length > 0 ? reasons : ['이상 신호 없음'],
    }
  }

  if (score >= 70) {
    return {
      score,
      level: 'warning',
      levelLabel: '주의',
      topPartyConcentrationPercent,
      summary: '운영 신호가 약하게 악화되고 있어 선제 점검이 필요해요.',
      reasons: reasons.length > 0 ? reasons : ['환불/편중 지표를 계속 확인하세요.'],
    }
  }

  return {
    score,
    level: 'critical',
    levelLabel: '위험',
    topPartyConcentrationPercent,
    summary: '수익 리스크가 높습니다. 정책 임계값 조정이나 개입이 필요해 보여요.',
    reasons: reasons.length > 0 ? reasons : ['즉시 조치 대상이 될 리스크가 있습니다.'],
  }
}

export default function AdminPage() {
  const [tab, setTab] = useState<TabKey>('open')
  const [platformFeePercent, setPlatformFeePercent] = useState('')
  const [refundRetentionPercent, setRefundRetentionPercent] = useState('')
  const [ruleChangeReason, setRuleChangeReason] = useState('')
  const [rollbackReasons, setRollbackReasons] = useState<Record<string, string>>({})

  const [summaryFrom, setSummaryFrom] = useState('')
  const [summaryTo, setSummaryTo] = useState('')
  const [topPartyLimit, setTopPartyLimit] = useState('12')
  const [summaryPartyId, setSummaryPartyId] = useState('')
  const [summaryCompareMode, setSummaryCompareMode] =
    useState<AdminSummaryCompareMode>('previous_period')
  const [monitoringWarningRate, setMonitoringWarningRate] = useState('')
  const [monitoringDangerRate, setMonitoringDangerRate] = useState('')
  const [monitoringTopPartyRate, setMonitoringTopPartyRate] = useState('')
  const [monitoringPolicyReason, setMonitoringPolicyReason] = useState('')
  const [monitoringRollbackReasons, setMonitoringRollbackReasons] = useState<
    Record<string, string>
  >({})
  const [plannerTransactionCount, setPlannerTransactionCount] = useState('')
  const [plannerAvgTicket, setPlannerAvgTicket] = useState('')
  const [plannerRefundRate, setPlannerRefundRate] = useState('')
  const [plannerTargetPlatformRevenue, setPlannerTargetPlatformRevenue] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: openData } = useQuery({
    queryKey: ['admin', 'reports', 'open'],
    queryFn: () => api.get<AdminReport[]>('admin/reports?status=open'),
  })
  const { data: reviewingData } = useQuery({
    queryKey: ['admin', 'reports', 'reviewing'],
    queryFn: () => api.get<AdminReport[]>('admin/reports?status=reviewing'),
  })

  const { data: data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', tab],
    queryFn: () => api.get<AdminReport[]>(`admin/reports?status=${tab}`),
  })

  const summaryTopLimit = Number.parseInt(topPartyLimit, 10)
  const isSummaryTopLimitValid =
    Number.isFinite(summaryTopLimit) && summaryTopLimit > 0 && summaryTopLimit <= 50
  const normalizedSummaryTopLimit = isSummaryTopLimitValid ? summaryTopLimit : 12
  const isSummaryDateRangeValid = !summaryFrom || !summaryTo || summaryFrom <= summaryTo
  const summaryQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (summaryFrom) params.set('from', summaryFrom)
    if (summaryTo) params.set('to', summaryTo)
    if (summaryPartyId) params.set('partyId', summaryPartyId)
    params.set('compareMode', summaryCompareMode)
    params.set('topLimit', String(normalizedSummaryTopLimit))
    const query = params.toString()
    return `payments/admin/summary${query ? `?${query}` : ''}`
  }, [summaryCompareMode, summaryFrom, summaryTo, summaryPartyId, normalizedSummaryTopLimit])

  const { data: revenueSummary, isLoading: isRevenueSummaryLoading } = useQuery({
    queryKey: [
      'admin',
      'payments',
      'summary',
      summaryCompareMode,
      summaryFrom,
      summaryTo,
      summaryPartyId,
      normalizedSummaryTopLimit,
    ],
    queryFn: () => api.get<AdminRevenueSummary>(summaryQuery),
    enabled: isSummaryDateRangeValid,
  })

  const { data: revenueRules, isLoading: isRevenueRuleLoading } = useQuery({
    queryKey: ['admin', 'payments', 'revenue-rules'],
    queryFn: () => api.get<RevenueRuleConfig>('payments/admin/revenue-rules'),
  })
  const { data: monitoringPolicy, isLoading: isMonitoringPolicyLoading } = useQuery({
    queryKey: ['admin', 'payments', 'monitoring-policy'],
    queryFn: () => api.get<MonitoringPolicyConfig>('payments/admin/monitoring-policy'),
  })
  const { data: monitoringPolicyHistory, isLoading: isMonitoringPolicyHistoryLoading } = useQuery({
    queryKey: ['admin', 'payments', 'monitoring-policy', 'history'],
    queryFn: () =>
      api.get<MonitoringPolicyHistory[]>('payments/admin/monitoring-policy/history?limit=10'),
  })
  const { data: revenueRuleHistory, isLoading: isRevenueRuleHistoryLoading } = useQuery({
    queryKey: ['admin', 'payments', 'revenue-rules', 'history'],
    queryFn: () => api.get<RevenueRuleHistory[]>('payments/admin/revenue-rules/history?limit=10'),
  })

  useEffect(() => {
    if (!revenueRules) return
    setPlatformFeePercent(String(revenueRules.platformFeePercent))
    setRefundRetentionPercent(String(revenueRules.refundRetentionPercent))
  }, [revenueRules?.platformFeePercent, revenueRules?.refundRetentionPercent])
  useEffect(() => {
    if (!monitoringPolicy?.healthAlerts) return
    setMonitoringWarningRate(String(monitoringPolicy.healthAlerts.warningRefundRatePercent))
    setMonitoringDangerRate(String(monitoringPolicy.healthAlerts.dangerRefundRatePercent))
    setMonitoringTopPartyRate(String(monitoringPolicy.healthAlerts.topPartyConcentrationPercent))
  }, [
    monitoringPolicy?.healthAlerts?.warningRefundRatePercent,
    monitoringPolicy?.healthAlerts?.dangerRefundRatePercent,
    monitoringPolicy?.healthAlerts?.topPartyConcentrationPercent,
  ])
  useEffect(() => {
    if (!revenueSummary) return
    if (plannerTransactionCount === '') {
      setPlannerTransactionCount(
        String(revenueSummary.totalPaidCount + revenueSummary.totalRefundedCount),
      )
    }
    if (plannerAvgTicket === '') {
      setPlannerAvgTicket(String(revenueSummary.avgTicketKRW))
    }
    if (plannerRefundRate === '') {
      setPlannerRefundRate(String(revenueSummary.refundRatePercent.toFixed(1)))
    }
  }, [
    plannerAvgTicket,
    plannerRefundRate,
    plannerTransactionCount,
    revenueSummary?.avgTicketKRW,
    revenueSummary?.refundRatePercent,
    revenueSummary?.totalPaidCount,
    revenueSummary?.totalRefundedCount,
  ])

  const patch = useMutation({
    mutationFn: (input: { id: string; status: AdminReport['status'] }) =>
      api.patch(`admin/reports/${input.id}`, { status: input.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
      toast.show('신고 상태가 업데이트됐어요.', 'success')
    },
    onError: (error) => toast.show((error as Error).message, 'error'),
  })

  const parsedPlatformFee = parsePercentInput(platformFeePercent)
  const parsedRefundRetention = parsePercentInput(refundRetentionPercent)
  const hasRuleInput = parsedPlatformFee !== null && parsedRefundRetention !== null
  const parsedMonitoringWarning = parsePercentInput(monitoringWarningRate)
  const parsedMonitoringDanger = parsePercentInput(monitoringDangerRate)
  const parsedMonitoringTopParty = parsePercentInput(monitoringTopPartyRate)
  const hasMonitoringInput =
    parsedMonitoringWarning !== null &&
    parsedMonitoringDanger !== null &&
    parsedMonitoringTopParty !== null &&
    parsedMonitoringWarning <= parsedMonitoringDanger
  const monitoringThresholds = monitoringPolicy?.healthAlerts ?? FALLBACK_MONITORING_ALERTS
  const hasMonitoringInputChanged =
    parsedMonitoringWarning !== monitoringThresholds.warningRefundRatePercent ||
    parsedMonitoringDanger !== monitoringThresholds.dangerRefundRatePercent ||
    parsedMonitoringTopParty !== monitoringThresholds.topPartyConcentrationPercent

  const saveRule = useMutation({
    mutationFn: () =>
      api.patch<RevenueRuleConfig>('payments/admin/revenue-rules', {
        platformFeePercent: parsedPlatformFee ?? 0,
        refundRetentionPercent: parsedRefundRetention ?? 0,
        ...(ruleChangeReason.trim() ? { reason: ruleChangeReason.trim() } : {}),
      }),
    onSuccess: (saved) => {
      setPlatformFeePercent(String(saved.platformFeePercent))
      setRefundRetentionPercent(String(saved.refundRetentionPercent))
      setRuleChangeReason('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'revenue-rules'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'revenue-rules', 'history'] })
      toast.show('수익 정책이 반영됐습니다.', 'success')
    },
    onError: (error) => toast.show((error as Error).message, 'error'),
  })

  const saveMonitoringPolicy = useMutation({
    mutationFn: () =>
      api.patch<MonitoringPolicyConfig>('payments/admin/monitoring-policy', {
        warningRefundRatePercent: parsedMonitoringWarning ?? 0,
        dangerRefundRatePercent: parsedMonitoringDanger ?? 0,
        topPartyConcentrationPercent: parsedMonitoringTopParty ?? 0,
        ...(monitoringPolicyReason.trim() ? { reason: monitoringPolicyReason.trim() } : {}),
      }),
    onSuccess: (saved) => {
      setMonitoringWarningRate(String(saved.healthAlerts.warningRefundRatePercent))
      setMonitoringDangerRate(String(saved.healthAlerts.dangerRefundRatePercent))
      setMonitoringTopPartyRate(String(saved.healthAlerts.topPartyConcentrationPercent))
      setMonitoringPolicyReason('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'monitoring-policy'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'summary'] })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'payments', 'monitoring-policy', 'history'],
      })
      toast.show('임계값 정책이 반영됐습니다.', 'success')
    },
    onError: (error) => toast.show((error as Error).message, 'error'),
  })

  const rollbackMonitoringPolicy = useMutation({
    mutationFn: (input: { historyId: string; reason?: string }) =>
      api.post<MonitoringPolicyConfig>('payments/admin/monitoring-policy/rollback', input),
    onSuccess: (saved) => {
      setMonitoringPolicyReason('')
      setMonitoringRollbackReasons({})
      setMonitoringWarningRate(String(saved.healthAlerts.warningRefundRatePercent))
      setMonitoringDangerRate(String(saved.healthAlerts.dangerRefundRatePercent))
      setMonitoringTopPartyRate(String(saved.healthAlerts.topPartyConcentrationPercent))
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'monitoring-policy'] })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'payments', 'monitoring-policy', 'history'],
      })
      toast.show('임계값 정책이 롤백됐습니다.', 'success')
    },
    onError: (error) => toast.show((error as Error).message, 'error'),
  })

  const rollbackRule = useMutation({
    mutationFn: (input: { historyId: string; reason?: string }) =>
      api.post<RevenueRuleConfig>('payments/admin/revenue-rules/rollback', input),
    onSuccess: (saved) => {
      setRuleChangeReason('')
      setPlatformFeePercent(String(saved.platformFeePercent))
      setRefundRetentionPercent(String(saved.refundRetentionPercent))
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'revenue-rules'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'revenue-rules', 'history'] })
      toast.show('수익 정책이 롤백됐습니다.', 'success')
    },
    onError: (error) => toast.show((error as Error).message, 'error'),
  })

  const setSummaryRange = (days: number) => {
    const toDate = new Date()
    const fromDate = new Date()
    fromDate.setDate(toDate.getDate() - (days - 1))
    setSummaryTo(toDate.toISOString().slice(0, 10))
    setSummaryFrom(fromDate.toISOString().slice(0, 10))
  }
  const clearSummaryFilter = () => {
    setSummaryFrom('')
    setSummaryTo('')
    setTopPartyLimit('12')
    setSummaryPartyId('')
    setSummaryCompareMode('previous_period')
  }

  const exportRevenueSummary = () => {
    if (typeof window === 'undefined' || !revenueSummary) return
    const monitoringAlerts = monitoringPolicy?.healthAlerts ?? FALLBACK_MONITORING_ALERTS
    const comparisonMeta = revenueSummary.comparison ?? {
      mode: summaryCompareMode,
      enabled: false,
      rangeFrom: null,
      rangeTo: null,
    }
    const comparisonLabel = compareModeLabel(comparisonMeta.mode)
    const trendRows: string[][] = trendComparisonKpis.map((kpi) => [
      `${comparisonLabel} ${kpi.label}`,
      formatKpiValue(kpi.currentValue, kpi.unit),
      formatKpiValue(kpi.previousValue, kpi.unit),
      formatDeltaPercent(kpi.percentDelta, kpi.isRatePoint),
    ])

    const lines = [
      ['항목', '값'],
      ['생성일시', new Date().toLocaleString('ko-KR')],
      ['대시보드 비교 모드', comparisonLabel],
      ['이전 기간 적용', comparisonMeta.enabled ? '예' : '아니오'],
      ['총 결제액', String(totalPaid)],
      ['총 환불액', String(totalRefunded)],
      ['실 결제액', String(netSales)],
      ['플랫폼 수익', String(platformRevenue)],
      ['호스트 정산', String(hostPayout)],
      ['평균 결제액', String(avgTicket)],
      ['총 거래 건', String(totalTickets)],
      ['환불률', `${refundRatePercent.toFixed(1)}%`],
      ['운영 파티 수', String(partyCount)],
      ['조회 시작', revenueSummary.rangeFrom ?? '전체'],
      ['조회 종료', revenueSummary.rangeTo ?? '전체'],
      ['비교 시작', comparisonMeta.rangeFrom ?? '미적용'],
      ['비교 종료', comparisonMeta.rangeTo ?? '미적용'],
      ['파티 필터', summaryPartyId || '전체'],
      ['경고 임계값(경고)', `${monitoringAlerts.warningRefundRatePercent}%`],
      ['경고 임계값(위험)', `${monitoringAlerts.dangerRefundRatePercent}%`],
      ['파티 집중 임계값', `${monitoringAlerts.topPartyConcentrationPercent}%`],
      ['최대 파티 집중도', `${topPartyConcentrationPercent.toFixed(1)}%`],
      [
        '수익 건전성 점수',
        revenueHealthScore
          ? `${revenueHealthScore.score} / 100 (${revenueHealthScore.levelLabel})`
          : '미계산',
      ],
      [''],
      ...(trendRows.length > 0
        ? [[`${comparisonLabel} 분석`], ['지표', '현재값', '이전값', '변화율'], ...trendRows, ['']]
        : []),
      ['Top 파티별 매출', ''],
      ['파티명', '매출(건수/환불률)'],
      ...topParties.map((party) => [
        party.partyTitle,
        `${party.paidGrossKRW}원 (${party.paidCount}/${party.refundedCount}, ${party.refundRatePercent.toFixed(1)}%)`,
      ]),
    ]
    const csv = lines
      .map((row) => row.map((value) => escapeCsvValue(String(value))).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `revenue-summary-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const summaryLabelFrom = useMemo(() => {
    if (!summaryFrom) return ''
    return new Date(summaryFrom).toLocaleDateString('ko-KR')
  }, [summaryFrom])
  const summaryLabelTo = useMemo(() => {
    if (!summaryTo) return ''
    return new Date(summaryTo).toLocaleDateString('ko-KR')
  }, [summaryTo])

  const openCount = openData?.length ?? 0
  const reviewingCount = reviewingData?.length ?? 0

  const topParties = revenueSummary?.topParties ?? []
  const totalPaid = revenueSummary?.grossPaidKRW ?? 0
  const totalRefunded = revenueSummary?.grossRefundedKRW ?? 0
  const netSales = revenueSummary?.netSalesKRW ?? 0
  const platformRevenue = revenueSummary?.platformRevenueKRW ?? 0
  const avgTicket = revenueSummary?.avgTicketKRW ?? 0
  const totalTickets =
    (revenueSummary?.totalPaidCount ?? 0) + (revenueSummary?.totalRefundedCount ?? 0)
  const partyCount = revenueSummary?.partyCount ?? 0
  const refundRatePercent = revenueSummary?.refundRatePercent ?? 0
  const hostPayout = revenueSummary?.hostPayoutKRW ?? 0
  const previousPeriod = revenueSummary?.previousPeriod
  const comparisonLabel = compareModeLabel(revenueSummary?.comparison?.mode ?? summaryCompareMode)
  const healthAlerts = revenueSummary?.healthAlerts ?? []
  const hasPreviousPeriod = !!previousPeriod
  const topPartyConcentrationPercent = topParties[0]
    ? (topParties[0].paidGrossKRW / Math.max(totalPaid, 1)) * 100
    : 0
  const grossPaidChangePercent =
    previousPeriod && previousPeriod.grossPaidKRW > 0
      ? ((totalPaid - previousPeriod.grossPaidKRW) / previousPeriod.grossPaidKRW) * 100
      : null
  const platformRevenueChangePercent =
    previousPeriod && previousPeriod.platformRevenueKRW > 0
      ? ((platformRevenue - previousPeriod.platformRevenueKRW) /
          previousPeriod.platformRevenueKRW) *
        100
      : null
  const netSalesChangePercent =
    previousPeriod && previousPeriod.netSalesKRW > 0
      ? ((netSales - previousPeriod.netSalesKRW) / previousPeriod.netSalesKRW) * 100
      : null
  const refundRateDelta = previousPeriod
    ? refundRatePercent - previousPeriod.refundRatePercent
    : null
  const revenueHealthScore = useMemo<RevenueHealthScore | null>(() => {
    if (!revenueSummary) return null
    return computeRevenueHealthScore({
      totalPaidKRW: totalPaid,
      totalTickets: totalTickets,
      refundRatePercent,
      platformRevenueKRW: platformRevenue,
      topPartyConcentrationPercent,
      monitoring: monitoringThresholds ?? FALLBACK_MONITORING_ALERTS,
      netSalesChangePercent,
    })
  }, [
    monitoringThresholds,
    platformRevenue,
    refundRatePercent,
    totalPaid,
    totalTickets,
    topPartyConcentrationPercent,
    netSalesChangePercent,
    revenueSummary,
  ])

  const trendComparisonKpis = useMemo<RevenueTrendKpiItem[]>(
    () =>
      !previousPeriod
        ? []
        : [
            {
              label: '총 결제액',
              currentValue: totalPaid,
              previousValue: previousPeriod.grossPaidKRW,
              unit: 'currency',
              percentDelta: grossPaidChangePercent,
            },
            {
              label: '총 환불액',
              currentValue: totalRefunded,
              previousValue: previousPeriod.grossRefundedKRW,
              unit: 'currency',
              percentDelta:
                previousPeriod.grossRefundedKRW > 0
                  ? ((totalRefunded - previousPeriod.grossRefundedKRW) /
                      previousPeriod.grossRefundedKRW) *
                    100
                  : null,
            },
            {
              label: '실 결제액',
              currentValue: netSales,
              previousValue: previousPeriod.netSalesKRW,
              unit: 'currency',
              percentDelta: netSalesChangePercent,
            },
            {
              label: '플랫폼 수익',
              currentValue: platformRevenue,
              previousValue: previousPeriod.platformRevenueKRW,
              unit: 'currency',
              percentDelta: platformRevenueChangePercent,
            },
            {
              label: '호스트 정산',
              currentValue: hostPayout,
              previousValue: previousPeriod.hostPayoutKRW,
              unit: 'currency',
              percentDelta:
                previousPeriod.hostPayoutKRW > 0
                  ? ((hostPayout - previousPeriod.hostPayoutKRW) / previousPeriod.hostPayoutKRW) *
                    100
                  : null,
            },
            {
              label: '환불률',
              currentValue: refundRatePercent,
              previousValue: previousPeriod.refundRatePercent,
              unit: 'percent',
              percentDelta: refundRateDelta,
              isRatePoint: true,
            },
          ],
    [
      hostPayout,
      netSales,
      previousPeriod,
      platformRevenue,
      refundRateDelta,
      refundRatePercent,
      totalPaid,
      totalRefunded,
      grossPaidChangePercent,
      platformRevenueChangePercent,
      netSalesChangePercent,
    ],
  )
  const monitoringThresholdSimulation = useMemo<MonitoringThresholdSimulation | null>(() => {
    if (
      !revenueSummary ||
      !hasMonitoringInput ||
      !hasMonitoringInputChanged ||
      parsedMonitoringWarning === null ||
      parsedMonitoringDanger === null ||
      parsedMonitoringTopParty === null ||
      !revenueHealthScore
    ) {
      return null
    }

    const baseMonitoringThresholds = {
      warningRefundRatePercent: monitoringThresholds.warningRefundRatePercent,
      dangerRefundRatePercent: monitoringThresholds.dangerRefundRatePercent,
      topPartyConcentrationPercent: monitoringThresholds.topPartyConcentrationPercent,
    }
    const simulatedMonitoringThresholds = {
      warningRefundRatePercent: parsedMonitoringWarning,
      dangerRefundRatePercent: parsedMonitoringDanger,
      topPartyConcentrationPercent: parsedMonitoringTopParty,
    }

    if (
      baseMonitoringThresholds.warningRefundRatePercent ===
        simulatedMonitoringThresholds.warningRefundRatePercent &&
      baseMonitoringThresholds.dangerRefundRatePercent ===
        simulatedMonitoringThresholds.dangerRefundRatePercent &&
      baseMonitoringThresholds.topPartyConcentrationPercent ===
        simulatedMonitoringThresholds.topPartyConcentrationPercent
    ) {
      return null
    }

    return buildMonitoringThresholdSimulation({
      baseMonitoringThresholds,
      simulatedMonitoringThresholds,
      totalPaidKRW: totalPaid,
      totalTickets,
      refundRatePercent,
      platformRevenueKRW: platformRevenue,
      topPartyConcentrationPercent,
      netSalesChangePercent,
    })
  }, [
    hasMonitoringInput,
    hasMonitoringInputChanged,
    parsedMonitoringDanger,
    parsedMonitoringTopParty,
    parsedMonitoringWarning,
    monitoringThresholds.dangerRefundRatePercent,
    monitoringThresholds.topPartyConcentrationPercent,
    monitoringThresholds.warningRefundRatePercent,
    netSalesChangePercent,
    platformRevenue,
    refundRatePercent,
    revenueHealthScore,
    revenueSummary,
    topPartyConcentrationPercent,
    totalPaid,
    totalTickets,
  ])

  const parsedPlannerTransactionCount = parsePositiveIntegerInput(plannerTransactionCount)
  const parsedPlannerAvgTicket = parseMoneyInput(plannerAvgTicket)
  const parsedPlannerRefundRate = parsePercentInput(plannerRefundRate)
  const parsedPlannerTargetRevenue = parseMoneyInput(plannerTargetPlatformRevenue)
  const hasPlannerInput =
    parsedPlannerTransactionCount !== null &&
    parsedPlannerAvgTicket !== null &&
    parsedPlannerRefundRate !== null &&
    hasRuleInput

  const planningProjection = useMemo<RevenuePlanningProjection | null>(() => {
    if (
      !revenueSummary ||
      !hasPlannerInput ||
      parsedPlannerTransactionCount === null ||
      parsedPlannerAvgTicket === null
    ) {
      return null
    }

    if (parsedPlatformFee === null || parsedRefundRetention === null) return null

    return createPlannerProjection({
      transactionCount: parsedPlannerTransactionCount,
      avgTicket: parsedPlannerAvgTicket,
      refundRate: parsedPlannerRefundRate,
      platformFeePercent: parsedPlatformFee,
      refundRetentionPercent: parsedRefundRetention,
      basePlatformRevenue: platformRevenue,
      baseHostPayout: hostPayout,
      targetPlatformRevenue: parsedPlannerTargetRevenue,
    })
  }, [
    hasPlannerInput,
    hasRuleInput,
    hostPayout,
    parsedPlannerAvgTicket,
    parsedPlannerRefundRate,
    parsedPlannerTargetRevenue,
    parsedPlannerTransactionCount,
    parsedPlatformFee,
    parsedRefundRetention,
    platformRevenue,
    revenueSummary,
  ])

  const plannerFeeRangeText = useMemo(() => {
    if (
      planningProjection?.requiredPlatformFeePercent === null ||
      planningProjection?.requiredPlatformFeePercent === undefined
    ) {
      return null
    }

    if (planningProjection.requiredFeeReachable) {
      return `목표 플랫폼 수익을 맞추려면 수수료율을 ${clampPercentToRange(
        planningProjection.requiredPlatformFeePercent,
      ).toFixed(1)}%로 조정해야 해요.`
    }

    return `목표값이 현재 시나리오에서는 수수료율만으로는 어렵습니다. 목표 수익/환불률/거래 가정을 조정해 주세요.`
  }, [planningProjection])

  const plannerTargetAchievementPercent = useMemo(() => {
    if (
      !planningProjection ||
      parsedPlannerTargetRevenue === null ||
      parsedPlannerTargetRevenue <= 0
    )
      return null
    return (planningProjection.platformRevenueKRW / parsedPlannerTargetRevenue) * 100
  }, [parsedPlannerTargetRevenue, planningProjection])

  const plannerSensitivityScenarios = useMemo<PlannerSensitivityScenario[]>(() => {
    if (
      !revenueSummary ||
      !hasPlannerInput ||
      !hasRuleInput ||
      parsedPlannerTransactionCount === null ||
      parsedPlannerAvgTicket === null ||
      parsedPlannerRefundRate === null ||
      parsedPlatformFee === null ||
      parsedRefundRetention === null
    )
      return []

    const buildSensitivity = (
      key: string,
      label: string,
      overrides: Partial<{ transactionCount: number; avgTicket: number; refundRate: number }>,
      note?: string,
    ): PlannerSensitivityScenario => {
      const transactionCount = overrides.transactionCount ?? parsedPlannerTransactionCount
      const avgTicket = overrides.avgTicket ?? parsedPlannerAvgTicket
      const refundRate = overrides.refundRate ?? parsedPlannerRefundRate
      const projected = createPlannerProjection({
        transactionCount,
        avgTicket,
        refundRate,
        platformFeePercent: parsedPlatformFee,
        refundRetentionPercent: parsedRefundRetention,
        basePlatformRevenue: planningProjection
          ? planningProjection.platformRevenueKRW
          : platformRevenue,
        baseHostPayout: planningProjection ? planningProjection.hostPayoutKRW : hostPayout,
        targetPlatformRevenue: null,
      })

      return {
        id: `${key}-${label}`,
        label,
        projectedGrossPaidKRW: projected.projectedGrossPaidKRW,
        projectedGrossRefundedKRW: projected.projectedGrossRefundedKRW,
        platformRevenueKRW: projected.platformRevenueKRW,
        hostPayoutKRW: projected.hostPayoutKRW,
        platformShareRate: projected.platformShareRate,
        hostPayoutDeltaKRW:
          projected.hostPayoutKRW -
          (planningProjection ? planningProjection.hostPayoutKRW : hostPayout),
        platformRevenueDeltaKRW:
          projected.platformRevenueKRW -
          (planningProjection ? planningProjection.platformRevenueKRW : platformRevenue),
        note,
      }
    }

    return [
      buildSensitivity(
        'tx-up',
        '거래건 +20%',
        { transactionCount: Math.max(0, Math.round(parsedPlannerTransactionCount * 1.2)) },
        '유입이 20% 늘었을 때',
      ),
      buildSensitivity(
        'tx-down',
        '거래건 -20%',
        { transactionCount: Math.max(0, Math.round(parsedPlannerTransactionCount * 0.8)) },
        '유입이 20% 줄었을 때',
      ),
      buildSensitivity(
        'ticket-up',
        '평균결제 +20%',
        { avgTicket: roundMoney(parsedPlannerAvgTicket * 1.2) },
        '평균 결제액이 20% 늘었을 때',
      ),
      buildSensitivity(
        'ticket-down',
        '평균결제 -20%',
        { avgTicket: roundMoney(parsedPlannerAvgTicket * 0.8) },
        '평균 결제액이 20% 줄었을 때',
      ),
      buildSensitivity(
        'refund-down',
        '환불률 -3pp',
        { refundRate: parsedPlannerRefundRate - 3 },
        '환불률이 3%p 개선되었을 때',
      ),
      buildSensitivity(
        'refund-up',
        '환불률 +3pp',
        { refundRate: parsedPlannerRefundRate + 3 },
        '환불률이 3%p 악화되었을 때',
      ),
    ]
  }, [
    hasPlannerInput,
    hasRuleInput,
    parsedPlatformFee,
    parsedPlannerAvgTicket,
    parsedPlannerRefundRate,
    parsedPlannerTransactionCount,
    parsedRefundRetention,
    planningProjection,
    platformRevenue,
    hostPayout,
    revenueSummary,
  ])

  const plannerTargetAdvice = useMemo(() => {
    if (
      parsedPlannerTargetRevenue === null ||
      parsedPlannerTargetRevenue <= 0 ||
      !planningProjection ||
      plannerSensitivityScenarios.length === 0
    )
      return null

    const target = parsedPlannerTargetRevenue

    if (planningProjection.platformRevenueKRW >= target) {
      return {
        level: 'achieved' as const,
        label: '달성',
        message:
          '현재 입력 가정으로 목표 플랫폼 수익을 달성해요. 필요 시 안정성을 위해 환불률 개선만 추가 검토하세요.',
      }
    }

    const feasibleScenarios = plannerSensitivityScenarios
      .map((scenario) => ({
        ...scenario,
        shortfall: Math.max(0, target - scenario.platformRevenueKRW),
      }))
      .filter((scenario) => scenario.platformRevenueKRW > planningProjection.platformRevenueKRW)
      .sort((a, b) => a.shortfall - b.shortfall)

    if (feasibleScenarios.length > 0) {
      const best = feasibleScenarios[0]
      return {
        level: 'improvable' as const,
        label: '권장',
        message: `${best.label} 시나리오를 적용하면 목표 수익에 ${best.shortfall.toLocaleString()}원 부족하거나 초과 ${
          best.platformRevenueKRW >= target ? '달성 포인트에 근접' : ''
        }합니다.`,
      }
    }

    const best = plannerSensitivityScenarios
      .map((scenario) => ({
        ...scenario,
        shortfall: target - scenario.platformRevenueKRW,
      }))
      .sort((a, b) => b.platformRevenueKRW - a.platformRevenueKRW)[0]
    if (!best) return null

    return {
      level: 'insufficient' as const,
      label: '보완',
      message: `기본 민감도 범위에서 가장 높은 수익 시나리오로도 ${best.shortfall.toLocaleString()}원 부족해요.`,
    }
  }, [
    parsedPlannerTargetRevenue,
    plannerSensitivityScenarios,
    planningProjection?.platformRevenueKRW,
  ])

  const projected = useMemo(() => {
    if (!hasRuleInput || !revenueSummary) return null
    if (parsedPlatformFee === null || parsedRefundRetention === null) return null
    const nextPlatformFee = Math.round((totalPaid * parsedPlatformFee) / 100)
    const nextRefundRetention = Math.round((totalRefunded * parsedRefundRetention) / 100)
    const nextPlatformRevenue = nextPlatformFee + nextRefundRetention
    const nextHostPayout = Math.max(totalPaid - nextPlatformFee, 0)
    const currentHostPayout = revenueSummary.hostPayoutKRW
    return {
      nextPlatformFee,
      nextRefundRetention,
      nextPlatformRevenue,
      nextHostPayout,
      hostRevenueDelta: nextHostPayout - currentHostPayout,
      platformRevenueDelta: nextPlatformRevenue - platformRevenue,
    }
  }, [
    hasRuleInput,
    revenueSummary,
    totalPaid,
    totalRefunded,
    parsedPlatformFee,
    parsedRefundRetention,
    platformRevenue,
  ])

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>🛡️ 어드민 콘솔</h1>
        <p>신고 큐 운영 · 수익 정책 · 매출 점검</p>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: 'var(--color-danger)' }}>
            {openCount}
          </span>
          <span className={styles.statLabel}>미처리</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: 'var(--brand-gold-600, #B8891E)' }}>
            {reviewingCount}
          </span>
          <span className={styles.statLabel}>검토 중</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{openCount + reviewingCount}</span>
          <span className={styles.statLabel}>처리 대기</span>
        </div>
      </div>

      <section className={styles.revenueSection}>
        <Card padding="lg" className={styles.revenuePanel}>
          <h2 className={styles.sectionTitle}>수익 운영 대시보드</h2>
          <p className={styles.sectionNote}>
            지표는 결제 전체 기준이며, 필터는 생성일 기준으로 계산됩니다.
          </p>
          <p className={styles.sectionNote}>
            경고 임계값: 환불률 경고 {monitoringThresholds.warningRefundRatePercent}% / 위험{' '}
            {monitoringThresholds.dangerRefundRatePercent}% · 파티 집중도{' '}
            {monitoringThresholds.topPartyConcentrationPercent}%
          </p>
          {revenueHealthScore ? (
            <div className={styles.healthScorePanel}>
              <div className={styles.healthScoreHeader}>
                <strong className={styles.healthScoreTitle}>수익 건전성 점수</strong>
                <span
                  className={`${styles.healthScoreBadge} ${
                    revenueHealthScore.level === 'good'
                      ? styles.healthScoreBadgeGood
                      : revenueHealthScore.level === 'warning'
                        ? styles.healthScoreBadgeWarning
                        : styles.healthScoreBadgeCritical
                  }`}
                >
                  {revenueHealthScore.score}점 · {revenueHealthScore.levelLabel}
                </span>
              </div>
              <p className={styles.sectionNote}>{revenueHealthScore.summary}</p>
              <ul className={styles.healthScoreReasonList}>
                {revenueHealthScore.reasons.map((reason) => (
                  <li key={reason} className={styles.healthScoreReasonItem}>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {monitoringThresholdSimulation ? (
            <div className={styles.monitoringSimulationPanel}>
              <div className={styles.monitoringSimulationHeader}>
                <strong className={styles.sectionTitle}>임계치 시뮬레이션</strong>
                <span
                  className={`${styles.monitoringSimulationBadge} ${
                    monitoringThresholdSimulation.scoreDelta > 0
                      ? styles.monitoringSimulationBadgeGood
                      : monitoringThresholdSimulation.scoreDelta < 0
                        ? styles.monitoringSimulationBadgeCritical
                        : styles.monitoringSimulationBadgeNeutral
                  }`}
                >
                  {monitoringThresholdSimulation.simulatedHealthScore.score}점 ·{' '}
                  {monitoringThresholdSimulation.simulatedHealthScore.levelLabel}
                  {monitoringThresholdSimulation.scoreDelta > 0
                    ? ` (+${monitoringThresholdSimulation.scoreDelta})`
                    : monitoringThresholdSimulation.scoreDelta < 0
                      ? ` (${monitoringThresholdSimulation.scoreDelta})`
                      : ' (동률)'}
                </span>
              </div>
              <p className={styles.sectionNote}>
                현재 기준과 비교해 수익 건전성 점수가
                {monitoringThresholdSimulation.scoreDelta >= 0 ? ' 개선' : ' 악화'}돼요.
              </p>
              <div className={styles.monitoringSimulationGrid}>
                <div className={styles.monitoringSimulationItem}>
                  <span className={styles.monitoringSimulationLabel}>현재 환불률</span>
                  <strong>{monitoringThresholdSimulation.refundSignal.current.toFixed(1)}%</strong>
                  <span className={styles.monitoringSimulationSubLabel}>
                    임계치(경고 {monitoringThresholdSimulation.refundSignal.warning}% / 위험{' '}
                    {monitoringThresholdSimulation.refundSignal.danger}%)
                  </span>
                  <span className={styles.monitoringSimulationState}>
                    상태:{' '}
                    {monitoringThresholdSimulation.refundSignal.tone === 'good'
                      ? '양호'
                      : monitoringThresholdSimulation.refundSignal.tone === 'warning'
                        ? '주의'
                        : '위험'}
                    {' · '}
                    {monitoringThresholdSimulation.refundSignal.tone === 'good'
                      ? `안전 여유 ${Math.max(
                          monitoringThresholdSimulation.refundSignal.remainingToWarning,
                          monitoringThresholdSimulation.refundSignal.remainingToDanger,
                        ).toFixed(1)}pp`
                      : monitoringThresholdSimulation.refundSignal.tone === 'warning'
                        ? `위험선까지 ${Math.max(
                            monitoringThresholdSimulation.refundSignal.remainingToDanger,
                            0,
                          ).toFixed(1)}pp`
                        : `위험 임계 초과 ${Math.max(
                            0,
                            -monitoringThresholdSimulation.refundSignal.remainingToDanger,
                          ).toFixed(1)}pp`}
                  </span>
                </div>
                <div className={styles.monitoringSimulationItem}>
                  <span className={styles.monitoringSimulationLabel}>Top 파티 집중도</span>
                  <strong>
                    {monitoringThresholdSimulation.concentrationSignal.current.toFixed(1)}%
                  </strong>
                  <span className={styles.monitoringSimulationSubLabel}>
                    임계치 {monitoringThresholdSimulation.concentrationSignal.threshold}%
                  </span>
                  <span className={styles.monitoringSimulationState}>
                    상태:{' '}
                    {monitoringThresholdSimulation.concentrationSignal.tone === 'good'
                      ? '양호'
                      : '위험'}
                    {monitoringThresholdSimulation.concentrationSignal.tone === 'good'
                      ? ` · 여유 ${Math.max(
                          monitoringThresholdSimulation.concentrationSignal.remainingToLimit,
                          0,
                        ).toFixed(1)}pp`
                      : ` · 초과 ${Math.abs(
                          monitoringThresholdSimulation.concentrationSignal.remainingToLimit,
                        ).toFixed(1)}pp`}
                  </span>
                </div>
                <div className={styles.monitoringSimulationItem}>
                  <span className={styles.monitoringSimulationLabel}>건전성 요약</span>
                  <strong>{monitoringThresholdSimulation.simulatedHealthScore.summary}</strong>
                  <span className={styles.monitoringSimulationSubLabel}>
                    현재 대비: {monitoringThresholdSimulation.currentHealthScore.score}점 →
                    {monitoringThresholdSimulation.simulatedHealthScore.score}점
                  </span>
                  <span className={styles.monitoringSimulationState}>
                    {monitoringThresholdSimulation.simulatedHealthScore.reasons[0] ??
                      '추가 알림 없음'}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className={styles.filterPanel}>
            <label className={styles.filterField}>
              <span>비교 모드</span>
              <select
                value={summaryCompareMode}
                onChange={(event) =>
                  setSummaryCompareMode(event.target.value as AdminSummaryCompareMode)
                }
              >
                <option value="previous_period">직전 기간</option>
                <option value="previous_month">전월</option>
                <option value="previous_year">전년</option>
                <option value="none">비교 미사용</option>
              </select>
            </label>
            <label className={styles.filterField}>
              <span>파티 필터(ID)</span>
              <input
                type="text"
                value={summaryPartyId}
                onChange={(event) => setSummaryPartyId(event.target.value.trim())}
                placeholder="예: p_coffee"
                maxLength={40}
              />
            </label>
            <label className={styles.filterField}>
              <span>조회 시작</span>
              <input
                type="date"
                value={summaryFrom}
                onChange={(event) => setSummaryFrom(event.target.value)}
                placeholder="예: 2026-06-01"
              />
            </label>
            <label className={styles.filterField}>
              <span>조회 종료</span>
              <input
                type="date"
                value={summaryTo}
                onChange={(event) => setSummaryTo(event.target.value)}
                placeholder="예: 2026-06-01"
              />
            </label>
            <label className={styles.filterField}>
              <span>Top 파티 표시 수</span>
              <input
                type="number"
                min={1}
                max={50}
                value={topPartyLimit}
                onChange={(event) => setTopPartyLimit(event.target.value)}
                placeholder="12"
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
            </div>
          </div>

          {summaryFrom && summaryTo ? (
            isSummaryDateRangeValid ? (
              <p className={styles.sectionNote}>
                조회 구간: {summaryLabelFrom} ~ {summaryLabelTo}
              </p>
            ) : (
              <p className={styles.ruleHint}>시작일이 종료일보다 늦으면 안 돼요.</p>
            )
          ) : (
            <p className={styles.sectionNote}>조회 구간 미설정 시 전체 기간이 적용돼요.</p>
          )}

          <div className={styles.ruleMeta}>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportRevenueSummary}
              disabled={isRevenueSummaryLoading || !revenueSummary}
            >
              수익 리포트 CSV 다운로드
            </Button>
          </div>

          {healthAlerts.length > 0 && (
            <ul className={styles.alertList}>
              {healthAlerts.map((alert) => (
                <li key={alert.code} className={styles.alertItem}>
                  <span
                    className={`${styles.alertBadge} ${
                      alert.level === 'danger' ? styles.alertBadgeDanger : styles.alertBadgeWarning
                    }`}
                  >
                    {alert.level === 'danger' ? '위험' : '주의'}
                  </span>
                  <div className={styles.alertBody}>
                    <strong>{alert.title}</strong>
                    <span>{alert.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>총 결제액</span>
              <strong className={styles.kpiValue}>{totalPaid.toLocaleString()}원</strong>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>총 환불액</span>
              <strong className={styles.kpiValue}>-{totalRefunded.toLocaleString()}원</strong>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>실 결제액</span>
              <strong className={styles.kpiValue}>{netSales.toLocaleString()}원</strong>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>플랫폼 수익</span>
              <strong className={styles.kpiValue}>{platformRevenue.toLocaleString()}원</strong>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>호스트 정산</span>
              <strong className={styles.kpiValue}>{hostPayout.toLocaleString()}원</strong>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>평균 결제액</span>
              <strong className={styles.kpiValue}>{avgTicket.toLocaleString()}원</strong>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>총 거래 건</span>
              <strong className={styles.kpiValue}>{totalTickets.toLocaleString()}</strong>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>환불률</span>
              <strong className={styles.kpiValue}>{refundRatePercent.toFixed(1)}%</strong>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>운영 파티</span>
              <strong className={styles.kpiValue}>{partyCount.toLocaleString()}개</strong>
            </div>
          </div>

          {hasPreviousPeriod && previousPeriod ? (
            <div className={styles.kpiGrid}>
              {trendComparisonKpis.map((kpi) => {
                const trend = deltaTone(kpi.percentDelta)
                const deltaText = formatDeltaPercent(kpi.percentDelta, !!kpi.isRatePoint)
                const currentText = formatKpiValue(kpi.currentValue, kpi.unit)
                const previousText = formatKpiValue(kpi.previousValue, kpi.unit)
                const deltaClassName =
                  trend === 'up'
                    ? styles.kpiTrendUp
                    : trend === 'down'
                      ? styles.kpiTrendDown
                      : trend === 'flat'
                        ? styles.kpiTrendFlat
                        : styles.kpiTrendNone

                return (
                  <div className={styles.kpiCard} key={kpi.label}>
                    <span className={styles.kpiLabel}>
                      {comparisonLabel} {kpi.label}
                    </span>
                    <strong className={styles.kpiValue}>{currentText}</strong>
                    <div className={styles.kpiCompareMeta}>
                      <span className={styles.kpiSubLabel}>이전 {previousText}</span>
                      <span className={`${styles.kpiTrendDelta} ${deltaClassName}`}>
                        {deltaText}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}

          <div className={styles.plannerSection}>
            <h3 className={styles.sectionTitle}>수익 모델 실험실</h3>
            <p className={styles.sectionNote}>
              현재 수수료율/환불보전율을 기준으로 가정 조건을 바꿔보며 시뮬레이션할 수 있어요.
            </p>

            <form
              className={styles.ruleForm}
              onSubmit={(event) => {
                event.preventDefault()
              }}
            >
              <div className={styles.plannerInputs}>
                <label className={styles.ruleField}>
                  <span>가정 거래 건수</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={plannerTransactionCount}
                    onChange={(event) => setPlannerTransactionCount(event.target.value)}
                    placeholder="예: 120"
                  />
                </label>
                <label className={styles.ruleField}>
                  <span>가정 평균 결제액 (원)</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={plannerAvgTicket}
                    onChange={(event) => setPlannerAvgTicket(event.target.value)}
                    placeholder="예: 18000"
                  />
                </label>
                <label className={styles.ruleField}>
                  <span>가정 환불률 (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={plannerRefundRate}
                    onChange={(event) => setPlannerRefundRate(event.target.value)}
                    placeholder="예: 8"
                  />
                </label>
                <label className={styles.ruleField}>
                  <span>목표 플랫폼 수익 (선택)</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={plannerTargetPlatformRevenue}
                    onChange={(event) => setPlannerTargetPlatformRevenue(event.target.value)}
                    placeholder="예: 1200000"
                  />
                </label>
              </div>
              <div className={styles.ruleMeta}>
                <span>
                  현재 값 기준: 총거래 {totalTickets.toLocaleString()}건 · 평균결제{' '}
                  {avgTicket.toLocaleString()}원 · 환불률 {refundRatePercent.toFixed(1)}%
                </span>
                <div className={styles.filterActions}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPlannerTransactionCount(String(totalTickets))
                      setPlannerAvgTicket(String(avgTicket))
                      setPlannerRefundRate(String(refundRatePercent.toFixed(1)))
                      setPlannerTargetPlatformRevenue(String(platformRevenue))
                    }}
                    disabled={!revenueSummary}
                  >
                    현재 지표로 채우기
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPlannerTransactionCount('')
                      setPlannerAvgTicket('')
                      setPlannerRefundRate('')
                      setPlannerTargetPlatformRevenue('')
                    }}
                  >
                    초기화
                  </Button>
                </div>
              </div>
            </form>

            {planningProjection ? (
              <>
                <div className={styles.plannerMetaRow}>
                  <span className={styles.sectionNote}>
                    수익 분배 점유율:
                    <strong className={styles.plannerMetaStrong}>
                      {' '}
                      {planningProjection.platformShareRate + planningProjection.hostShareRate}%
                    </strong>
                  </span>
                  {parsedPlannerTargetRevenue !== null &&
                  plannerTargetAchievementPercent !== null ? (
                    <span className={styles.plannerTargetBadge}>
                      목표 플랫폼 수익 대비 달성률: {plannerTargetAchievementPercent.toFixed(1)}%
                      {plannerTargetAchievementPercent >= 100 ? ' (달성)' : ' (미달성)'}
                    </span>
                  ) : null}
                </div>
                {plannerTargetAdvice ? (
                  <p
                    className={`${styles.sectionNote} ${plannerTargetAdvice.level === 'insufficient' ? styles.plannerTargetBadge : ''}`}
                  >
                    {plannerTargetAdvice.message}
                  </p>
                ) : null}
                <div className={styles.plannerResultGrid}>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>예상 총 결제액</span>
                    <strong className={styles.kpiValue}>
                      {planningProjection.projectedGrossPaidKRW.toLocaleString()}원
                    </strong>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>예상 환불액</span>
                    <strong className={styles.kpiValue}>
                      -{planningProjection.projectedGrossRefundedKRW.toLocaleString()}원
                    </strong>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>예상 플랫폼 수익</span>
                    <strong className={styles.kpiValue}>
                      {planningProjection.platformRevenueKRW.toLocaleString()}원
                    </strong>
                    <div className={styles.kpiCompareMeta}>
                      <span className={styles.kpiSubLabel}>현재 대비</span>
                      <span
                        className={`${styles.kpiTrendDelta} ${
                          planningProjection.platformDeltaKRW > 0
                            ? styles.kpiTrendUp
                            : planningProjection.platformDeltaKRW < 0
                              ? styles.kpiTrendDown
                              : styles.kpiTrendFlat
                        }`}
                      >
                        {planningProjection.platformDeltaKRW > 0 ? '+' : ''}
                        {planningProjection.platformDeltaKRW.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>예상 호스트 정산</span>
                    <strong className={styles.kpiValue}>
                      {planningProjection.hostPayoutKRW.toLocaleString()}원
                    </strong>
                    <div className={styles.kpiCompareMeta}>
                      <span className={styles.kpiSubLabel}>현재 대비</span>
                      <span
                        className={`${styles.kpiTrendDelta} ${
                          planningProjection.hostPayoutDeltaKRW > 0
                            ? styles.kpiTrendUp
                            : planningProjection.hostPayoutDeltaKRW < 0
                              ? styles.kpiTrendDown
                              : styles.kpiTrendFlat
                        }`}
                      >
                        {planningProjection.hostPayoutDeltaKRW > 0 ? '+' : ''}
                        {planningProjection.hostPayoutDeltaKRW.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>플랫폼 수익 분배율</span>
                    <strong className={styles.kpiValue}>
                      {planningProjection.platformShareRate}%
                    </strong>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>호스트 정산 분배율</span>
                    <strong className={styles.kpiValue}>{planningProjection.hostShareRate}%</strong>
                  </div>
                </div>
                {plannerFeeRangeText ? (
                  <p className={styles.plannerDeltaHint}>{plannerFeeRangeText}</p>
                ) : null}
                {plannerSensitivityScenarios.length > 0 ? (
                  <div className={styles.plannerSensitivitySection}>
                    <p className={styles.sectionNote}>민감도 분석</p>
                    <div className={styles.plannerSensitivityGrid}>
                      {plannerSensitivityScenarios.map((scenario) => (
                        <div key={scenario.id} className={styles.kpiCard}>
                          <span className={styles.kpiLabel}>{scenario.label}</span>
                          <strong className={styles.kpiValue}>
                            {scenario.platformRevenueKRW.toLocaleString()}원
                          </strong>
                          <div className={styles.kpiCompareMeta}>
                            <span className={styles.kpiSubLabel}>{scenario.note}</span>
                            <span
                              className={`${styles.plannerDeltaText} ${
                                scenario.platformRevenueDeltaKRW > 0
                                  ? styles.kpiTrendUp
                                  : scenario.platformRevenueDeltaKRW < 0
                                    ? styles.kpiTrendDown
                                    : styles.kpiTrendFlat
                              }`}
                            >
                              플랫폼 {scenario.platformRevenueDeltaKRW > 0 ? '+' : ''}
                              {scenario.platformRevenueDeltaKRW.toLocaleString()}원
                            </span>
                          </div>
                          <div className={styles.kpiCompareMeta}>
                            <span className={styles.kpiSubLabel}>예상 정산</span>
                            <span className={styles.kpiSubLabel}>
                              {scenario.hostPayoutKRW.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className={styles.ruleHint}>
                거래 건수, 평균 결제액, 환불률을 입력하면 시뮬레이션을 확인할 수 있어요.
              </p>
            )}
          </div>

          <form
            className={styles.ruleForm}
            onSubmit={(event) => {
              event.preventDefault()
              if (!hasRuleInput || saveRule.isPending) return
              saveRule.mutate()
            }}
          >
            <label className={styles.ruleField}>
              <span>플랫폼 수수료율 (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={platformFeePercent}
                onChange={(event) => setPlatformFeePercent(event.target.value)}
                placeholder="예: 8"
              />
            </label>
            <label className={styles.ruleField}>
              <span>환불 수수료 반영율 (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={refundRetentionPercent}
                onChange={(event) => setRefundRetentionPercent(event.target.value)}
                placeholder="예: 0"
              />
            </label>
            <label className={styles.ruleField}>
              <span>변경 사유(선택)</span>
              <input
                type="text"
                value={ruleChangeReason}
                onChange={(event) => setRuleChangeReason(event.target.value)}
                placeholder="예: 환불 패턴 변화 대응"
                maxLength={120}
              />
            </label>
            <div className={styles.ruleMeta}>
              <span>
                현재 반영값: 수수료 {Number(revenueRules?.platformFeePercent ?? 0)}% / 환불보전{' '}
                {Number(revenueRules?.refundRetentionPercent ?? 0)}%
              </span>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={
                  !hasRuleInput || saveRule.isPending || isRevenueRuleLoading || !revenueSummary
                }
                title={revenueSummary ? '' : '요약 수치를 먼저 조회해 주세요'}
              >
                {saveRule.isPending ? '저장 중...' : '수익 정책 저장'}
              </Button>
            </div>
            {projected ? (
              <div className={styles.ruleMeta}>
                <span>
                  변경 시나리오(현재 조회 기준): 플랫폼 수익{' '}
                  {projected.nextPlatformRevenue.toLocaleString()}원
                  {projected.platformRevenueDelta > 0
                    ? ` (+${projected.platformRevenueDelta.toLocaleString()}원)`
                    : ` (${projected.platformRevenueDelta.toLocaleString()}원)`}
                </span>
                <span>
                  호스트 정산 {projected.nextHostPayout.toLocaleString()}원 (
                  {projected.hostRevenueDelta >= 0 ? '+' : ''}
                  {projected.hostRevenueDelta.toLocaleString()}원)
                </span>
              </div>
            ) : null}
            {!hasRuleInput && (
              <p className={styles.ruleHint}>수수료는 0~100 사이 숫자로 입력해 주세요.</p>
            )}
          </form>

          <form
            className={styles.ruleForm}
            onSubmit={(event) => {
              event.preventDefault()
              if (
                !hasMonitoringInput ||
                !hasMonitoringInputChanged ||
                saveMonitoringPolicy.isPending
              )
                return
              saveMonitoringPolicy.mutate()
            }}
          >
            <label className={styles.ruleField}>
              <span>경고 환불률 임계값 (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={monitoringWarningRate}
                onChange={(event) => setMonitoringWarningRate(event.target.value)}
                placeholder="예: 30"
              />
            </label>
            <label className={styles.ruleField}>
              <span>위험 환불률 임계값 (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={monitoringDangerRate}
                onChange={(event) => setMonitoringDangerRate(event.target.value)}
                placeholder="예: 45"
              />
            </label>
            <label className={styles.ruleField}>
              <span>파티 집중도 임계값 (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={monitoringTopPartyRate}
                onChange={(event) => setMonitoringTopPartyRate(event.target.value)}
                placeholder="예: 60"
              />
            </label>
            <label className={styles.ruleField}>
              <span>변경 사유(선택)</span>
              <input
                type="text"
                value={monitoringPolicyReason}
                onChange={(event) => setMonitoringPolicyReason(event.target.value)}
                placeholder="예: 경고 기준 조정"
                maxLength={120}
              />
            </label>
            <div className={styles.ruleMeta}>
              <span>
                현재 반영값: 경고 {monitoringThresholds.warningRefundRatePercent}% / 위험{' '}
                {monitoringThresholds.dangerRefundRatePercent}% · 파티 집중도{' '}
                {monitoringThresholds.topPartyConcentrationPercent}%
              </span>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={
                  !hasMonitoringInput ||
                  !hasMonitoringInputChanged ||
                  saveMonitoringPolicy.isPending ||
                  isMonitoringPolicyLoading
                }
                title={
                  !hasMonitoringInput
                    ? '임계값은 0~100 사이 숫자로 입력해 주세요.'
                    : hasMonitoringInputChanged
                      ? ''
                      : '현재 값과 동일해요.'
                }
              >
                {saveMonitoringPolicy.isPending ? '저장 중...' : '임계값 정책 저장'}
              </Button>
            </div>
            {!hasMonitoringInput && (
              <p className={styles.ruleHint}>임계값은 0~100 사이 숫자로 입력해 주세요.</p>
            )}
          </form>
        </Card>

        {topParties.length > 0 && (
          <Card padding="lg">
            <h3 className={styles.sectionTitle}>실시간 파티 매출 Top</h3>
            <ul className={styles.topPartyList}>
              {topParties.map((party) => (
                <li key={party.partyId} className={styles.topPartyItem}>
                  <div>
                    <strong>{party.partyTitle}</strong>
                    <span className={styles.topPartyMeta}>
                      결제 {party.paidCount}건 · 환불 {party.refundedCount}건
                    </span>
                    <span className={styles.topPartyMeta}>
                      순매출 {party.netGrossKRW.toLocaleString()}원 · 환불률{' '}
                      {party.refundRatePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className={styles.topPartyAmount}>
                    <span>매출 {party.paidGrossKRW.toLocaleString()}원</span>
                    <span>수수료 {party.platformFeeKRW.toLocaleString()}원</span>
                    <span>호스트 정산 {party.hostPayoutKRW.toLocaleString()}원</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSummaryPartyId(party.partyId)}
                    >
                      이 파티만 보기
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {isRevenueSummaryLoading && <Loading />}
          </Card>
        )}

        <Card padding="lg">
          <h3 className={styles.sectionTitle}>수익 정책 변경 이력</h3>
          <p className={styles.sectionNote}>
            최근 정책 변경 내역입니다. 운영 판단 근거를 남겨두기 위한 기록용 데이터입니다.
          </p>
          {isRevenueRuleHistoryLoading ? (
            <Loading />
          ) : !revenueRuleHistory || revenueRuleHistory.length === 0 ? (
            <p className={styles.ruleHint}>변경 이력이 없어요.</p>
          ) : (
            <ul className={styles.historyList}>
              {revenueRuleHistory.map((history) => (
                <li key={history.id} className={styles.historyItem}>
                  <span className={styles.historyTime}>
                    {new Date(history.changedAt).toLocaleString('ko-KR')}
                  </span>
                  <span className={styles.historyMeta}>
                    플랫폼 수수료 {history.fromPlatformFeePercent}% → {history.toPlatformFeePercent}
                    %
                  </span>
                  <span className={styles.historyMeta}>
                    환불보전 {history.fromRefundRetentionPercent}% →{' '}
                    {history.toRefundRetentionPercent}%
                  </span>
                  <span className={styles.historyMeta}>사유: {history.reason ?? '사유 없음'}</span>
                  <div className={styles.historyActions}>
                    <label className={styles.historyField}>
                      <span className={styles.historyFieldLabel}>롤백 사유(선택)</span>
                      <input
                        type="text"
                        className={styles.historyReasonInput}
                        value={rollbackReasons[history.id] ?? ''}
                        onChange={(event) =>
                          setRollbackReasons((prev) => ({
                            ...prev,
                            [history.id]: event.target.value,
                          }))
                        }
                        placeholder="예: 계산 오류 반영"
                        maxLength={120}
                      />
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        rollbackRule.mutate({
                          historyId: history.id,
                          ...(rollbackReasons[history.id]?.trim()
                            ? { reason: rollbackReasons[history.id].trim() }
                            : {}),
                        })
                      }
                      disabled={rollbackRule.isPending}
                    >
                      {rollbackRule.isPending ? '롤백 중...' : '이 설정으로 롤백'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card padding="lg">
          <h3 className={styles.sectionTitle}>모니터링 임계값 변경 이력</h3>
          <p className={styles.sectionNote}>
            환불률 임계값/파티 집중 임계값 변경 이력입니다. 이전 설정으로 즉시 롤백할 수 있어요.
          </p>
          {isMonitoringPolicyHistoryLoading ? (
            <Loading />
          ) : !monitoringPolicyHistory || monitoringPolicyHistory.length === 0 ? (
            <p className={styles.ruleHint}>모니터링 정책 변경 이력이 없어요.</p>
          ) : (
            <ul className={styles.historyList}>
              {monitoringPolicyHistory.map((history) => (
                <li key={history.id} className={styles.historyItem}>
                  {(() => {
                    const simulatedHealthScore = revenueSummary
                      ? computeRevenueHealthScore({
                          totalPaidKRW: totalPaid,
                          totalTickets,
                          refundRatePercent,
                          platformRevenueKRW: platformRevenue,
                          topPartyConcentrationPercent,
                          monitoring: {
                            warningRefundRatePercent: history.toWarningRefundRatePercent,
                            dangerRefundRatePercent: history.toDangerRefundRatePercent,
                            topPartyConcentrationPercent: history.toTopPartyConcentrationPercent,
                          },
                          netSalesChangePercent,
                        })
                      : null
                    return (
                      <span
                        className={`${styles.historyScoreBadge} ${
                          simulatedHealthScore?.level === 'good'
                            ? styles.historyScoreBadgeGood
                            : simulatedHealthScore?.level === 'warning'
                              ? styles.historyScoreBadgeWarning
                              : simulatedHealthScore?.level === 'critical'
                                ? styles.historyScoreBadgeCritical
                                : styles.historyScoreBadgeNeutral
                        }`}
                      >
                        {simulatedHealthScore
                          ? `이 설정 적용 시 수익 점수: ${simulatedHealthScore.score}점`
                          : '실시간 점수 계산 불가'}
                      </span>
                    )
                  })()}
                  <span className={styles.historyTime}>
                    {new Date(history.changedAt).toLocaleString('ko-KR')}
                  </span>
                  <span className={styles.historyMeta}>
                    경고 임계값 {history.fromWarningRefundRatePercent}% →{' '}
                    {history.toWarningRefundRatePercent}%
                  </span>
                  <span className={styles.historyMeta}>
                    위험 임계값 {history.fromDangerRefundRatePercent}% →{' '}
                    {history.toDangerRefundRatePercent}%
                  </span>
                  <span className={styles.historyMeta}>
                    집중 임계값 {history.fromTopPartyConcentrationPercent}% →{' '}
                    {history.toTopPartyConcentrationPercent}%
                  </span>
                  <span className={styles.historyMeta}>사유: {history.reason ?? '사유 없음'}</span>
                  <div className={styles.historyActions}>
                    <label className={styles.historyField}>
                      <span className={styles.historyFieldLabel}>롤백 사유(선택)</span>
                      <input
                        type="text"
                        className={styles.historyReasonInput}
                        value={monitoringRollbackReasons[history.id] ?? ''}
                        onChange={(event) =>
                          setMonitoringRollbackReasons((prev) => ({
                            ...prev,
                            [history.id]: event.target.value,
                          }))
                        }
                        placeholder="예: 임시 조치로 롤백"
                        maxLength={120}
                      />
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        rollbackMonitoringPolicy.mutate({
                          historyId: history.id,
                          ...(monitoringRollbackReasons[history.id]?.trim()
                            ? { reason: monitoringRollbackReasons[history.id].trim() }
                            : {}),
                        })
                      }
                      disabled={rollbackMonitoringPolicy.isPending}
                    >
                      {rollbackMonitoringPolicy.isPending ? '롤백 중...' : '이 설정으로 롤백'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          <Tabs
            tabs={[
              { value: 'open', label: `미처리${openCount > 0 ? ` (${openCount})` : ''}` },
              {
                value: 'reviewing',
                label: `검토 중${reviewingCount > 0 ? ` (${reviewingCount})` : ''}`,
              },
              { value: 'resolved', label: '처리 완료' },
            ]}
            value={tab}
            onChange={(v) => setTab(v as TabKey)}
          />
          <div className={styles.list}>
            {isLoading ? (
              <Loading />
            ) : !data || data.length === 0 ? (
              <EmptyState emoji="🕊️" title="처리할 신고가 없어요" />
            ) : (
              data.map((r) => (
                <Card key={r.id} padding="lg">
                  <div className={styles.head2}>
                    <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    <Badge tone="neutral">{KIND_LABEL[r.kind] ?? r.kind}</Badge>
                    <time>{new Date(r.createdAt).toLocaleString('ko-KR')}</time>
                  </div>
                  <p className={styles.body}>{r.body}</p>
                  <dl className={styles.meta}>
                    <div>
                      <dt>신고자</dt>
                      <dd>
                        <Link to={`/hosts/${r.reporter.id}`} className={styles.userLink}>
                          {r.reporter.nickname}
                        </Link>
                      </dd>
                    </div>
                    {r.target && (
                      <div>
                        <dt>대상</dt>
                        <dd>
                          <Link to={`/hosts/${r.target.id}`} className={styles.userLink}>
                            {r.target.nickname}
                          </Link>
                        </dd>
                      </div>
                    )}
                    {r.party && (
                      <div>
                        <dt>파티</dt>
                        <dd>
                          <Link to={`/parties/${r.party.id}`} className={styles.userLink}>
                            {r.party.title}
                          </Link>
                        </dd>
                      </div>
                    )}
                  </dl>
                  {r.status === 'open' && (
                    <div className={styles.actions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => patch.mutate({ id: r.id, status: 'reviewing' })}
                      >
                        검토 시작
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => patch.mutate({ id: r.id, status: 'dismissed' })}
                      >
                        기각
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => patch.mutate({ id: r.id, status: 'resolved' })}
                      >
                        조치 완료
                      </Button>
                    </div>
                  )}
                  {r.status === 'reviewing' && (
                    <div className={styles.actions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => patch.mutate({ id: r.id, status: 'dismissed' })}
                      >
                        기각
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => patch.mutate({ id: r.id, status: 'resolved' })}
                      >
                        조치 완료
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
