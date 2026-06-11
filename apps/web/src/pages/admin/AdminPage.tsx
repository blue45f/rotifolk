import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Tabs } from '@components/ui/Tabs/Tabs'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { api } from '@services/api'
import {
  REVENUE_MONITORING_POLICY,
  computeRevenueHealthScore,
  type RevenueHealthAlertThreshold,
} from '@rotifolk/shared'
import styles from './Admin.module.css'

interface AdminReport {
  id: string
  kind: string
  body: string
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  resolvedNote?: string | null
  autoHiddenAt?: string | null
  reporter: { id: string; nickname: string }
  target: { id: string; nickname: string } | null
  party: { id: string; title: string } | null
  communityPost: { id: string; title: string } | null
  communityComment: { id: string; postId: string; body: string } | null
  auditTrail?: Array<{
    id: string
    action: string
    note: string | null
    actorId: string | null
    createdAt: string
  }>
  createdAt: string
}

interface RevenueRuleConfig {
  platformFeePercent: number
  refundRetentionPercent: number
  minimumHostPayoutPercent: number
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
  fromMinimumHostPayoutPercent: number
  toMinimumHostPayoutPercent: number
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

interface MonitoringPolicyUpdatePayload {
  warningRefundRatePercent: number
  dangerRefundRatePercent: number
  topPartyConcentrationPercent: number
  reason?: string
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

interface RevenueRulePreset {
  id: string
  label: string
  description: string
  platformFeePercent: number
  refundRetentionPercent: number
  minimumHostPayoutPercent?: number
}

interface RevenueRulePresetProjection {
  preset: RevenueRulePreset
  projection: RevenuePlanningProjection
  isCurrent: boolean
  projectedHealthScore: RevenueHealthScore | null
  healthScoreDelta: number | null
}

interface RevenueRuleUpdatePayload {
  platformFeePercent: number
  refundRetentionPercent: number
  minimumHostPayoutPercent: number
  reason?: string
}

interface RevenueRuleSimulationRequest {
  platformFeePercent: number
  refundRetentionPercent: number
  minimumHostPayoutPercent: number
  from?: string
  to?: string
  partyId?: string
  topLimit: number
}

interface RevenueRuleSimulationResponse {
  currentRules: RevenueRuleConfig
  nextRules: RevenueRuleConfig
  currentHealthScore: RevenueHealthScore
  simulatedHealthScore: RevenueHealthScore
  scoreDelta: number
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
  transactionCount: number
  projectedHealthScore: RevenueHealthScore | null
  healthScoreDelta: number | null
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

interface RevenueInsight {
  tone: 'success' | 'warning' | 'danger'
  title: string
  description: string
  action: string
  actionId?: RevenueInsightActionId
  actionLabel?: string
  priority: number
}

type RevenueInsightActionId =
  | 'refund-monitoring-relax'
  | 'concentration-cap-relax'
  | 'minimum-host-payout-lower'
  | 'preset-defensive'

interface RevenueInsightExecutionPlan {
  queue: RevenueInsightExecutionQueueStep[]
}

type RevenueInsightExecutionQueueStep =
  | {
      type: 'monitoring'
      actionId: RevenueInsightActionId
      title: string
      priority: number
      payload: MonitoringPolicyUpdatePayload
    }
  | {
      type: 'rule'
      actionId: RevenueInsightActionId
      title: string
      priority: number
      payload: RevenueRuleUpdatePayload
    }

type RevenueInsightExecutionPlanWithQueue = RevenueInsightExecutionPlan & {
  queue: RevenueInsightExecutionQueueStep[]
}

type RevenueInsightExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'

type RevenueInsightExecutionTimelineStep = RevenueInsightExecutionQueueStep & {
  status: RevenueInsightExecutionStatus
  message?: string
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

const AUDIT_ACTION_LABEL: Record<string, string> = {
  report_created: '신고 접수',
  content_auto_hidden: '자동 숨김',
  status_updated: '상태 변경',
  content_hidden_and_status_updated: '콘텐츠 숨김',
}

const FALLBACK_MONITORING_ALERTS = REVENUE_MONITORING_POLICY.healthAlerts

const REVENUE_RULE_PRESETS: RevenueRulePreset[] = [
  {
    id: 'defensive',
    label: '보수형',
    description: '호스트 정산 부담을 줄이고 안정적으로 운영하고 싶을 때',
    platformFeePercent: 6,
    refundRetentionPercent: 8,
  },
  {
    id: 'balanced',
    label: '균형형',
    description: '수익과 호스트 정산 균형을 맞춘 기본 운영형',
    platformFeePercent: 8,
    refundRetentionPercent: 4,
  },
  {
    id: 'growth',
    label: '성장형',
    description: '단기 수익을 늘려야 할 때 쓰는 공격형 운영형',
    platformFeePercent: 10,
    refundRetentionPercent: 0,
  },
]

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
  hostPayoutKRW: number
  minimumHostPayoutPercent: number
  topPartyConcentrationPercent: number
  netSalesChangePercent: number | null
}): MonitoringThresholdSimulation | null {
  const baseHealthScore = createProjectedRuleHealth({
    totalPaidKRW: args.totalPaidKRW,
    totalTickets: args.totalTickets,
    refundRatePercent: args.refundRatePercent,
    platformRevenueKRW: args.platformRevenueKRW,
    hostPayoutKRW: args.hostPayoutKRW,
    minimumHostPayoutPercent: args.minimumHostPayoutPercent,
    topPartyConcentrationPercent: args.topPartyConcentrationPercent,
    monitoring: args.baseMonitoringThresholds,
    netSalesChangePercent: args.netSalesChangePercent,
  })
  const simulatedHealthScore = createProjectedRuleHealth({
    totalPaidKRW: args.totalPaidKRW,
    totalTickets: args.totalTickets,
    refundRatePercent: args.refundRatePercent,
    platformRevenueKRW: args.platformRevenueKRW,
    hostPayoutKRW: args.hostPayoutKRW,
    minimumHostPayoutPercent: args.minimumHostPayoutPercent,
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

function createProjectedRuleHealth(args: {
  totalPaidKRW: number
  totalTickets: number
  refundRatePercent: number
  platformRevenueKRW: number
  hostPayoutKRW: number
  minimumHostPayoutPercent: number
  topPartyConcentrationPercent: number
  monitoring: RevenueHealthAlertThreshold
  netSalesChangePercent: number | null
}): RevenueHealthScore {
  return computeRevenueHealthScore({
    totalPaidKRW: args.totalPaidKRW,
    totalTickets: args.totalTickets,
    refundRatePercent: args.refundRatePercent,
    platformRevenueKRW: args.platformRevenueKRW,
    hostPayoutKRW: args.hostPayoutKRW,
    minimumHostPayoutPercent: args.minimumHostPayoutPercent,
    topPartyConcentrationPercent: args.topPartyConcentrationPercent,
    monitoring: args.monitoring,
    netSalesChangePercent: args.netSalesChangePercent,
  })
}

export default function AdminPage() {
  const location = useLocation()
  const [tab, setTab] = useState<TabKey>('open')
  const [platformFeePercent, setPlatformFeePercent] = useState('')
  const [refundRetentionPercent, setRefundRetentionPercent] = useState('')
  const [minimumHostPayoutPercent, setMinimumHostPayoutPercent] = useState('')
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
  const [isAutoApplyingInsights, setIsAutoApplyingInsights] = useState(false)
  const [isAutoApplyStopRequested, setIsAutoApplyStopRequested] = useState(false)
  const [autoApplyTimeline, setAutoApplyTimeline] = useState<RevenueInsightExecutionTimelineStep[]>(
    [],
  )
  const [autoApplySummary, setAutoApplySummary] = useState('')
  const [plannerTransactionCount, setPlannerTransactionCount] = useState('')
  const [plannerAvgTicket, setPlannerAvgTicket] = useState('')
  const [plannerRefundRate, setPlannerRefundRate] = useState('')
  const [plannerTargetPlatformRevenue, setPlannerTargetPlatformRevenue] = useState('')
  const platformFeeInputRef = useRef<HTMLInputElement>(null)
  const minimumHostPayoutInputRef = useRef<HTMLInputElement>(null)
  const monitoringWarningInputRef = useRef<HTMLInputElement>(null)
  const autoApplyStopToken = useRef({ requested: false })
  const queryClient = useQueryClient()
  const toast = useToast()
  const adminFrom = encodeURIComponent(
    `${location.pathname}${location.search}${location.hash}` || '/',
  )

  const { data: openData, isError: isOpenReportsError } = useQuery({
    queryKey: ['admin', 'reports', 'open'],
    queryFn: () => api.get<AdminReport[]>('admin/reports?status=open'),
  })
  const { data: reviewingData, isError: isReviewingReportsError } = useQuery({
    queryKey: ['admin', 'reports', 'reviewing'],
    queryFn: () => api.get<AdminReport[]>('admin/reports?status=reviewing'),
  })

  const {
    data: data,
    isLoading,
    isError: isTabReportsError,
  } = useQuery({
    queryKey: ['admin', 'reports', tab],
    queryFn: () => api.get<AdminReport[]>(`admin/reports?status=${tab}`),
  })

  const summaryTopLimit = Number.parseInt(topPartyLimit, 10)
  const isSummaryTopLimitValid =
    Number.isFinite(summaryTopLimit) && summaryTopLimit > 0 && summaryTopLimit <= 50
  const normalizedSummaryTopLimit = isSummaryTopLimitValid ? summaryTopLimit : 12
  const isSummaryDateRangeValid = !summaryFrom || !summaryTo || summaryFrom <= summaryTo
  const parsedPlatformFee = parsePercentInput(platformFeePercent)
  const parsedRefundRetention = parsePercentInput(refundRetentionPercent)
  const parsedMinimumHostPayoutPercent = parsePercentInput(minimumHostPayoutPercent)
  const hasRuleInput =
    parsedPlatformFee !== null &&
    parsedRefundRetention !== null &&
    parsedMinimumHostPayoutPercent !== null
  const summaryQueryParams = useMemo(() => {
    const params: Record<string, string> = {
      compareMode: summaryCompareMode,
      topLimit: String(normalizedSummaryTopLimit),
    }
    if (summaryFrom) params.from = summaryFrom
    if (summaryTo) params.to = summaryTo
    if (summaryPartyId) params.partyId = summaryPartyId
    return params
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
    queryFn: () =>
      api.get<AdminRevenueSummary>('payments/admin/summary', { searchParams: summaryQueryParams }),
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

  const isRuleSimulationEnabled =
    hasRuleInput &&
    isSummaryDateRangeValid &&
    !isRevenueRuleLoading &&
    !!revenueSummary &&
    parsedPlatformFee !== null &&
    parsedRefundRetention !== null
  const ruleSimulation = useQuery({
    queryKey: [
      'admin',
      'payments',
      'revenue-rules',
      'simulate',
      summaryFrom,
      summaryTo,
      summaryPartyId,
      normalizedSummaryTopLimit,
      parsedPlatformFee,
      parsedRefundRetention,
      parsedMinimumHostPayoutPercent,
    ],
    queryFn: () =>
      api.post<RevenueRuleSimulationResponse>('payments/admin/revenue-rules/simulate', {
        platformFeePercent: parsedPlatformFee,
        refundRetentionPercent: parsedRefundRetention,
        minimumHostPayoutPercent: parsedMinimumHostPayoutPercent,
        from: summaryFrom || undefined,
        to: summaryTo || undefined,
        partyId: summaryPartyId || undefined,
        topLimit: normalizedSummaryTopLimit,
      } as RevenueRuleSimulationRequest),
    enabled: isRuleSimulationEnabled,
  })

  useEffect(() => {
    if (!revenueRules) return
    setPlatformFeePercent(String(revenueRules.platformFeePercent))
    setRefundRetentionPercent(String(revenueRules.refundRetentionPercent))
    setMinimumHostPayoutPercent(String(revenueRules.minimumHostPayoutPercent))
  }, [
    revenueRules?.platformFeePercent,
    revenueRules?.refundRetentionPercent,
    revenueRules?.minimumHostPayoutPercent,
  ])
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
    mutationFn: (input: {
      id: string
      status: AdminReport['status']
      hideContent?: boolean
      note?: string
    }) =>
      api.patch(`admin/reports/${input.id}`, {
        status: input.status,
        hideContent: input.hideContent ?? false,
        note: input.note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
      toast.show('신고 상태가 업데이트됐어요.', 'success')
    },
    onError: (error) => toast.show((error as Error).message, 'error'),
  })

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
    mutationFn: (payload: RevenueRuleUpdatePayload) =>
      api.patch<RevenueRuleConfig>('payments/admin/revenue-rules', {
        platformFeePercent: payload.platformFeePercent,
        refundRetentionPercent: payload.refundRetentionPercent,
        minimumHostPayoutPercent: payload.minimumHostPayoutPercent,
        ...(payload.reason?.trim() ? { reason: payload.reason.trim() } : {}),
      }),
    onSuccess: (saved) => {
      setPlatformFeePercent(String(saved.platformFeePercent))
      setRefundRetentionPercent(String(saved.refundRetentionPercent))
      setMinimumHostPayoutPercent(String(saved.minimumHostPayoutPercent))
      setRuleChangeReason('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'revenue-rules'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'revenue-rules', 'history'] })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'payments', 'revenue-rules', 'simulate'],
      })
      toast.show('수익 정책이 반영됐습니다.', 'success')
    },
    onError: (error) => toast.show((error as Error).message, 'error'),
  })

  const applyRevenueRulePreset = (preset: RevenueRulePreset) => {
    if (!revenueSummary || saveRule.isPending) return
    setPlatformFeePercent(String(preset.platformFeePercent))
    setRefundRetentionPercent(String(preset.refundRetentionPercent))
    setMinimumHostPayoutPercent(
      String(
        preset.minimumHostPayoutPercent ??
          parsedMinimumHostPayoutPercent ??
          revenueRules?.minimumHostPayoutPercent ??
          0,
      ),
    )
    setRuleChangeReason('')
    saveRule.mutate({
      platformFeePercent: preset.platformFeePercent,
      refundRetentionPercent: preset.refundRetentionPercent,
      minimumHostPayoutPercent:
        preset.minimumHostPayoutPercent ??
        parsedMinimumHostPayoutPercent ??
        revenueRules?.minimumHostPayoutPercent ??
        0,
      reason: `수익 모델 프리셋 적용: ${preset.label}`,
    })
  }

  const saveMonitoringPolicy = useMutation({
    mutationFn: (input: MonitoringPolicyUpdatePayload) =>
      api.patch<MonitoringPolicyConfig>('payments/admin/monitoring-policy', input),
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

  const buildMonitoringPolicyPayload = (
    input?: Partial<MonitoringPolicyUpdatePayload>,
  ): MonitoringPolicyUpdatePayload => {
    const warning =
      input?.warningRefundRatePercent ??
      parsedMonitoringWarning ??
      monitoringThresholds.warningRefundRatePercent
    const danger =
      input?.dangerRefundRatePercent ??
      parsedMonitoringDanger ??
      monitoringThresholds.dangerRefundRatePercent
    const topParty =
      input?.topPartyConcentrationPercent ??
      parsedMonitoringTopParty ??
      monitoringThresholds.topPartyConcentrationPercent
    const reason =
      typeof input?.reason === 'string' ? input.reason.trim() : monitoringPolicyReason.trim()
    const normalizedWarning = clampPercentToRange(warning)
    const normalizedDanger = clampPercentToRange(danger)
    const normalizedTopParty = clampPercentToRange(topParty)
    const orderedDanger = Math.max(normalizedWarning, normalizedDanger)
    const orderedWarning = Math.min(normalizedWarning, orderedDanger)

    return {
      warningRefundRatePercent: orderedWarning,
      dangerRefundRatePercent: orderedDanger,
      topPartyConcentrationPercent: normalizedTopParty,
      ...(reason ? { reason } : {}),
    }
  }

  const focusMonitoringPolicyInputs = () => {
    requestAnimationFrame(() => {
      monitoringWarningInputRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      monitoringWarningInputRef.current?.focus()
    })
  }

  const applyMonitoringPolicySuggestion = (input: Partial<MonitoringPolicyUpdatePayload>) => {
    const payload = buildMonitoringPolicyPayload(input)

    setMonitoringWarningRate(String(payload.warningRefundRatePercent))
    setMonitoringDangerRate(String(payload.dangerRefundRatePercent))
    setMonitoringTopPartyRate(String(payload.topPartyConcentrationPercent))
    setMonitoringPolicyReason(
      payload.reason || `수익 운영 제안 적용 (${new Date().toLocaleString('ko-KR')})`,
    )

    saveMonitoringPolicy.mutate(payload)
    focusMonitoringPolicyInputs()
  }

  const buildRevenueRulePayload = (
    input?: Partial<RevenueRuleUpdatePayload>,
  ): RevenueRuleUpdatePayload | null => {
    const platformFee =
      input?.platformFeePercent ?? parsedPlatformFee ?? revenueRules?.platformFeePercent
    const refundRetention =
      input?.refundRetentionPercent ?? parsedRefundRetention ?? revenueRules?.refundRetentionPercent
    const minimumHostPayout =
      input?.minimumHostPayoutPercent ??
      parsedMinimumHostPayoutPercent ??
      revenueRules?.minimumHostPayoutPercent ??
      activeMinimumHostPayoutPercent

    if (
      platformFee === null ||
      platformFee === undefined ||
      refundRetention === null ||
      refundRetention === undefined ||
      minimumHostPayout === null ||
      minimumHostPayout === undefined ||
      Number.isNaN(platformFee) ||
      Number.isNaN(refundRetention) ||
      Number.isNaN(minimumHostPayout)
    )
      return null

    return {
      platformFeePercent: roundPercentWithOneDecimal(platformFee),
      refundRetentionPercent: roundPercentWithOneDecimal(refundRetention),
      minimumHostPayoutPercent: roundPercentWithOneDecimal(minimumHostPayout),
      reason: input?.reason?.trim() || ruleChangeReason.trim() || `수익 운영 제안 적용`,
    }
  }

  const focusRuleInputs = (focusOn: 'platformFee' | 'minimumHostPayout' = 'platformFee') => {
    const targetInput =
      focusOn === 'minimumHostPayout'
        ? minimumHostPayoutInputRef.current
        : platformFeeInputRef.current

    requestAnimationFrame(() => {
      targetInput?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      targetInput?.focus()
    })
  }

  const applyRevenueRuleSuggestion = (
    input: Partial<RevenueRuleUpdatePayload>,
    fallbackReason: string,
    focusOn: 'platformFee' | 'minimumHostPayout' = 'platformFee',
  ) => {
    const payload = buildRevenueRulePayload({
      ...input,
      reason: input.reason?.trim() || fallbackReason,
    })
    if (!payload) return
    setRuleChangeReason(payload.reason || fallbackReason)
    setPlatformFeePercent(String(payload.platformFeePercent))
    setRefundRetentionPercent(String(payload.refundRetentionPercent))
    setMinimumHostPayoutPercent(String(payload.minimumHostPayoutPercent))
    saveRule.mutate(payload)
    focusRuleInputs(focusOn)
  }

  const buildRevenueInsightMonitoringPayload = (
    actionId: RevenueInsightActionId,
  ): MonitoringPolicyUpdatePayload | null => {
    if (!revenueSummary || isMonitoringPolicyLoading || !monitoringThresholds) return null

    if (actionId === 'refund-monitoring-relax') {
      const nextDanger = roundPercentWithOneDecimal(Math.min(100, refundRatePercent + 1))
      const nextWarning = roundPercentWithOneDecimal(Math.max(0, nextDanger - 0.8))
      return buildMonitoringPolicyPayload({
        warningRefundRatePercent: nextWarning,
        dangerRefundRatePercent: nextDanger,
        reason: `환불률 ${refundRatePercent.toFixed(1)}% 상승 대응 임시 완화`,
      })
    }

    if (actionId === 'concentration-cap-relax') {
      const nextTopPartyLimit = roundPercentWithOneDecimal(
        Math.min(100, topPartyConcentrationPercent + 6),
      )

      return buildMonitoringPolicyPayload({
        topPartyConcentrationPercent: nextTopPartyLimit,
        reason: `Top 파티 과집중 완화 조치 반영 (${topPartyConcentrationPercent.toFixed(1)}% 현재)`,
      })
    }

    return null
  }

  const buildRevenueInsightRulePayload = (
    actionId: RevenueInsightActionId,
  ): RevenueRuleUpdatePayload | null => {
    if (!revenueSummary || isRevenueRuleLoading || !revenueRules) return null

    if (actionId === 'minimum-host-payout-lower') {
      const hostShareRate =
        totalPaid > 0
          ? roundPercentWithOneDecimal((hostPayout / totalPaid) * 100)
          : activeMinimumHostPayoutPercent
      const nextMinimum = roundPercentWithOneDecimal(Math.max(0, hostShareRate - 1))

      return buildRevenueRulePayload({
        minimumHostPayoutPercent: nextMinimum,
        platformFeePercent: parsedPlatformFee ?? revenueRules.platformFeePercent,
        refundRetentionPercent: parsedRefundRetention ?? revenueRules.refundRetentionPercent,
        reason: `최소 정산율 위험 대응: 목표 정산율 하향`,
      })
    }

    if (actionId === 'preset-defensive') {
      const defensivePreset = REVENUE_RULE_PRESETS.find((preset) => preset.id === 'defensive')
      if (!defensivePreset) return null

      return buildRevenueRulePayload({
        platformFeePercent: defensivePreset.platformFeePercent,
        refundRetentionPercent: defensivePreset.refundRetentionPercent,
        minimumHostPayoutPercent:
          defensivePreset.minimumHostPayoutPercent ??
          parsedMinimumHostPayoutPercent ??
          activeMinimumHostPayoutPercent,
        reason: `수익 모델 프리셋 적용: ${defensivePreset.label}`,
      })
    }

    return null
  }

  const runRevenueInsightAction = (actionId?: RevenueInsightActionId) => {
    if (!actionId || !revenueSummary) return
    if (saveMonitoringPolicy.isPending || saveRule.isPending) return

    const monitoringPayload = buildRevenueInsightMonitoringPayload(actionId)
    if (monitoringPayload) {
      applyMonitoringPolicySuggestion(monitoringPayload)
      return
    }

    const rulePayload = buildRevenueInsightRulePayload(actionId)
    if (!rulePayload) return

    applyRevenueRuleSuggestion(
      rulePayload,
      rulePayload.reason ?? '수익 운영 제안 적용',
      actionId === 'minimum-host-payout-lower' ? 'minimumHostPayout' : 'platformFee',
    )
  }

  const buildRevenueInsightExecutionPlan = (
    insights: RevenueInsight[],
  ): RevenueInsightExecutionPlanWithQueue | null => {
    const executableInsights = insights
      .filter(
        (insight): insight is RevenueInsight & { actionId: RevenueInsightActionId } =>
          !!insight.actionId,
      )
      .sort((a, b) => b.priority - a.priority)

    if (executableInsights.length === 0) return null

    const seenActionIds = new Set<RevenueInsightActionId>()
    const queue: RevenueInsightExecutionQueueStep[] = []

    for (const insight of executableInsights) {
      if (seenActionIds.has(insight.actionId)) continue
      seenActionIds.add(insight.actionId)

      const monitoringPayload = buildRevenueInsightMonitoringPayload(insight.actionId)
      const rulePayload = buildRevenueInsightRulePayload(insight.actionId)

      if (monitoringPayload) {
        queue.push({
          type: 'monitoring',
          actionId: insight.actionId,
          title: insight.title,
          priority: insight.priority,
          payload: monitoringPayload,
        })
        continue
      }

      if (rulePayload) {
        queue.push({
          type: 'rule',
          actionId: insight.actionId,
          title: insight.title,
          priority: insight.priority,
          payload: rulePayload,
        })
      }
    }

    if (queue.length === 0) return null
    return { queue }
  }

  const buildExecutionTimelineStep = (
    step: RevenueInsightExecutionQueueStep,
    status: RevenueInsightExecutionStatus,
    message: string,
  ): RevenueInsightExecutionTimelineStep => {
    if (step.type === 'monitoring') {
      return {
        ...step,
        payload: step.payload,
        status,
        message,
      }
    }

    return {
      ...step,
      payload: step.payload,
      status,
      message,
    }
  }

  const runRevenueInsightActionAll = async (onlyFailed = false) => {
    if (revenueInsights.length === 0 || isAutoApplyingInsights) return
    if (!revenueSummary || saveMonitoringPolicy.isPending || saveRule.isPending) return

    let plan: RevenueInsightExecutionPlanWithQueue | null = null
    if (onlyFailed) {
      const failedSteps = autoApplyTimeline.filter((step) => step.status === 'failed')
      if (failedSteps.length === 0) {
        toast.show('재시도할 실패 항목이 없어요.', 'info')
        return
      }

      plan = {
        queue: failedSteps.map<RevenueInsightExecutionQueueStep>((step) => {
          if (step.type === 'monitoring') {
            return {
              type: 'monitoring',
              actionId: step.actionId,
              title: step.title,
              priority: step.priority,
              payload: step.payload,
            }
          }

          return {
            type: 'rule',
            actionId: step.actionId,
            title: step.title,
            priority: step.priority,
            payload: step.payload,
          }
        }),
      }
    } else {
      plan = buildRevenueInsightExecutionPlan(revenueInsights)
    }

    if (!plan || plan.queue.length === 0) {
      toast.show('적용 가능한 제안이 없어요.', 'info')
      setAutoApplyTimeline([])
      setAutoApplySummary('')
      return
    }

    setIsAutoApplyingInsights(true)
    setIsAutoApplyStopRequested(false)
    autoApplyStopToken.current.requested = false
    setAutoApplySummary('')

    let timeline: RevenueInsightExecutionTimelineStep[] = plan.queue.map((step) =>
      buildExecutionTimelineStep(step, 'pending', '대기'),
    )
    setAutoApplyTimeline(timeline)

    const mark = (index: number, update: Partial<RevenueInsightExecutionTimelineStep>) => {
      const next = [...timeline]
      const current = next[index]
      if (!current) return

      next[index] = {
        ...current,
        ...update,
      } as RevenueInsightExecutionTimelineStep
      timeline = next
      setAutoApplyTimeline(next)
    }

    try {
      for (let index = 0; index < timeline.length; index += 1) {
        if (autoApplyStopToken.current.requested) {
          for (let remainingIndex = index; remainingIndex < timeline.length; remainingIndex += 1) {
            if (timeline[remainingIndex]?.status === 'pending') {
              mark(remainingIndex, {
                status: 'skipped',
                message: '사용자 중단으로 건너뜀',
              })
            }
          }

          break
        }

        const step = timeline[index]
        mark(index, { status: 'running', message: '실행 중' })

        if (step.type === 'monitoring') {
          const currentPayload = buildRevenueInsightMonitoringPayload(step.actionId)
          if (!currentPayload) {
            mark(index, {
              status: 'skipped',
              message: '현재 데이터 변화로 건너뜀',
            })
            continue
          }

          try {
            await saveMonitoringPolicy.mutateAsync(currentPayload)
            mark(index, {
              status: 'success',
              message: '적용 완료',
            })
          } catch (error) {
            mark(index, {
              status: 'failed',
              message: (error as Error).message,
            })
          }
          continue
        }

        const currentPayload = buildRevenueInsightRulePayload(step.actionId)
        if (!currentPayload) {
          mark(index, {
            status: 'skipped',
            message: '현재 데이터 변화로 건너뜀',
          })
          continue
        }

        try {
          await saveRule.mutateAsync(currentPayload)
          mark(index, {
            status: 'success',
            message: '적용 완료',
          })
        } catch (error) {
          mark(index, {
            status: 'failed',
            message: (error as Error).message,
          })
        }
      }
    } catch (error) {
      toast.show((error as Error).message, 'error')
    } finally {
      const wasStopped = autoApplyStopToken.current.requested
      const successCount = timeline.filter((step) => step.status === 'success').length
      const skippedCount = timeline.filter((step) => step.status === 'skipped').length
      const failedCount = timeline.filter((step) => step.status === 'failed').length

      const finishedCount = successCount + failedCount + skippedCount
      if (wasStopped) {
        setAutoApplySummary(
          `중단됨 · 진행 ${finishedCount}/${timeline.length}건 (성공 ${successCount}건 · 실패 ${failedCount}건 · 미실행 ${timeline.length - finishedCount}건)`,
        )
      } else {
        setAutoApplySummary(
          `실행 결과: 성공 ${successCount}건 · 실패 ${failedCount}건 · 제외 ${skippedCount}건`,
        )
        if (failedCount > 0) {
          toast.show(`일부 항목 실행 실패 (${failedCount}건)`, 'error')
        } else {
          toast.show('수익 운영 제안을 우선순위 순으로 일괄 적용했어요.', 'success')
        }
      }

      setIsAutoApplyStopRequested(false)
      setIsAutoApplyingInsights(false)
    }
  }

  const requestStopAutoApply = () => {
    if (!isAutoApplyingInsights || isAutoApplyStopRequested) return

    autoApplyStopToken.current.requested = true
    setIsAutoApplyStopRequested(true)
    setAutoApplySummary('중단 요청이 접수됐습니다. 현재 단계 완료 후 실행을 멈출게요.')
    toast.show('자동 실행을 중단 요청했어요.', 'info')
  }

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
      setMinimumHostPayoutPercent(String(saved.minimumHostPayoutPercent))
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'revenue-rules'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'revenue-rules', 'history'] })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'payments', 'revenue-rules', 'simulate'],
      })
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
  const activeMinimumHostPayoutPercent =
    revenueSummary?.rules.minimumHostPayoutPercent ?? revenueRules?.minimumHostPayoutPercent ?? 0
  const draftMinimumHostPayoutPercent =
    parsedMinimumHostPayoutPercent ?? activeMinimumHostPayoutPercent
  const revenueHealthScore = useMemo<RevenueHealthScore | null>(() => {
    if (!revenueSummary) return null
    return createProjectedRuleHealth({
      totalPaidKRW: totalPaid,
      totalTickets: totalTickets,
      refundRatePercent,
      platformRevenueKRW: platformRevenue,
      hostPayoutKRW: hostPayout,
      minimumHostPayoutPercent: activeMinimumHostPayoutPercent,
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
    activeMinimumHostPayoutPercent,
    hostPayout,
    topPartyConcentrationPercent,
    netSalesChangePercent,
    revenueSummary,
    revenueRules?.minimumHostPayoutPercent,
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
      hostPayoutKRW: hostPayout,
      minimumHostPayoutPercent: activeMinimumHostPayoutPercent,
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

  const planningProjectionHealthScore = useMemo<RevenueHealthScore | null>(() => {
    if (
      !planningProjection ||
      parsedPlannerTransactionCount === null ||
      parsedPlannerRefundRate === null
    ) {
      return null
    }

    return createProjectedRuleHealth({
      totalPaidKRW: planningProjection.projectedGrossPaidKRW,
      totalTickets: parsedPlannerTransactionCount,
      refundRatePercent: parsedPlannerRefundRate,
      platformRevenueKRW: planningProjection.platformRevenueKRW,
      hostPayoutKRW: planningProjection.hostPayoutKRW,
      minimumHostPayoutPercent: activeMinimumHostPayoutPercent,
      topPartyConcentrationPercent,
      monitoring: monitoringThresholds,
      netSalesChangePercent,
    })
  }, [
    activeMinimumHostPayoutPercent,
    monitoringThresholds,
    netSalesChangePercent,
    parsedPlannerRefundRate,
    parsedPlannerTransactionCount,
    planningProjection,
    topPartyConcentrationPercent,
  ])

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
      const projectedHealthScore = planningProjection
        ? createProjectedRuleHealth({
            totalPaidKRW: projected.projectedGrossPaidKRW,
            totalTickets: transactionCount,
            refundRatePercent: refundRate,
            platformRevenueKRW: projected.platformRevenueKRW,
            hostPayoutKRW: projected.hostPayoutKRW,
            minimumHostPayoutPercent: activeMinimumHostPayoutPercent,
            topPartyConcentrationPercent,
            monitoring: monitoringThresholds,
            netSalesChangePercent,
          })
        : null

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
        transactionCount,
        projectedHealthScore,
        healthScoreDelta:
          projectedHealthScore && planningProjectionHealthScore
            ? projectedHealthScore.score - planningProjectionHealthScore.score
            : null,
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
    planningProjectionHealthScore,
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

  const presetScenarios = useMemo<RevenueRulePresetProjection[]>(() => {
    if (!revenueSummary || totalTickets <= 0) {
      return []
    }

    return REVENUE_RULE_PRESETS.map((preset) => {
      const presetMinimumHostPayoutPercent =
        preset.minimumHostPayoutPercent ??
        revenueRules?.minimumHostPayoutPercent ??
        activeMinimumHostPayoutPercent
      const projection = createPlannerProjection({
        transactionCount: totalTickets,
        avgTicket,
        refundRate: refundRatePercent,
        platformFeePercent: preset.platformFeePercent,
        refundRetentionPercent: preset.refundRetentionPercent,
        basePlatformRevenue: platformRevenue,
        baseHostPayout: hostPayout,
        targetPlatformRevenue: null,
      })
      const projectedHealthScore = createProjectedRuleHealth({
        totalPaidKRW: totalPaid,
        totalTickets,
        refundRatePercent,
        platformRevenueKRW: projection.platformRevenueKRW,
        hostPayoutKRW: projection.hostPayoutKRW,
        minimumHostPayoutPercent: presetMinimumHostPayoutPercent,
        topPartyConcentrationPercent,
        monitoring: monitoringThresholds,
        netSalesChangePercent,
      })

      return {
        preset,
        projection,
        isCurrent:
          revenueRules?.platformFeePercent === preset.platformFeePercent &&
          revenueRules?.refundRetentionPercent === preset.refundRetentionPercent &&
          revenueRules?.minimumHostPayoutPercent === presetMinimumHostPayoutPercent,
        projectedHealthScore,
        healthScoreDelta:
          projectedHealthScore && revenueHealthScore
            ? projectedHealthScore.score - revenueHealthScore.score
            : null,
      }
    })
  }, [
    avgTicket,
    hostPayout,
    platformRevenue,
    activeMinimumHostPayoutPercent,
    monitoringThresholds,
    refundRatePercent,
    totalPaid,
    totalTickets,
    topPartyConcentrationPercent,
    netSalesChangePercent,
    revenueHealthScore,
    revenueRules,
    revenueSummary,
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
  const projectedHealthScore = useMemo<RevenueHealthScore | null>(() => {
    if (!revenueSummary || !projected) return null
    if (ruleSimulation.data?.simulatedHealthScore) {
      return ruleSimulation.data.simulatedHealthScore
    }
    return createProjectedRuleHealth({
      totalPaidKRW: totalPaid,
      totalTickets,
      refundRatePercent,
      platformRevenueKRW: projected.nextPlatformRevenue,
      hostPayoutKRW: projected.nextHostPayout,
      minimumHostPayoutPercent: draftMinimumHostPayoutPercent,
      topPartyConcentrationPercent,
      monitoring: monitoringThresholds,
      netSalesChangePercent,
    })
  }, [
    draftMinimumHostPayoutPercent,
    netSalesChangePercent,
    parsedPlatformFee,
    projected,
    refundRatePercent,
    totalPaid,
    totalTickets,
    monitoringThresholds,
    topPartyConcentrationPercent,
    revenueSummary,
    ruleSimulation.data?.simulatedHealthScore,
  ])
  const projectedHealthDelta =
    projectedHealthScore && (ruleSimulation.data?.currentHealthScore ?? revenueHealthScore)
      ? projectedHealthScore.score -
        (ruleSimulation.data?.currentHealthScore ?? revenueHealthScore)!.score
      : null
  const revenueInsights = useMemo<RevenueInsight[]>(() => {
    if (!revenueSummary || !revenueHealthScore) return []

    const pushInsight = (insight: Omit<RevenueInsight, 'priority'>, priority: number) => {
      insights.push({ ...insight, priority })
    }

    const insights: RevenueInsight[] = []
    const platformShareRate =
      totalPaid > 0 ? roundPercentWithOneDecimal((platformRevenue / totalPaid) * 100) : 0
    const hostShareRate =
      totalPaid > 0 ? roundPercentWithOneDecimal((hostPayout / totalPaid) * 100) : 0
    const concentrationGap =
      topPartyConcentrationPercent - monitoringThresholds.topPartyConcentrationPercent

    if (refundRatePercent >= monitoringThresholds.dangerRefundRatePercent) {
      pushInsight(
        {
          tone: 'danger',
          title: '환불률 즉시 대응이 필요해요',
          description: `현재 환불률 ${refundRatePercent.toFixed(1)}%는 위험 임계치 ${monitoringThresholds.dangerRefundRatePercent}%를 넘었어요.`,
          action: '환불 사유 분류 강화, 분쟁 대응 템플릿 고도화, 환불 보전율/임계값 동시 조정 검토',
          actionId: 'refund-monitoring-relax',
          actionLabel: '임계치 일시 완화 적용',
        },
        100,
      )
    } else if (refundRatePercent >= monitoringThresholds.warningRefundRatePercent) {
      pushInsight(
        {
          tone: 'warning',
          title: '환불률 주의 구간',
          description: `환불률이 경고 임계치 ${monitoringThresholds.warningRefundRatePercent}%에 근접했어요.`,
          action: '모니터링 임계치와 호스트 사전 안내문구를 함께 검토해 조정 위험을 줄이세요',
          actionId: 'refund-monitoring-relax',
          actionLabel: '임계치 미세 조정 적용',
        },
        90,
      )
    }

    if (concentrationGap >= 0) {
      pushInsight(
        {
          tone: 'danger',
          title: 'Top 파티 과집중',
          description: `상위 파티 집중도가 임계치 ${monitoringThresholds.topPartyConcentrationPercent}%를 ${concentrationGap.toFixed(1)}%p 넘었어요.`,
          action: '상위 파티 프로모션 제한, 수수료 정책 분리 검토, 신규 파티 추천 비율 분산',
          actionId: 'concentration-cap-relax',
          actionLabel: '임계치 완화 후 임시 운영',
        },
        88,
      )
    } else if (concentrationGap >= -3) {
      pushInsight(
        {
          tone: 'warning',
          title: '파티 집중도 경계선',
          description: `상위 파티 집중도가 임계치까지 ${Math.abs(concentrationGap).toFixed(1)}%p 남아 있어요.`,
          action: '집중도 상향 전파 전에 환불/호스트 성장 신호를 1~2일 모니터링하세요',
          actionId: 'concentration-cap-relax',
          actionLabel: '임계치 완화 적용',
        },
        80,
      )
    }

    if (hostShareRate < activeMinimumHostPayoutPercent) {
      pushInsight(
        {
          tone: 'danger',
          title: '최소 정산율 위험',
          description: `현재 호스트 정산율 ${hostShareRate}%가 최소 보장값 ${activeMinimumHostPayoutPercent}%보다 낮아요.`,
          action: '최소 호스트 정산율 파라미터 상향 또는 수수료 인상 범위를 재검토하세요',
          actionId: 'minimum-host-payout-lower',
          actionLabel: '최소 정산율 완화 적용',
        },
        92,
      )
    } else if (hostShareRate >= activeMinimumHostPayoutPercent + 8) {
      pushInsight(
        {
          tone: 'success',
          title: '호스트 정산 여력 충분',
          description: `호스트 정산율 ${hostShareRate}%로 최소값 ${activeMinimumHostPayoutPercent}%를 충족해요.`,
          action: '수익 확장 시 플랫폼 수수료 인상 여지를 검토할 수 있어요',
        },
        30,
      )
    }

    if (grossPaidChangePercent !== null) {
      if (grossPaidChangePercent >= 20) {
        pushInsight(
          {
            tone: 'success',
            title: '매출 상승 추세',
            description: `총 결제액이 직전 대비 ${formatDeltaPercent(grossPaidChangePercent)} 증가했어요.`,
            action: '성공 신호를 유지하려면 Top 파티 집중도와 환불률을 지속 모니터링하세요',
          },
          22,
        )
      } else if (grossPaidChangePercent <= -15) {
        pushInsight(
          {
            tone: 'warning',
            title: '매출 둔화 주의',
            description: `총 결제액이 직전 대비 ${formatDeltaPercent(grossPaidChangePercent)} 감소했어요.`,
            action: '수수료 변경보다 유입 개선 정책(쿠폰/노출/쿼레이션)부터 선 적용하세요',
          },
          55,
        )
      }
    }

    if (platformShareRate > 0 && projectedHealthDelta !== null && projectedHealthDelta <= -8) {
      pushInsight(
        {
          tone: 'warning',
          title: '수익 정책 변경 영향 큼',
          description: `현재 후보 정책 반영 시 건전성이 ${Math.abs(projectedHealthDelta)}점 하락 가능성이 있어요.`,
          action: '저장 전 프리셋/임계값 완화안을 함께 비교해 의사결정하세요',
          actionId: 'preset-defensive',
          actionLabel: '보수형 프리셋 즉시 적용',
        },
        60,
      )
    }

    return insights.sort((a, b) => b.priority - a.priority)
  }, [
    activeMinimumHostPayoutPercent,
    grossPaidChangePercent,
    hostPayout,
    monitoringThresholds.dangerRefundRatePercent,
    monitoringThresholds.topPartyConcentrationPercent,
    monitoringThresholds.warningRefundRatePercent,
    platformRevenue,
    projectedHealthDelta,
    refundRatePercent,
    revenueHealthScore,
    revenueSummary,
    topPartyConcentrationPercent,
    totalPaid,
  ])
  const pendingAutoApplyQueue = useMemo<RevenueInsightExecutionTimelineStep[]>(() => {
    const plan = buildRevenueInsightExecutionPlan(revenueInsights)
    if (!plan) return []

    return plan.queue.map((step) => buildExecutionTimelineStep(step, 'pending', '실행 대기'))
  }, [revenueInsights])
  const projectedHealthDropWarning = projectedHealthDelta !== null && projectedHealthDelta <= -10
  const isProjectedHealthCritical = projectedHealthScore?.level === 'critical'
  const needsReasonForHighRiskSave =
    isProjectedHealthCritical && projected !== null && !ruleChangeReason.trim()
  const autoApplyDisplayQueue = isAutoApplyingInsights ? autoApplyTimeline : pendingAutoApplyQueue
  const autoApplyCompletedCount = autoApplyDisplayQueue.filter(
    (step) => step.status === 'success' || step.status === 'skipped' || step.status === 'failed',
  ).length
  const autoApplyProgressPercent = autoApplyDisplayQueue.length
    ? Math.round((autoApplyCompletedCount / autoApplyDisplayQueue.length) * 100)
    : 0
  const autoApplyFailedCount = autoApplyDisplayQueue.filter(
    (step) => step.status === 'failed',
  ).length
  const autoApplyFailureHistoryCount = autoApplyTimeline.filter(
    (step) => step.status === 'failed',
  ).length
  const hasAutoApplyCandidates = pendingAutoApplyQueue.length > 0
  const hasAutoApplyFailedHistory = autoApplyFailureHistoryCount > 0
  const autoApplyButtonLabel = isAutoApplyingInsights
    ? `일괄 적용 중 ${autoApplyCompletedCount}/${autoApplyDisplayQueue.length}`
    : `우선순위 순 일괄 적용 (${pendingAutoApplyQueue.length}개)`

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.headBadge}>Admin Operations Console</p>
        <h1>🛡️ 어드민 콘솔</h1>
        <p>
          미처리 신고 {openCount}건, 검토 중 신고 {reviewingCount}건입니다. 우선순위는 ‘미처리 신고
          처리 → 진행 검토 → 조치 완료’이며, 수익 제안은 우측 패널에서 바로 적용해 운영 상태를
          안정화하세요. 게시글 숨김·복구·첨부 제거는{' '}
          <Link to="/admin/moderation">콘텐츠 모더레이션</Link>에서 처리해요.
        </p>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={`${styles.statNum} ${styles.statNumDanger}`}>{openCount}</span>
          <span className={styles.statLabel}>미처리</span>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statNum} ${styles.statNumGold}`}>{reviewingCount}</span>
          <span className={styles.statLabel}>검토 중</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{openCount + reviewingCount}</span>
          <span className={styles.statLabel}>처리 대기</span>
        </div>
      </div>

      <section className={`${styles.revenueSection} ${styles.adminPulse}`}>
        <Card padding="lg" className={`${styles.revenuePanel} ${styles.adminPulse}`}>
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
          {revenueInsights.length > 0 ? (
            <div className={styles.revenueInsightsPanel}>
              <div className={styles.revenueInsightsHeader}>
                <div className={styles.revenueInsightsHeaderMeta}>
                  <h3 className={styles.sectionTitle}>수익 운영 제안</h3>
                  <span className={styles.sectionSubtle}>
                    현재 지표 기준으로 바로 적용 가능한 권장 액션입니다.
                  </span>
                </div>
                <div className={styles.insightHeaderActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={isAutoApplyingInsights}
                    onClick={() => runRevenueInsightActionAll()}
                    disabled={
                      isAutoApplyingInsights ||
                      saveMonitoringPolicy.isPending ||
                      saveRule.isPending ||
                      isMonitoringPolicyLoading ||
                      isRevenueRuleLoading ||
                      !hasAutoApplyCandidates
                    }
                    title={
                      hasAutoApplyCandidates
                        ? '현재 제안 항목을 우선순위 순으로 일괄 실행'
                        : '현재 실행 가능한 제안 항목이 없습니다'
                    }
                  >
                    {autoApplyButtonLabel}
                  </Button>
                  {hasAutoApplyFailedHistory && !isAutoApplyingInsights ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => runRevenueInsightActionAll(true)}
                      title="실패한 항목만 우선순위 순으로 재실행"
                    >
                      실패 항목만 재시도
                    </Button>
                  ) : null}
                  {isAutoApplyingInsights ? (
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={requestStopAutoApply}
                      disabled={isAutoApplyStopRequested}
                      isLoading={isAutoApplyStopRequested}
                      title="현재 실행 중인 시퀀스를 중단해요"
                    >
                      {isAutoApplyStopRequested ? '중단 중' : '중단'}
                    </Button>
                  ) : null}
                </div>
              </div>
              {autoApplyDisplayQueue.length > 0 ? (
                <div className={styles.insightRunPanel}>
                  <div className={styles.insightRunHeader}>
                    <strong className={styles.insightRunTitle}>일괄 실행 시퀀스</strong>
                    <span className={styles.insightRunHint}>
                      {isAutoApplyingInsights
                        ? `실행 중 · ${autoApplyProgressPercent}%`
                        : `총 ${pendingAutoApplyQueue.length}개 항목`}
                    </span>
                  </div>
                  <div className={styles.insightRunProgressWrap}>
                    <div
                      className={styles.insightRunProgress}
                      style={{ width: `${autoApplyProgressPercent}%` }}
                    />
                  </div>
                  {autoApplyFailedCount > 0 && !isAutoApplyingInsights ? (
                    <p className={styles.insightRunFailureHint}>
                      최근 실행에서 {autoApplyFailedCount}건이 실패했어요. 실패 항목은 재실행
                      대상으로 남습니다.
                    </p>
                  ) : null}
                  <ol className={styles.insightRunList}>
                    {autoApplyDisplayQueue.map((item, idx) => (
                      <li
                        key={`${item.type}-${item.actionId}-${idx}`}
                        className={`${styles.insightRunItem} ${
                          item.status === 'running'
                            ? styles.insightRunItemRunning
                            : item.status === 'success'
                              ? styles.insightRunItemDone
                              : item.status === 'failed'
                                ? styles.insightRunItemError
                                : item.status === 'skipped'
                                  ? styles.insightRunItemSkipped
                                  : ''
                        }`}
                      >
                        <span className={styles.insightRunIndex}>#{idx + 1}</span>
                        <span className={styles.insightRunMeta}>우선순위 {item.priority}</span>
                        <span className={styles.insightRunTitleText}>{item.title}</span>
                        <span className={styles.insightRunBadge}>
                          {item.type === 'monitoring' ? '임계치 정책' : '수익 정책'}
                        </span>
                        <span className={styles.insightRunStatus}>{item.message}</span>
                      </li>
                    ))}
                  </ol>
                  {autoApplySummary ? (
                    <p className={styles.insightRunSummary}>{autoApplySummary}</p>
                  ) : null}
                </div>
              ) : null}
              <div className={styles.insightGrid}>
                {revenueInsights.map((insight, index) => (
                  <article
                    key={`${insight.title}-${index}`}
                    className={`${styles.insightCard} ${
                      insight.tone === 'success'
                        ? styles.insightCardSuccess
                        : insight.tone === 'warning'
                          ? styles.insightCardWarning
                          : styles.insightCardDanger
                    }`}
                  >
                    <div className={styles.insightHeaderMetaRow}>
                      <span className={styles.insightToneIcon}>
                        {insight.tone === 'success'
                          ? '🎯'
                          : insight.tone === 'warning'
                            ? '⚠️'
                            : '🚨'}
                      </span>
                      <span className={styles.insightPriorityBadge}>
                        우선순위 {insight.priority}
                      </span>
                      <span
                        className={`${styles.insightBadge} ${
                          insight.tone === 'success'
                            ? styles.insightBadgeSuccess
                            : insight.tone === 'warning'
                              ? styles.insightBadgeWarning
                              : styles.insightBadgeDanger
                        }`}
                      >
                        {insight.tone === 'success'
                          ? '권장'
                          : insight.tone === 'warning'
                            ? '주의'
                            : '경고'}
                      </span>
                    </div>
                    <h4 className={styles.insightTitle}>{insight.title}</h4>
                    <p className={styles.insightDescription}>{insight.description}</p>
                    <p className={styles.insightAction}>권장 액션: {insight.action}</p>
                    {insight.actionId ? (
                      <div className={styles.insightActionRow}>
                        <Button
                          variant={insight.tone === 'danger' ? 'danger' : 'primary'}
                          size="sm"
                          onClick={() => runRevenueInsightAction(insight.actionId)}
                          disabled={
                            saveMonitoringPolicy.isPending ||
                            saveRule.isPending ||
                            isMonitoringPolicyLoading ||
                            isRevenueRuleLoading
                          }
                        >
                          {insight.actionLabel || '제안 적용'}
                        </Button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
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
            <div className={styles.presetSection}>
              <p className={styles.sectionNote}>
                운영 단계별로 바로 적용 가능한 수익 모델 프리셋입니다.
              </p>
              {revenueSummary && presetScenarios.length > 0 ? (
                <div className={styles.revenuePresetGrid}>
                  {presetScenarios.map(
                    ({ preset, projection, isCurrent, projectedHealthScore, healthScoreDelta }) => (
                      <article key={preset.id} className={styles.revenuePresetCard}>
                        <header className={styles.revenuePresetHeader}>
                          <div>
                            <h4 className={styles.revenuePresetTitle}>{preset.label}</h4>
                            <p className={styles.revenuePresetMeta}>
                              플랫폼 수수료 {preset.platformFeePercent}% / 환불보전{' '}
                              {preset.refundRetentionPercent}% / 최소 호스트 정산율{' '}
                              {preset.minimumHostPayoutPercent ?? activeMinimumHostPayoutPercent}%
                            </p>
                          </div>
                          <span
                            className={`${styles.revenuePresetBadge} ${
                              isCurrent
                                ? styles.revenuePresetBadgeCurrent
                                : styles.revenuePresetBadgeMuted
                            }`}
                          >
                            {isCurrent ? '현재 반영' : '검토 대상'}
                          </span>
                        </header>
                        <p className={styles.sectionNote}>{preset.description}</p>
                        <div className={styles.revenuePresetKpiGrid}>
                          <div className={styles.kpiCard}>
                            <span className={styles.kpiLabel}>예상 플랫폼 수익</span>
                            <strong className={styles.kpiValue}>
                              {projection.platformRevenueKRW.toLocaleString()}원
                            </strong>
                            <div className={styles.kpiCompareMeta}>
                              <span className={styles.kpiSubLabel}>현재 대비</span>
                              <span
                                className={`${styles.kpiTrendDelta} ${
                                  projection.platformDeltaKRW >= 0
                                    ? styles.kpiTrendUp
                                    : styles.kpiTrendDown
                                }`}
                              >
                                {projection.platformDeltaKRW >= 0 ? '+' : ''}
                                {projection.platformDeltaKRW.toLocaleString()}원
                              </span>
                            </div>
                          </div>
                          <div className={styles.kpiCard}>
                            <span className={styles.kpiLabel}>예상 호스트 정산</span>
                            <strong className={styles.kpiValue}>
                              {projection.hostPayoutKRW.toLocaleString()}원
                            </strong>
                            <div className={styles.kpiCompareMeta}>
                              <span className={styles.kpiSubLabel}>현재 대비</span>
                              <span
                                className={`${styles.kpiTrendDelta} ${
                                  projection.hostPayoutDeltaKRW >= 0
                                    ? styles.kpiTrendUp
                                    : styles.kpiTrendDown
                                }`}
                              >
                                {projection.hostPayoutDeltaKRW >= 0 ? '+' : ''}
                                {projection.hostPayoutDeltaKRW.toLocaleString()}원
                              </span>
                            </div>
                          </div>
                          <div className={styles.kpiCard}>
                            <span className={styles.kpiLabel}>예상 수익 건전성</span>
                            <strong className={styles.kpiValue}>
                              {projectedHealthScore
                                ? `${projectedHealthScore.score}점 · ${projectedHealthScore.levelLabel}`
                                : '계산 불가'}
                            </strong>
                            {healthScoreDelta !== null ? (
                              <div className={styles.kpiCompareMeta}>
                                <span className={styles.kpiSubLabel}>현재 대비</span>
                                <span
                                  className={`${styles.kpiTrendDelta} ${
                                    healthScoreDelta > 0
                                      ? styles.kpiTrendUp
                                      : healthScoreDelta < 0
                                        ? styles.kpiTrendDown
                                        : styles.kpiTrendFlat
                                  }`}
                                >
                                  {healthScoreDelta > 0 ? '+' : ''}
                                  {healthScoreDelta}점
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <Button
                          variant={isCurrent ? 'ghost' : 'primary'}
                          size="sm"
                          onClick={() => applyRevenueRulePreset(preset)}
                          disabled={isCurrent || !revenueSummary || saveRule.isPending}
                          title={isCurrent ? '현재 설정과 동일해요.' : undefined}
                        >
                          {saveRule.isPending ? '적용 중...' : '즉시 적용'}
                        </Button>
                      </article>
                    ),
                  )}
                </div>
              ) : (
                <p className={styles.ruleHint}>
                  수익 요약을 조회하면 프리셋 수익 추정을 확인할 수 있어요.
                </p>
              )}
            </div>

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
                  {projectedHealthScore ? (
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>예상 수익 건전성</span>
                      <strong className={styles.kpiValue}>
                        {projectedHealthScore.score}점 · {projectedHealthScore.levelLabel}
                      </strong>
                      {projectedHealthDelta !== null ? (
                        <div className={styles.kpiCompareMeta}>
                          <span className={styles.kpiSubLabel}>현재 대비</span>
                          <span
                            className={`${styles.kpiTrendDelta} ${
                              projectedHealthDelta > 0
                                ? styles.kpiTrendUp
                                : projectedHealthDelta < 0
                                  ? styles.kpiTrendDown
                                  : styles.kpiTrendFlat
                            }`}
                          >
                            {projectedHealthDelta > 0 ? '+' : ''}
                            {projectedHealthDelta}점
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {projectedHealthDropWarning ? (
                  <p className={styles.ruleHint}>
                    입력 수치가 현재 대비 수익 건전성 점수를 낮춰요. 저장 전에 운영 영향 검토가
                    필요해요.
                  </p>
                ) : null}
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
                          {scenario.projectedHealthScore ? (
                            <div className={styles.kpiCompareMeta}>
                              <span className={styles.kpiSubLabel}>예상 건전성</span>
                              <span
                                className={`${styles.kpiTrendDelta} ${
                                  scenario.healthScoreDelta !== null &&
                                  scenario.healthScoreDelta > 0
                                    ? styles.kpiTrendUp
                                    : scenario.healthScoreDelta !== null &&
                                        scenario.healthScoreDelta < 0
                                      ? styles.kpiTrendDown
                                      : styles.kpiTrendFlat
                                }`}
                              >
                                {scenario.projectedHealthScore.score}점 ·{' '}
                                {scenario.projectedHealthScore.levelLabel}
                                {scenario.healthScoreDelta !== null
                                  ? ` (${scenario.healthScoreDelta > 0 ? '+' : ''}${scenario.healthScoreDelta}점)`
                                  : ''}
                              </span>
                            </div>
                          ) : null}
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
              if (!hasRuleInput || saveRule.isPending || ruleSimulation.isLoading) return
              saveRule.mutate({
                platformFeePercent: parsedPlatformFee ?? 0,
                refundRetentionPercent: parsedRefundRetention ?? 0,
                minimumHostPayoutPercent:
                  parsedMinimumHostPayoutPercent ?? activeMinimumHostPayoutPercent,
                reason: ruleChangeReason,
              })
            }}
          >
            <label className={styles.ruleField}>
              <span>플랫폼 수수료율 (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                ref={platformFeeInputRef}
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
              <span>최소 호스트 정산율 (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                ref={minimumHostPayoutInputRef}
                value={minimumHostPayoutPercent}
                onChange={(event) => setMinimumHostPayoutPercent(event.target.value)}
                placeholder="예: 85"
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
                {Number(revenueRules?.refundRetentionPercent ?? 0)}% / 최소 호스트 정산율{' '}
                {Number(revenueRules?.minimumHostPayoutPercent ?? 0)}%
              </span>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={
                  !hasRuleInput ||
                  saveRule.isPending ||
                  isRevenueRuleLoading ||
                  !revenueSummary ||
                  ruleSimulation.isLoading ||
                  needsReasonForHighRiskSave
                }
                title={revenueSummary ? '' : '요약 수치를 먼저 조회해 주세요'}
              >
                {saveRule.isPending ? '저장 중...' : '수익 정책 저장'}
              </Button>
            </div>
            {ruleSimulation.isLoading ? (
              <p className={styles.ruleHint}>수익 건전성 시뮬레이션을 업데이트하고 있어요.</p>
            ) : null}
            {ruleSimulation.isError ? (
              <p className={styles.ruleHint}>
                시뮬레이션 계산 실패로 로컬 계산 기준으로 표시됩니다.
              </p>
            ) : null}
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
                {projectedHealthScore ? (
                  <span>
                    수익 건전성 {projectedHealthScore.score}점 · {projectedHealthScore.levelLabel}(
                    {projectedHealthDelta !== null
                      ? `${projectedHealthDelta >= 0 ? '+' : ''}${projectedHealthDelta}점`
                      : '변화량 계산 불가'}
                    )
                  </span>
                ) : null}
                {isProjectedHealthCritical ? (
                  <span className={styles.ruleCriticalHint}>
                    건전성 위험 경고: 저장 전 변경 사유를 꼭 입력해야 합니다.
                  </span>
                ) : projectedHealthDropWarning ? (
                  <span className={styles.ruleCautionHint}>
                    경고: 현재 대비 건전성이 낮아져 추가 조치가 필요할 수 있어요.
                  </span>
                ) : null}
              </div>
            ) : null}
            {!hasRuleInput && (
              <p className={styles.ruleHint}>
                수수료, 환불보전, 최소 호스트 정산율을 모두 0~100 사이 숫자로 입력해 주세요.
              </p>
            )}
            {needsReasonForHighRiskSave ? (
              <p className={styles.ruleHint}>위험 구간 적용은 변경 사유 입력이 필수입니다.</p>
            ) : null}
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
              saveMonitoringPolicy.mutate({
                ...buildMonitoringPolicyPayload(),
                ...(monitoringPolicyReason.trim() ? { reason: monitoringPolicyReason.trim() } : {}),
              })
            }}
          >
            <label className={styles.ruleField}>
              <span>경고 환불률 임계값 (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                ref={monitoringWarningInputRef}
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
          <Card padding="lg" className={styles.panelCard}>
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

        <Card padding="lg" className={styles.panelCard}>
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
                  {(() => {
                    const fromProjection = createPlannerProjection({
                      transactionCount: totalTickets,
                      avgTicket,
                      refundRate: refundRatePercent,
                      platformFeePercent: history.fromPlatformFeePercent,
                      refundRetentionPercent: history.fromRefundRetentionPercent,
                      basePlatformRevenue: platformRevenue,
                      baseHostPayout: hostPayout,
                      targetPlatformRevenue: null,
                    })
                    const projected = createPlannerProjection({
                      transactionCount: totalTickets,
                      avgTicket,
                      refundRate: refundRatePercent,
                      platformFeePercent: history.toPlatformFeePercent,
                      refundRetentionPercent: history.toRefundRetentionPercent,
                      basePlatformRevenue: platformRevenue,
                      baseHostPayout: hostPayout,
                      targetPlatformRevenue: null,
                    })
                    const fromHealth = createProjectedRuleHealth({
                      totalPaidKRW: totalPaid,
                      totalTickets,
                      refundRatePercent,
                      platformRevenueKRW: fromProjection.platformRevenueKRW,
                      hostPayoutKRW: fromProjection.hostPayoutKRW,
                      minimumHostPayoutPercent: history.fromMinimumHostPayoutPercent,
                      topPartyConcentrationPercent,
                      monitoring: monitoringThresholds,
                      netSalesChangePercent,
                    })
                    const toHealth = createProjectedRuleHealth({
                      totalPaidKRW: totalPaid,
                      totalTickets,
                      refundRatePercent,
                      platformRevenueKRW: projected.platformRevenueKRW,
                      hostPayoutKRW: projected.hostPayoutKRW,
                      minimumHostPayoutPercent: history.toMinimumHostPayoutPercent,
                      topPartyConcentrationPercent,
                      monitoring: monitoringThresholds,
                      netSalesChangePercent,
                    })
                    return (
                      <>
                        <span className={styles.historyTime}>
                          {new Date(history.changedAt).toLocaleString('ko-KR')}
                        </span>
                        <span className={styles.historyMeta}>
                          플랫폼 수수료 {history.fromPlatformFeePercent}% →{' '}
                          {history.toPlatformFeePercent}%
                        </span>
                        <span className={styles.historyMeta}>
                          환불보전 {history.fromRefundRetentionPercent}% →{' '}
                          {history.toRefundRetentionPercent}%
                        </span>
                        <span className={styles.historyMeta}>
                          최소 호스트 정산율 {history.fromMinimumHostPayoutPercent}% →{' '}
                          {history.toMinimumHostPayoutPercent}%
                        </span>
                        <span className={styles.historyMeta}>
                          적용 예상 플랫폼 수익 {projected.platformRevenueKRW.toLocaleString()}원 /
                          정산 {projected.hostPayoutKRW.toLocaleString()}원
                        </span>
                        <span className={styles.historyMeta}>
                          수익 건전성{' '}
                          {toHealth ? `${toHealth.score}점 · ${toHealth.levelLabel}` : '계산 불가'}
                          {toHealth && fromHealth
                            ? ` (${fromHealth.score}점 → ${toHealth.score}점)`
                            : ''}
                        </span>
                        <span className={styles.historyMeta}>
                          수익 변동 {fromProjection.platformRevenueKRW.toLocaleString()}원 →{' '}
                          {projected.platformRevenueKRW.toLocaleString()}원 (
                          {projected.platformRevenueKRW - fromProjection.platformRevenueKRW >= 0
                            ? '+'
                            : ''}
                          {(
                            projected.platformRevenueKRW - fromProjection.platformRevenueKRW
                          ).toLocaleString()}
                          원)
                        </span>
                        <span className={styles.historyMeta}>
                          정산 변동 {fromProjection.hostPayoutKRW.toLocaleString()}원 →{' '}
                          {projected.hostPayoutKRW.toLocaleString()}원 (
                          {projected.hostPayoutKRW - fromProjection.hostPayoutKRW >= 0 ? '+' : ''}
                          {(
                            projected.hostPayoutKRW - fromProjection.hostPayoutKRW
                          ).toLocaleString()}
                          원)
                        </span>
                        <span className={styles.historyMeta}>
                          사유: {history.reason ?? '사유 없음'}
                        </span>
                      </>
                    )
                  })()}
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
        <Card padding="lg" className={styles.panelCard}>
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
                      ? createProjectedRuleHealth({
                          totalPaidKRW: totalPaid,
                          totalTickets,
                          refundRatePercent,
                          platformRevenueKRW: platformRevenue,
                          hostPayoutKRW: hostPayout,
                          minimumHostPayoutPercent: activeMinimumHostPayoutPercent,
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
      ) : isOpenReportsError || isReviewingReportsError || isTabReportsError ? (
        <div className={styles.emptyStateWrap}>
          <EmptyState
            emoji="⚠️"
            title="데이터를 불러오지 못했어요"
            description="신고 큐 조회 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요."
          />
        </div>
      ) : (
        <>
          <div className={styles.tabsPanel}>
            <div className={styles.tabsTitleWrap}>
              <h3 className={styles.tabsTitle}>신고 처리 워크플로우</h3>
              <span className={styles.tabsSub}>우선 액션: 미처리 신고 → 검토 진행 → 조치 완료</span>
            </div>
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
          </div>
          <div className={styles.list}>
            {isLoading ? (
              <div className={styles.emptyStateWrap}>
                <Loading />
              </div>
            ) : !data || data.length === 0 ? (
              <div className={styles.emptyStateWrap}>
                <EmptyState emoji="🕊️" title="처리할 신고가 없어요" />
              </div>
            ) : (
              data.map((r) => (
                <Card key={r.id} padding="lg" className={styles.reportCard}>
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
                  {(r.communityPost || r.communityComment) && (
                    <div className={styles.reportEvidence}>
                      <span>커뮤니티 신고 대상</span>
                      {r.communityPost && (
                        <Link
                          to={`/community?from=${adminFrom}`}
                          className={styles.reportEvidenceLink}
                        >
                          글: {r.communityPost.title}
                        </Link>
                      )}
                      {r.communityComment && <p>댓글: {r.communityComment.body}</p>}
                    </div>
                  )}
                  {(r.autoHiddenAt || r.resolvedNote || (r.auditTrail?.length ?? 0) > 0) && (
                    <div className={styles.auditTrail}>
                      <div className={styles.auditTrailHead}>
                        <span>운영 이력</span>
                        {r.autoHiddenAt && <Badge tone="warning">자동 임시 숨김</Badge>}
                      </div>
                      {r.resolvedNote && <p>최근 메모: {r.resolvedNote}</p>}
                      {(r.auditTrail ?? []).length > 0 && (
                        <ul>
                          {(r.auditTrail ?? []).slice(0, 3).map((log) => (
                            <li key={log.id}>
                              <strong>{AUDIT_ACTION_LABEL[log.action] ?? log.action}</strong>
                              <span>
                                {log.note ? `${log.note} · ` : ''}
                                {new Date(log.createdAt).toLocaleString('ko-KR')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {r.status === 'open' && (
                    <div className={styles.actions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={patch.isPending}
                        onClick={() =>
                          patch.mutate({
                            id: r.id,
                            status: 'reviewing',
                            note: '운영자 검토 시작',
                          })
                        }
                      >
                        검토 시작
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={patch.isPending}
                        onClick={() =>
                          patch.mutate({
                            id: r.id,
                            status: 'dismissed',
                            note: '운영 기준상 조치 없음',
                          })
                        }
                      >
                        기각
                      </Button>
                      {(r.communityPost || r.communityComment) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={patch.isPending}
                          onClick={() =>
                            patch.mutate({
                              id: r.id,
                              status: 'resolved',
                              hideContent: true,
                              note: '커뮤니티 콘텐츠 숨김 처리',
                            })
                          }
                        >
                          콘텐츠 숨김 처리
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={patch.isPending}
                        onClick={() =>
                          patch.mutate({
                            id: r.id,
                            status: 'resolved',
                            note: '신고 처리 완료',
                          })
                        }
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
                        disabled={patch.isPending}
                        onClick={() =>
                          patch.mutate({
                            id: r.id,
                            status: 'dismissed',
                            note: '운영 기준상 조치 없음',
                          })
                        }
                      >
                        기각
                      </Button>
                      {(r.communityPost || r.communityComment) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={patch.isPending}
                          onClick={() =>
                            patch.mutate({
                              id: r.id,
                              status: 'resolved',
                              hideContent: true,
                              note: '커뮤니티 콘텐츠 숨김 처리',
                            })
                          }
                        >
                          콘텐츠 숨김 처리
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={patch.isPending}
                        onClick={() =>
                          patch.mutate({
                            id: r.id,
                            status: 'resolved',
                            note: '신고 처리 완료',
                          })
                        }
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
