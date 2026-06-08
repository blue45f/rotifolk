import { http, HttpResponse } from 'msw'
import type {
  Paginated,
  Participation,
  Party,
  PartySummary,
  QuestionCard,
  RevenueHealthAlertThreshold,
  ConnectionChannel,
  CommunityPost,
  CommunityPostCategory,
  CreateCommunityCommentDto,
  CreateCommunityPostDto,
  CreateReportDto,
  UpdateCommunityCommentDto,
  UpdateCommunityPostDto,
} from '@rotifolk/shared'
import {
  REVENUE_MONITORING_POLICY,
  buildCommunityCommentTree,
  computeRevenueHealthScore,
} from '@rotifolk/shared'
import { quoteVenueBooking, recommendVenues, suggestOffHoursSlots } from '@rotifolk/shared'
import {
  MOCK_TOKEN,
  mockCards,
  mockCommunityComments,
  mockCommunityPosts,
  mockMenus,
  mockParties,
  mockUsers,
  mockVenueBookings,
  mockVenues,
  toSummary,
} from './data'

const API = '*/api'

type MockAdminReport = {
  id: string
  kind: CreateReportDto['kind']
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

const mockReports: MockAdminReport[] = [
  {
    id: 'mock_report_community_post',
    kind: 'inappropriate',
    body: '개인정보를 바로 요구하는 표현이 있어 확인이 필요합니다.',
    status: 'open',
    resolvedNote: null,
    autoHiddenAt: null,
    reporter: { id: mockUsers[2].id, nickname: mockUsers[2].nickname },
    target: {
      id: mockCommunityPosts[0].author.id,
      nickname: mockCommunityPosts[0].author.nickname,
    },
    party: { id: 'p_wine', title: '[MOCK] 한남 루프탑 와인 5:5 로테이션' },
    communityPost: { id: mockCommunityPosts[0].id, title: mockCommunityPosts[0].title },
    communityComment: null,
    auditTrail: [
      {
        id: 'mock_audit_report_community_post',
        action: 'report_created',
        note: 'inappropriate',
        actorId: mockUsers[2].id,
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock_report_community_comment',
    kind: 'spam',
    body: '특정 업장 홍보처럼 보이는 댓글입니다.',
    status: 'reviewing',
    resolvedNote: '운영자 검토 시작',
    autoHiddenAt: null,
    reporter: { id: mockUsers[3].id, nickname: mockUsers[3].nickname },
    target: {
      id: mockCommunityComments[0].author.id,
      nickname: mockCommunityComments[0].author.nickname,
    },
    party: null,
    communityPost: { id: mockCommunityPosts[0].id, title: mockCommunityPosts[0].title },
    communityComment: {
      id: mockCommunityComments[0].id,
      postId: mockCommunityComments[0].postId,
      body: mockCommunityComments[0].body,
    },
    auditTrail: [
      {
        id: 'mock_audit_report_community_comment',
        action: 'status_updated',
        note: '운영자 검토 시작',
        actorId: mockUsers[0].id,
        createdAt: new Date(Date.now() - 20 * 60_000).toISOString(),
      },
      {
        id: 'mock_audit_report_community_comment_created',
        action: 'report_created',
        note: 'spam',
        actorId: mockUsers[3].id,
        createdAt: new Date(Date.now() - 28 * 60_000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 28 * 60_000).toISOString(),
  },
]

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms))
}

type PaymentMethod = 'card' | 'kakao' | 'toss' | 'mock'
type ChatMessageKind = 'text' | 'system' | 'split-bill'

interface MockChatRoom {
  id: string
  kind: 'group' | 'pair'
  title: string | null
  partyId: string | null
  partyTitle: string | null
  lastMessage: { body: string; kind: ChatMessageKind; createdAt: string } | null
  members: { userId: string; nickname: string; avatarId: string | null | undefined }[]
  lastReadAt: string | null
}

interface MockChatMessage {
  id: string
  roomId: string
  userId: string
  nickname: string
  body: string
  kind: ChatMessageKind
  meta?: Record<string, unknown> | null
  createdAt: string
}

interface MockPayment {
  id: string
  partyId: string
  userId: string
  amountKRW: number
  status: 'pending' | 'paid' | 'refunded' | 'cancelled'
  method: PaymentMethod
  paidAt: string | null
  refundedAt: string | null
  createdAt: string
  party?: {
    id: string
    title: string
    category: string
    startAt: string
    coverImageUrl: string | null | undefined
  } | null
}

interface MockContactExchangeRequest {
  id: string
  partyId: string
  requesterId: string
  receiverId: string
  channel: ConnectionChannel
  status: 'pending' | 'approved' | 'rejected'
  decidedById: string | null
  decidedAt: string | null
  createdAt: string
}

interface MockRevenueRuleConfig {
  platformFeePercent: number
  refundRetentionPercent: number
  minimumHostPayoutPercent: number
  updatedAt: string
  updatedBy: string | null
}

interface MockRevenueRuleHistory {
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

interface MockRevenueRuleSimulationRequest {
  platformFeePercent?: number
  refundRetentionPercent?: number
  minimumHostPayoutPercent?: number
  from?: string | null
  to?: string | null
  partyId?: string | null
  topLimit?: number | string
}

interface MockRevenueRuleSimulationResponse {
  currentRules: Pick<
    MockRevenueRuleConfig,
    'platformFeePercent' | 'refundRetentionPercent' | 'minimumHostPayoutPercent'
  >
  nextRules: Pick<
    MockRevenueRuleConfig,
    'platformFeePercent' | 'refundRetentionPercent' | 'minimumHostPayoutPercent'
  >
  currentHealthScore: {
    score: number
    level: 'good' | 'warning' | 'critical'
    levelLabel: string
    topPartyConcentrationPercent: number
    reasons: string[]
    summary: string
  }
  simulatedHealthScore: {
    score: number
    level: 'good' | 'warning' | 'critical'
    levelLabel: string
    topPartyConcentrationPercent: number
    reasons: string[]
    summary: string
  }
  scoreDelta: number
}

interface MockAdminRevenueSummaryParty {
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

interface MockAdminRevenueTrend {
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

interface MockAdminRevenueHealthAlert {
  code: string
  level: 'warning' | 'danger'
  title: string
  detail: string
}

interface MockMonitoringPolicySnapshot {
  healthAlerts: RevenueHealthAlertThreshold
  updatedAt: string
  updatedBy: string | null
}

interface MonitoringPolicyUpdateBody {
  warningRefundRatePercent?: number
  dangerRefundRatePercent?: number
  topPartyConcentrationPercent?: number
  reason?: string
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

interface RollbackMonitoringPolicyBody {
  historyId?: string
  reason?: string
}

type AdminSummaryComparisonMode = 'none' | 'previous_period' | 'previous_month' | 'previous_year'

interface MockAdminRevenueComparison {
  mode: AdminSummaryComparisonMode
  enabled: boolean
  rangeFrom: string | null
  rangeTo: string | null
}

interface MockAdminRevenueSummary {
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
  topParties: MockAdminRevenueSummaryParty[]
  rules: MockRevenueRuleConfig
  partyCount: number
  refundRatePercent: number
  rangeFrom: string | null
  rangeTo: string | null
  previousPeriod: MockAdminRevenueTrend | null
  comparison: MockAdminRevenueComparison
  healthAlerts: MockAdminRevenueHealthAlert[]
}

interface MockHostRevenueTrend {
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

interface MockHostSummaryComparison {
  mode: AdminSummaryComparisonMode
  enabled: boolean
  rangeFrom: string | null
  rangeTo: string | null
}

interface MockHostRevenueSummary {
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
  previousPeriod: MockHostRevenueTrend | null
  comparison: MockHostSummaryComparison
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

interface MockRevenueSummaryInputOptions {
  from?: string | null
  to?: string | null
  partyId?: string | null
  topLimit?: string | number
  compareMode?: string
}

interface MockHostRevenueSummaryInput {
  hostId?: string
  from?: string | null
  to?: string | null
  partyId?: string | null
  compareMode?: string
}

const nowIso = () => new Date().toISOString()
const mockPartyById = new Map(mockParties.map((party) => [party.id, party]))
let mockRevenueRules: MockRevenueRuleConfig = {
  platformFeePercent: 8,
  refundRetentionPercent: 0,
  minimumHostPayoutPercent: 85,
  updatedAt: nowIso(),
  updatedBy: null,
}
let mockRevenueRuleHistories: MockRevenueRuleHistory[] = []
let mockMonitoringPolicy: RevenueHealthAlertThreshold = {
  ...REVENUE_MONITORING_POLICY.healthAlerts,
}
let mockMonitoringPolicyUpdatedAt = nowIso()
let mockMonitoringPolicyUpdatedBy: string | null = null
let mockMonitoringPolicyHistories: MonitoringPolicyHistory[] = []

function appendRevenueRuleHistory(
  from: Pick<
    MockRevenueRuleConfig,
    'platformFeePercent' | 'refundRetentionPercent' | 'minimumHostPayoutPercent'
  >,
  to: Pick<
    MockRevenueRuleConfig,
    'platformFeePercent' | 'refundRetentionPercent' | 'minimumHostPayoutPercent'
  >,
  reason?: string,
) {
  mockRevenueRuleHistories.unshift({
    id: `rrh_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
    key: 'global',
    fromPlatformFeePercent: from.platformFeePercent,
    toPlatformFeePercent: to.platformFeePercent,
    fromRefundRetentionPercent: from.refundRetentionPercent,
    toRefundRetentionPercent: to.refundRetentionPercent,
    fromMinimumHostPayoutPercent: from.minimumHostPayoutPercent,
    toMinimumHostPayoutPercent: to.minimumHostPayoutPercent,
    changedBy: mockUsers[0].id,
    reason: reason?.trim() ?? null,
    changedAt: nowIso(),
  })
}

function appendMonitoringPolicyHistory(
  from: Pick<
    RevenueHealthAlertThreshold,
    'warningRefundRatePercent' | 'dangerRefundRatePercent' | 'topPartyConcentrationPercent'
  >,
  to: Pick<
    RevenueHealthAlertThreshold,
    'warningRefundRatePercent' | 'dangerRefundRatePercent' | 'topPartyConcentrationPercent'
  >,
  reason?: string,
) {
  mockMonitoringPolicyHistories.unshift({
    id: `mph_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
    key: 'global',
    fromWarningRefundRatePercent: from.warningRefundRatePercent,
    toWarningRefundRatePercent: to.warningRefundRatePercent,
    fromDangerRefundRatePercent: from.dangerRefundRatePercent,
    toDangerRefundRatePercent: to.dangerRefundRatePercent,
    fromTopPartyConcentrationPercent: from.topPartyConcentrationPercent,
    toTopPartyConcentrationPercent: to.topPartyConcentrationPercent,
    changedBy: mockUsers[0].id,
    changedAt: nowIso(),
    reason: reason?.trim() ?? null,
  })
}

const revenueRuleSnapshot = () => ({ ...mockRevenueRules })
const monitoringPolicySnapshot = (): MockMonitoringPolicySnapshot => ({
  healthAlerts: mockMonitoringPolicy,
  updatedAt: mockMonitoringPolicyUpdatedAt,
  updatedBy: mockMonitoringPolicyUpdatedBy,
})

function roundMoney(value: number) {
  return Math.round(value)
}

function buildMockProjectedRevenueHealthScore(
  rules: Pick<
    MockRevenueRuleConfig,
    'platformFeePercent' | 'refundRetentionPercent' | 'minimumHostPayoutPercent'
  >,
  summaryOptions?: {
    from?: string | null
    to?: string | null
    partyId?: string | null
    topLimit?: string | number
  },
) {
  const previousRules = { ...mockRevenueRules }
  try {
    mockRevenueRules.platformFeePercent = rules.platformFeePercent
    mockRevenueRules.refundRetentionPercent = rules.refundRetentionPercent
    mockRevenueRules.minimumHostPayoutPercent = rules.minimumHostPayoutPercent

    const summary = getMockAdminRevenueSummary({
      topLimit: summaryOptions?.topLimit ?? 12,
      from: summaryOptions?.from ?? null,
      to: summaryOptions?.to ?? null,
      partyId: summaryOptions?.partyId ?? null,
      compareMode: 'none',
    })
    const topPartyConcentrationPercent =
      summary.topParties[0] && summary.grossPaidKRW > 0
        ? (summary.topParties[0].paidGrossKRW / summary.grossPaidKRW) * 100
        : 0

    return computeRevenueHealthScore({
      totalPaidKRW: summary.grossPaidKRW,
      totalTickets: summary.totalPaidCount + summary.totalRefundedCount,
      refundRatePercent: summary.refundRatePercent,
      platformRevenueKRW: summary.platformRevenueKRW,
      hostPayoutKRW: summary.hostPayoutKRW,
      minimumHostPayoutPercent: rules.minimumHostPayoutPercent,
      topPartyConcentrationPercent,
      monitoring: mockMonitoringPolicy,
      netSalesChangePercent: null,
    })
  } finally {
    mockRevenueRules = previousRules
  }
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100
}

function parseSummaryDate(value?: string | null, asEndOfDay = false): number | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  if (asEndOfDay) {
    parsed.setHours(23, 59, 59, 999)
  }
  return parsed.getTime()
}

function clampSummaryTopLimit(limit?: string | number | null): number {
  const parsed = Number.parseInt(String(limit ?? '12'), 10)
  if (!Number.isFinite(parsed)) return 12
  return Math.max(1, Math.min(parsed, 50))
}

function safePercent(value: number) {
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

function getMockAdminRevenueSummary({
  from,
  to,
  partyId,
  topLimit = 12,
  compareMode = 'previous_period',
}: MockRevenueSummaryInputOptions = {}): MockAdminRevenueSummary {
  const fromTs = parseSummaryDate(from)
  const toTs = parseSummaryDate(to, true)
  const normalizeSummaryRange = filterDateRange(fromTs, toTs)
  const safeTopLimit = clampSummaryTopLimit(topLimit)
  const normalizedCompareMode = normalizeMockComparisonMode(compareMode)
  const [comparisonFrom, comparisonTo] = buildMockComparisonRange(
    normalizeSummaryRange,
    normalizedCompareMode,
  )

  const summarize = (rows: MockPayment[]): MockAdminRevenueSummary => {
    const byParty = new Map<
      string,
      {
        partyId: string
        partyTitle: string
        paidCount: number
        refundedCount: number
        paidGrossKRW: number
        refundedGrossKRW: number
      }
    >()

    let totalPaidCount = 0
    let totalRefundedCount = 0
    let grossPaidKRW = 0
    let grossRefundedKRW = 0

    for (const payment of rows) {
      const party = mockPartyById.get(payment.partyId)
      if (!party) continue
      if (partyId && payment.partyId !== partyId) continue

      const entry = byParty.get(payment.partyId) ?? {
        partyId: party.id,
        partyTitle: party.title,
        paidCount: 0,
        refundedCount: 0,
        paidGrossKRW: 0,
        refundedGrossKRW: 0,
      }

      if (payment.status === 'paid') {
        totalPaidCount += 1
        grossPaidKRW += payment.amountKRW
        entry.paidCount += 1
        entry.paidGrossKRW += payment.amountKRW
      } else if (payment.status === 'refunded') {
        totalRefundedCount += 1
        grossRefundedKRW += payment.amountKRW
        entry.refundedCount += 1
        entry.refundedGrossKRW += payment.amountKRW
      }

      byParty.set(payment.partyId, entry)
    }

    const platformFeeKRW = roundMoney((grossPaidKRW * mockRevenueRules.platformFeePercent) / 100)
    const refundRetentionKRW = roundMoney(
      (grossRefundedKRW * mockRevenueRules.refundRetentionPercent) / 100,
    )
    const hostPayoutKRW = grossPaidKRW - platformFeeKRW
    const avgTicketKRW = totalPaidCount > 0 ? roundMoney(grossPaidKRW / totalPaidCount) : 0
    const grossTicketCount = totalPaidCount + totalRefundedCount
    const refundRatePercent =
      grossTicketCount > 0 ? roundPercent((totalRefundedCount / grossTicketCount) * 100) : 0

    const topParties = Array.from(byParty.values())
      .map((entry) => {
        const partyPlatformFeeKRW = roundMoney(
          (entry.paidGrossKRW * mockRevenueRules.platformFeePercent) / 100,
        )
        const partyGrossTicketCount = entry.paidCount + entry.refundedCount
        const partyRefundRatePercent =
          partyGrossTicketCount > 0
            ? roundPercent((entry.refundedCount / partyGrossTicketCount) * 100)
            : 0
        return {
          ...entry,
          platformFeeKRW: partyPlatformFeeKRW,
          hostPayoutKRW: Math.max(entry.paidGrossKRW - partyPlatformFeeKRW, 0),
          netGrossKRW: Math.max(entry.paidGrossKRW - entry.refundedGrossKRW, 0),
          refundRatePercent: partyRefundRatePercent,
          grossTicketCount: partyGrossTicketCount,
        }
      })
      .sort((a, b) => b.paidGrossKRW - a.paidGrossKRW)
      .slice(0, safeTopLimit)

    const rules = revenueRuleSnapshot()
    const previousPeriod =
      comparisonFrom !== null && comparisonTo !== null
        ? summarizeMockPreviousPeriod([comparisonFrom, comparisonTo], partyId)
        : null

    return {
      totalPaidCount,
      totalRefundedCount,
      grossPaidKRW,
      grossRefundedKRW,
      netSalesKRW: grossPaidKRW - grossRefundedKRW,
      platformFeeKRW,
      refundRetentionKRW,
      hostPayoutKRW,
      platformRevenueKRW: platformFeeKRW + refundRetentionKRW,
      avgTicketKRW,
      topParties,
      rules,
      partyCount: byParty.size,
      refundRatePercent,
      rangeFrom:
        normalizeSummaryRange[0] !== null ? new Date(normalizeSummaryRange[0]).toISOString() : null,
      rangeTo:
        normalizeSummaryRange[1] !== null ? new Date(normalizeSummaryRange[1]).toISOString() : null,
      comparison: {
        mode: normalizedCompareMode,
        enabled: !!previousPeriod,
        rangeFrom: comparisonFrom ? new Date(comparisonFrom).toISOString() : null,
        rangeTo: comparisonTo ? new Date(comparisonTo).toISOString() : null,
      },
      previousPeriod,
      healthAlerts: buildMockRevenueHealthAlerts({
        totalPaidCount,
        totalRefundedCount,
        grossPaidKRW,
        platformFeeKRW,
        refundRetentionKRW,
        hostPayoutKRW,
        minimumHostPayoutPercent: rules.minimumHostPayoutPercent,
        platformRevenueKRW: platformFeeKRW + refundRetentionKRW,
        avgTicketKRW,
        topParties,
        partyCount: byParty.size,
        refundRatePercent,
        healthAlerts: mockMonitoringPolicy,
      }),
    }
  }

  const filtered = mockPayments.filter((payment) => {
    const createdAt = Date.parse(payment.createdAt)
    if (Number.isNaN(createdAt)) return false
    const [fromDate, toDate] = normalizeSummaryRange
    if (fromDate !== null && createdAt < fromDate) return false
    if (toDate !== null && createdAt > toDate) return false
    if (partyId && payment.partyId !== partyId) return false
    return true
  })

  const summary = summarize(filtered)
  return summary
}

function filterDateRange(
  fromTs: number | null,
  toTs: number | null,
): [number | null, number | null] {
  const parsedFrom = fromTs === null ? null : fromTs
  const parsedTo = toTs === null ? null : toTs
  return [parsedFrom, parsedTo]
}

function normalizeMockComparisonMode(mode: string | undefined): AdminSummaryComparisonMode {
  switch (mode) {
    case 'none':
      return 'none'
    case 'previous':
    case 'previous_period':
      return 'previous_period'
    case 'previous_month':
      return 'previous_month'
    case 'previous_year':
      return 'previous_year'
    default:
      return 'previous_period'
  }
}

function buildMockComparisonRange(
  dateRange: [number | null, number | null],
  compareMode: AdminSummaryComparisonMode,
): [number | null, number | null] {
  const [fromTs, toTs] = dateRange
  if (compareMode === 'none' || fromTs === null || toTs === null || fromTs > toTs) {
    return [null, null]
  }

  if (compareMode === 'previous_period') {
    const periodMs = toTs - fromTs
    const previousTo = fromTs - 1
    const previousFrom = previousTo - periodMs
    return [previousFrom, previousTo]
  }

  if (compareMode === 'previous_month') {
    return [shiftMockDateRangeUnit(fromTs, 'month', -1), shiftMockDateRangeUnit(toTs, 'month', -1)]
  }

  return [shiftMockDateRangeUnit(fromTs, 'year', -1), shiftMockDateRangeUnit(toTs, 'year', -1)]
}

function shiftMockDateRangeUnit(timestamp: number, unit: 'month' | 'year', amount: number): number {
  const baseDate = new Date(timestamp)
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const day = baseDate.getDate()
  const hours = baseDate.getHours()
  const minutes = baseDate.getMinutes()
  const seconds = baseDate.getSeconds()
  const milliseconds = baseDate.getMilliseconds()

  const shifted = new Date(year, month, 1, hours, minutes, seconds, milliseconds)
  if (unit === 'month') {
    shifted.setMonth(month + amount)
  } else {
    shifted.setFullYear(year + amount)
  }
  const maxDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate()
  shifted.setDate(Math.min(day, maxDay))
  return shifted.getTime()
}

function summarizeMockPreviousPeriod(
  dateRange: [number | null, number | null],
  partyId?: string | null,
): MockAdminRevenueTrend | null {
  const [fromTs, toTs] = dateRange
  if (fromTs === null || toTs === null || fromTs > toTs) return null

  const filtered = mockPayments.filter((payment) => {
    const createdAt = Date.parse(payment.createdAt)
    if (Number.isNaN(createdAt)) return false
    if (createdAt < fromTs) return false
    if (createdAt > toTs) return false
    if (partyId && payment.partyId !== partyId) return false
    return true
  })

  let totalPaidCount = 0
  let totalRefundedCount = 0
  let grossPaidKRW = 0
  let grossRefundedKRW = 0
  for (const payment of filtered) {
    if (payment.status === 'paid') {
      totalPaidCount += 1
      grossPaidKRW += payment.amountKRW
    } else if (payment.status === 'refunded') {
      totalRefundedCount += 1
      grossRefundedKRW += payment.amountKRW
    }
  }

  const platformFeeKRW = roundMoney((grossPaidKRW * mockRevenueRules.platformFeePercent) / 100)
  const refundRetentionKRW = roundMoney(
    (grossRefundedKRW * mockRevenueRules.refundRetentionPercent) / 100,
  )
  const hostPayoutKRW = grossPaidKRW - platformFeeKRW
  const netSalesKRW = grossPaidKRW - grossRefundedKRW
  const totalTicket = totalPaidCount + totalRefundedCount
  const refundRatePercent =
    totalTicket > 0 ? roundPercent((totalRefundedCount / totalTicket) * 100) : 0

  return {
    grossPaidKRW,
    grossRefundedKRW,
    netSalesKRW,
    platformFeeKRW,
    refundRetentionKRW,
    hostPayoutKRW,
    platformRevenueKRW: platformFeeKRW + refundRetentionKRW,
    totalPaidCount,
    totalRefundedCount,
    refundRatePercent,
  }
}

function buildMockRevenueHealthAlerts(summary: {
  totalPaidCount: number
  totalRefundedCount: number
  grossPaidKRW: number
  refundRatePercent: number
  avgTicketKRW: number
  platformFeeKRW: number
  refundRetentionKRW: number
  hostPayoutKRW: number
  minimumHostPayoutPercent: number
  partyCount: number
  topParties: MockAdminRevenueSummaryParty[]
  platformRevenueKRW: number
  healthAlerts: RevenueHealthAlertThreshold
}): MockAdminRevenueHealthAlert[] {
  const alerts: MockAdminRevenueHealthAlert[] = []
  const totalTickets = summary.totalPaidCount + summary.totalRefundedCount
  const minimumHostPayoutPercent = safePercent(summary.minimumHostPayoutPercent)
  const hostPayoutPercent =
    summary.grossPaidKRW > 0 ? (summary.hostPayoutKRW / summary.grossPaidKRW) * 100 : 0
  if (totalTickets === 0) {
    alerts.push({
      code: 'no_transactions',
      level: 'warning',
      title: '거래 없음',
      detail: '선택 기간에 결제/환불 데이터가 없습니다.',
    })
    return alerts
  }

  if (summary.refundRatePercent >= summary.healthAlerts.dangerRefundRatePercent) {
    alerts.push({
      code: 'high_refund_rate',
      level: 'danger',
      title: '환불률 급증',
      detail: `환불률이 ${summary.refundRatePercent.toFixed(1)}%로 임계값을 초과했습니다.`,
    })
  } else if (summary.refundRatePercent >= summary.healthAlerts.warningRefundRatePercent) {
    alerts.push({
      code: 'elevated_refund_rate',
      level: 'warning',
      title: '환불률 상승',
      detail: `환불률이 ${summary.refundRatePercent.toFixed(1)}%로 주의 구간입니다.`,
    })
  }

  const topParty = summary.topParties[0]
  if (topParty && summary.grossPaidKRW > 0) {
    const concentration = (topParty.paidGrossKRW / summary.grossPaidKRW) * 100
    if (concentration >= summary.healthAlerts.topPartyConcentrationPercent) {
      alerts.push({
        code: 'party_concentration',
        level: 'warning',
        title: '파티 편중',
        detail: `${topParty.partyTitle}의 매출 비중이 ${concentration.toFixed(1)}%로 높습니다.`,
      })
    }
  }

  if (summary.platformRevenueKRW < 0) {
    alerts.push({
      code: 'platform_revenue_negative',
      level: 'danger',
      title: '정산 이상',
      detail: '플랫폼 수익 계산값이 음수로 잡혀 데이터 집계 점검이 필요합니다.',
    })
  }

  if (minimumHostPayoutPercent > 0 && hostPayoutPercent < minimumHostPayoutPercent) {
    alerts.push({
      code: 'host_payout_too_low',
      level: 'warning',
      title: '호스트 정산 비율 경고',
      detail: `호스트 정산 비율이 최소 임계치 ${minimumHostPayoutPercent.toFixed(1)}% 미만입니다.`,
    })
  }

  return alerts
}

function getMockHostRevenueSummary({
  hostId = 'u_host',
  from,
  to,
  partyId,
  compareMode = 'previous_period',
}: MockHostRevenueSummaryInput = {}): MockHostRevenueSummary {
  const hostParties = mockParties.filter((party) => party.hostId === hostId)
  const hostedIds = hostParties.map((party) => party.id)
  const targetPartyId = partyId?.trim() ?? null
  const fromTs = parseSummaryDate(from)
  const toTs = parseSummaryDate(to, true)
  const [summaryFrom, summaryTo] = filterDateRange(fromTs, toTs)
  const normalizedCompareMode = normalizeMockComparisonMode(compareMode)
  const [comparisonFrom, comparisonTo] = buildMockComparisonRange(
    [summaryFrom, summaryTo],
    normalizedCompareMode,
  )
  const includeParties = targetPartyId ? new Set([targetPartyId]) : new Set(hostedIds)
  const isAuthorizedParty = !targetPartyId || includeParties.has(targetPartyId)
  const baseComparison = {
    mode: normalizedCompareMode,
    enabled: false,
    rangeFrom: comparisonFrom ? new Date(comparisonFrom).toISOString() : null,
    rangeTo: comparisonTo ? new Date(comparisonTo).toISOString() : null,
  }

  const summarizeHostRows = (
    rows: MockPayment[],
  ): {
    totalKRW: number
    paidCount: number
    totalPaidCount: number
    totalRefundedCount: number
    totalTickets: number
    avgTicketKRW: number
    refundRatePercent: number
    partyCount: number
    refundedKRW: number
    platformFeeKRW: number
    refundRetentionKRW: number
    hostPayoutKRW: number
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
  } => {
    let totalKRW = 0
    let paidCount = 0
    let refundedKRW = 0
    let totalPaidCount = 0
    let totalRefundedCount = 0
    const byParty = new Map<
      string,
      { totalKRW: number; paidCount: number; refundedCount: number; refundedKRW: number }
    >()

    for (const payment of rows) {
      const entry = byParty.get(payment.partyId) ?? {
        totalKRW: 0,
        paidCount: 0,
        refundedCount: 0,
        refundedKRW: 0,
      }
      if (payment.status === 'paid') {
        totalKRW += payment.amountKRW
        paidCount += 1
        totalPaidCount += 1
        entry.totalKRW += payment.amountKRW
        entry.paidCount += 1
      } else if (payment.status === 'refunded') {
        refundedKRW += payment.amountKRW
        totalRefundedCount += 1
        entry.refundedKRW += payment.amountKRW
        entry.refundedCount += 1
      }
      byParty.set(payment.partyId, entry)
    }

    const platformFeeKRW = roundMoney((totalKRW * mockRevenueRules.platformFeePercent) / 100)
    const refundRetentionKRW = roundMoney(
      (refundedKRW * mockRevenueRules.refundRetentionPercent) / 100,
    )
    const hostPayoutKRW = totalKRW - platformFeeKRW
    const avgTicketKRW = paidCount > 0 ? roundMoney(totalKRW / paidCount) : 0
    const totalTickets = totalPaidCount + totalRefundedCount
    const refundRatePercent =
      totalTickets > 0 ? roundPercent((totalRefundedCount / totalTickets) * 100) : 0

    const recent = hostParties.slice(0, 12).map((party) => {
      const entry = byParty.get(party.id) ?? {
        totalKRW: 0,
        paidCount: 0,
        refundedCount: 0,
        refundedKRW: 0,
      }
      const partyPlatformFeeKRW = roundMoney(
        (entry.totalKRW * mockRevenueRules.platformFeePercent) / 100,
      )
      const grossTicketCount = entry.paidCount + entry.refundedCount
      return {
        partyId: party.id,
        partyTitle: party.title,
        totalKRW: entry.totalKRW,
        paidCount: entry.paidCount,
        refundedCount: entry.refundedCount,
        refundedKRW: entry.refundedKRW,
        grossTicketCount,
        refundRatePercent:
          grossTicketCount > 0 ? roundPercent((entry.refundedCount / grossTicketCount) * 100) : 0,
        platformFeeKRW: partyPlatformFeeKRW,
        hostPayoutKRW: Math.max(entry.totalKRW - partyPlatformFeeKRW, 0),
      }
    })

    return {
      totalKRW,
      paidCount,
      totalPaidCount,
      totalRefundedCount,
      totalTickets,
      avgTicketKRW,
      refundRatePercent,
      partyCount: byParty.size,
      refundedKRW,
      platformFeeKRW,
      refundRetentionKRW,
      hostPayoutKRW,
      recent,
    }
  }

  const filterByPeriodAndParty =
    (fromDate: number | null, toDate: number | null) => (payment: MockPayment) => {
      const createdAt = Date.parse(payment.createdAt)
      if (Number.isNaN(createdAt)) return false
      if (!includeParties.has(payment.partyId)) return false
      if (targetPartyId && payment.partyId !== targetPartyId) return false
      if (fromDate !== null && createdAt < fromDate) return false
      if (toDate !== null && createdAt > toDate) return false
      return true
    }

  if (hostedIds.length === 0 || !isAuthorizedParty) {
    return {
      totalKRW: 0,
      paidCount: 0,
      totalPaidCount: 0,
      totalRefundedCount: 0,
      totalTickets: 0,
      avgTicketKRW: 0,
      refundRatePercent: 0,
      partyCount: 0,
      refundedKRW: 0,
      rangeFrom: summaryFrom ? new Date(summaryFrom).toISOString() : null,
      rangeTo: summaryTo ? new Date(summaryTo).toISOString() : null,
      platformFeePercent: mockRevenueRules.platformFeePercent,
      refundRetentionPercent: mockRevenueRules.refundRetentionPercent,
      platformFeeKRW: 0,
      refundRetentionKRW: 0,
      hostPayoutKRW: 0,
      previousPeriod: null,
      comparison: baseComparison,
      recent: [],
    }
  }

  const currentSummary = summarizeHostRows(
    mockPayments.filter(filterByPeriodAndParty(summaryFrom, summaryTo)),
  )
  const previousSummary =
    comparisonFrom !== null && comparisonTo !== null
      ? summarizeHostRows(mockPayments.filter(filterByPeriodAndParty(comparisonFrom, comparisonTo)))
      : null
  const hasPreviousPeriod = !!previousSummary && comparisonFrom !== null && comparisonTo !== null

  return {
    ...currentSummary,
    rangeFrom: summaryFrom ? new Date(summaryFrom).toISOString() : null,
    rangeTo: summaryTo ? new Date(summaryTo).toISOString() : null,
    platformFeePercent: mockRevenueRules.platformFeePercent,
    refundRetentionPercent: mockRevenueRules.refundRetentionPercent,
    previousPeriod: hasPreviousPeriod
      ? {
          totalKRW: previousSummary.totalKRW,
          paidCount: previousSummary.paidCount,
          totalPaidCount: previousSummary.totalPaidCount,
          totalRefundedCount: previousSummary.totalRefundedCount,
          totalTickets: previousSummary.totalTickets,
          avgTicketKRW: previousSummary.avgTicketKRW,
          refundRatePercent: previousSummary.refundRatePercent,
          refundedKRW: previousSummary.refundedKRW,
          platformFeeKRW: previousSummary.platformFeeKRW,
          refundRetentionKRW: previousSummary.refundRetentionKRW,
          hostPayoutKRW: previousSummary.hostPayoutKRW,
          partyCount: previousSummary.partyCount,
        }
      : null,
    comparison: {
      ...baseComparison,
      enabled: hasPreviousPeriod,
    },
  }
}

const mockChatRooms: MockChatRoom[] = []
const mockChatMessages: Record<string, MockChatMessage[]> = {}
const mockPayments: MockPayment[] = []
const mockContactExchangeRequests: MockContactExchangeRequest[] = [
  {
    id: 'cx_mock_pending_instagram',
    partyId: 'p_request',
    requesterId: 'u_w1',
    receiverId: 'u_host',
    channel: 'instagram',
    status: 'pending',
    decidedById: null,
    decidedAt: null,
    createdAt: nowIso(),
  },
  {
    id: 'cx_mock_approved_kakao',
    partyId: 'p_request',
    requesterId: 'u_host',
    receiverId: 'u_w1',
    channel: 'kakao',
    status: 'approved',
    decidedById: 'u_w1',
    decidedAt: nowIso(),
    createdAt: nowIso(),
  },
]
const mockAvoidPeople: Array<{ id: string; label: string | null; createdAt: string }> = [
  { id: 'avoid-person-1', label: '전 직장 지인', createdAt: nowIso() },
]
const mockReviews: Array<{
  id: string
  partyId: string | null
  targetUserId: string | null
  rating: number
  body: string
  anonymous: boolean
  tags: string[]
  author: { nickname: string; avatarId: string | null }
  hostReply: string | null
  hostRepliedAt: string | null
  createdAt: string
}> = [
  {
    id: 'review_party_1',
    partyId: 'party-1',
    targetUserId: 'host-1',
    rating: 5,
    body: '라운드 전환이 자연스럽고 대화 주제가 좋아서 어색하지 않았어요.',
    anonymous: false,
    tags: ['🎙️ 진행이 매끄러워요', '🏛️ 장소가 멋져요'],
    author: { nickname: '윤슬', avatarId: 'a_w1' },
    hostReply: null,
    hostRepliedAt: null,
    createdAt: nowIso(),
  },
]
const mockNotifications = [
  {
    id: 'nt_welcome',
    kind: 'system',
    title: 'Rotifolk에 오신 걸 환영해요',
    body: '관심 있는 모임을 저장하고 새 소식을 받아보세요.',
    link: '/parties',
    isRead: false,
    createdAt: nowIso(),
  },
]

function ensureMockChatRoom(partyId: string): MockChatRoom {
  const existing = mockChatRooms.find((room) => room.partyId === partyId && room.kind === 'group')
  if (existing) return existing

  const party = mockParties.find((p) => p.id === partyId)
  const id = `room_${partyId}`
  const room: MockChatRoom = {
    id,
    kind: 'group',
    title: party?.title ?? '모임 단톡방',
    partyId,
    partyTitle: party?.title ?? null,
    lastMessage: null,
    members: mockUsers.map((user) => ({
      userId: user.id,
      nickname: user.nickname,
      avatarId: user.avatarId,
    })),
    lastReadAt: null,
  }
  mockChatRooms.push(room)
  mockChatMessages[id] = [
    {
      id: `msg_${partyId}_welcome`,
      roomId: id,
      userId: 'system',
      nickname: 'Rotifolk',
      body: '모임 채팅방이 열렸어요. 참가자들과 가볍게 인사해 보세요.',
      kind: 'system',
      meta: null,
      createdAt: nowIso(),
    },
  ]
  room.lastMessage = {
    body: mockChatMessages[id][0].body,
    kind: mockChatMessages[id][0].kind,
    createdAt: mockChatMessages[id][0].createdAt,
  }
  return room
}

function mockContactHandle(userId: string, channel: ConnectionChannel): string | null {
  const user = mockUsers.find((item) => item.id === userId)
  if (!user) return null
  if (channel === 'instagram') return user.shareInstagram ? (user.instagram ?? null) : null
  if (channel === 'kakao') return user.shareKakao ? (user.kakaoId ?? null) : null
  if (channel === 'phone') return user.shareContact ? (user.phone ?? null) : null
  return null
}

function mockCanRequestContact(userId: string, partnerId: string, channel: ConnectionChannel) {
  return !!mockContactHandle(userId, channel) && !!mockContactHandle(partnerId, channel)
}

function buildMockRequestApprovalChannels(
  partyId: string,
  userId: string,
  partnerId: string,
  offeredChannels: ConnectionChannel[],
) {
  return offeredChannels.map((channel) => {
    if (channel === 'chat') {
      return { channel, handle: null, state: 'open', canRequest: false }
    }
    const pairRequests = mockContactExchangeRequests.filter(
      (request) =>
        request.partyId === partyId &&
        request.channel === channel &&
        ((request.requesterId === userId && request.receiverId === partnerId) ||
          (request.requesterId === partnerId && request.receiverId === userId)),
    )
    const approved = pairRequests.find((request) => request.status === 'approved')
    if (approved) {
      return {
        channel,
        handle: mockContactHandle(partnerId, channel),
        state: 'approved',
        requestId: approved.id,
        requestedBy: approved.requesterId === userId ? 'me' : 'them',
        canRequest: false,
      }
    }
    const incoming = pairRequests.find(
      (request) =>
        request.status === 'pending' &&
        request.requesterId === partnerId &&
        request.receiverId === userId,
    )
    if (incoming) {
      return {
        channel,
        handle: null,
        state: 'pending_them',
        requestId: incoming.id,
        requestedBy: 'them',
        canRequest: false,
      }
    }
    const outgoing = pairRequests.find(
      (request) =>
        request.status === 'pending' &&
        request.requesterId === userId &&
        request.receiverId === partnerId,
    )
    if (outgoing) {
      return {
        channel,
        handle: null,
        state: 'pending_me',
        requestId: outgoing.id,
        requestedBy: 'me',
        canRequest: false,
      }
    }
    const rejected = pairRequests.find((request) => request.status === 'rejected')
    const canRequest = mockCanRequestContact(userId, partnerId, channel)
    return {
      channel,
      handle: null,
      state: rejected ? 'rejected' : canRequest ? 'requestable' : 'locked',
      requestId: rejected?.id ?? null,
      requestedBy: rejected ? (rejected.requesterId === userId ? 'me' : 'them') : null,
      canRequest: canRequest && (!rejected || rejected.requesterId === userId),
    }
  })
}

function shapePayment(payment: MockPayment) {
  const party = mockParties.find((p) => p.id === payment.partyId)
  return {
    ...payment,
    party:
      payment.party ??
      (party
        ? {
            id: party.id,
            title: party.title,
            category: party.config.category,
            startAt: party.startAt,
            coverImageUrl: party.coverImageUrl,
          }
        : null),
  }
}

function updateBookingStatus(id: string, status: string, ownerMessage?: string | null) {
  const booking = mockVenueBookings.find((item) => item.id === id)
  const now = nowIso()
  if (!booking) return { ok: true, id, status }
  Object.assign(booking, {
    status,
    ownerMessage: ownerMessage ?? booking.ownerMessage ?? null,
    decidedAt: status === 'confirmed' || status === 'declined' ? now : booking.decidedAt,
    updatedAt: now,
  })
  return booking
}

export const handlers = [
  http.get(`${API}/health`, () =>
    HttpResponse.json({ ok: true, app: 'rotifolk-mock', ts: new Date().toISOString() }),
  ),

  // Auth
  http.post(`${API}/auth/login`, async () => {
    return HttpResponse.json(await delay({ token: MOCK_TOKEN, user: mockUsers[0] }))
  }),
  http.post(`${API}/auth/signup`, async () => {
    return HttpResponse.json(await delay({ token: MOCK_TOKEN, user: mockUsers[1] }))
  }),
  http.get(`${API}/auth/me`, async () => {
    return HttpResponse.json(await delay({ user: mockUsers[0] }))
  }),
  http.get(`${API}/auth/config`, async () => {
    return HttpResponse.json(await delay({ googleClientId: null }))
  }),
  http.post(`${API}/auth/google`, async () => {
    return HttpResponse.json(await delay({ token: MOCK_TOKEN, user: mockUsers[0] }))
  }),

  // Parties
  http.get(`${API}/parties`, async ({ request }) => {
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const items = mockParties
      .filter((p) => (category ? p.config.category === category : true))
      .map(toSummary)
    const payload: Paginated<PartySummary> = {
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
      hasNext: false,
    }
    return HttpResponse.json(await delay(payload))
  }),
  http.get(`${API}/parties/mine`, async () =>
    HttpResponse.json(
      await delay(
        [] as Array<{ participation: { id: string; status: string }; party: PartySummary }>,
      ),
    ),
  ),
  http.get(`${API}/parties/hosted`, async () =>
    HttpResponse.json(await delay([mockParties[0]].map(toSummary))),
  ),
  http.get(`${API}/parties/happening-now`, async () =>
    HttpResponse.json(
      await delay(mockParties.filter((party) => party.status === 'live').map(toSummary)),
    ),
  ),
  http.get(`${API}/parties/by-code/:code`, async ({ params }) => {
    const party = mockParties[0]
    const venue = mockVenues.find((v) => v.id === party.venueId)
    return HttpResponse.json(
      await delay({
        id: party.id,
        title: party.title,
        startAt: party.startAt,
        venueArea: venue?.area ?? '',
        category: party.config.category,
        quickCode: String(params.code ?? 'MOCK-2026').toUpperCase(),
      }),
    )
  }),
  http.post(`${API}/parties/quick`, async ({ request }) => {
    const body = (await request.json()) as {
      category?: Party['config']['category']
      venueId?: string
      startInMinutes?: number
      maxParticipants?: number
      title?: string
    }
    const venue = mockVenues.find((v) => v.id === body.venueId) ?? mockVenues[0]
    const startAt = new Date(Date.now() + (body.startInMinutes ?? 60) * 60_000)
    const endAt = new Date(startAt.getTime() + 2 * 60 * 60_000)
    const category = body.category ?? 'wine'
    const id = `p_quick_${Date.now()}`
    const quickCode = `RTF-${String(Date.now()).slice(-4)}`
    const party: Party = {
      id,
      title: body.title ?? `[MOCK] ${venue.area} 즉석 ${category} 모임`,
      description: 'MSW 즉석 개설로 생성된 모임입니다.',
      hostId: mockUsers[0].id,
      venueId: venue.id,
      coverImageUrl: venue.photos[0] ?? null,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      minParticipants: 2,
      maxParticipants: body.maxParticipants ?? 8,
      currentParticipants: 1,
      status: 'open',
      config: {
        category,
        rotationMode: 'round-robin-pair',
        roundDurationSec: 300,
        totalRounds: 4,
        breakBetweenRoundsSec: 30,
        enableMidMatching: true,
        enableFinalMatching: true,
        enableQuiz: true,
        enableQuestionCards: true,
        enableLiveOrders: true,
        enableAvatarOnly: false,
        format: 'rotation',
        rotationFormat: 'one-on-one',
        groupSize: 2,
        matchScope: 'mutual-only',
        contactExchangePolicy: 'mutual-consent',
        maxMatchesPerPerson: 3,
        connectionMode: 'chat',
        connectionChannels: ['chat', 'instagram'],
        groupAfterParty: false,
        enableNotes: true,
        noteDelivery: 'party-end',
        enableConversationKit: true,
      },
      pricing: {
        basePriceKRW: 18_000,
        drinkPackage: 'per-glass',
        snackPackage: 'per-plate',
        refundDeadlineHours: 24,
      },
      recruitment: {
        genderRatioTarget: 'any',
        ratioTolerance: 1,
        maleCap: null,
        femaleCap: null,
        minMale: null,
        minFemale: null,
        autoCancelAt: null,
        autoCancelReason: null,
      },
      tags: ['#MOCK', '#즉석', `#${venue.area}`],
      ageMin: null,
      ageMax: null,
      genderRatio: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    mockParties.unshift(party)
    ensureMockChatRoom(id)
    return HttpResponse.json(await delay({ id, quickCode }))
  }),
  http.get(`${API}/parties/me/match-cards`, async () =>
    HttpResponse.json(
      await delay([
        {
          id: 'mc_yoonseul',
          partnerUserId: 'u_w1',
          partnerNickname: '윤슬',
          partnerAvatarId: 'a_w1',
          partyId: mockParties[0].id,
          partyTitle: mockParties[0].title,
          matchedAt: nowIso(),
        },
      ]),
    ),
  ),
  http.get(`${API}/parties/neighborhood`, async ({ request }) => {
    const url = new URL(request.url)
    const area = url.searchParams.get('area')
    const items = mockParties
      .filter((party) => {
        if (!area) return true
        const venue = mockVenues.find((v) => v.id === party.venueId)
        return venue?.area.includes(area)
      })
      .map(toSummary)
    return HttpResponse.json(await delay(items))
  }),
  http.get(`${API}/parties/:id`, async ({ params }) => {
    const party = mockParties.find((p) => p.id === params.id)
    if (!party) return new HttpResponse('not found', { status: 404 })
    const participants: Participation[] = mockUsers.map((u, i) => ({
      id: `pt_${i}`,
      partyId: party.id,
      userId: u.id,
      status: 'confirmed',
      seatNumber: i + 1,
      checkedInAt: null,
      user: u as never,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }))
    return HttpResponse.json(await delay({ party, participants }))
  }),
  http.post(`${API}/parties/:id/join`, async ({ params }) =>
    HttpResponse.json(
      await delay({
        id: 'pt_me',
        partyId: params.id as string,
        userId: mockUsers[0].id,
        status: 'confirmed',
        seatNumber: 99,
        checkedInAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ),
  ),
  http.delete(`${API}/parties/:id/join`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.post(`${API}/parties/:id/lock`, async ({ params }) => {
    const party = mockParties.find((p) => p.id === params.id)
    if (party) {
      party.status = 'locked'
      party.updatedAt = nowIso()
    }
    return HttpResponse.json(await delay(party ?? { ok: true, id: params.id }))
  }),
  http.post(`${API}/parties/:id/start`, async ({ params }) => {
    const party = mockParties.find((p) => p.id === params.id)
    if (party) {
      party.status = 'live'
      party.updatedAt = nowIso()
    }
    return HttpResponse.json(await delay(party ?? { ok: true, id: params.id }))
  }),
  http.post(`${API}/parties/:id/end`, async ({ params }) => {
    const party = mockParties.find((p) => p.id === params.id)
    if (party) {
      party.status = 'ended'
      party.updatedAt = nowIso()
    }
    return HttpResponse.json(await delay(party ?? { ok: true, id: params.id }))
  }),
  http.post(`${API}/parties/:id/matching/plan`, async ({ params }) =>
    HttpResponse.json(
      await delay({
        partyId: params.id,
        rounds: [
          { id: 'round_1', order: 1, startsAt: nowIso(), durationSec: 300 },
          { id: 'round_2', order: 2, startsAt: nowIso(), durationSec: 300 },
        ],
        pairs: [{ roundId: 'round_1', userAId: mockUsers[0].id, userBId: mockUsers[1].id }],
      }),
    ),
  ),
  http.post(`${API}/parties/:id/check-in/:userId`, async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { seatNumber?: number }
    return HttpResponse.json(
      await delay({
        id: `pt_${params.userId}`,
        partyId: params.id,
        userId: params.userId,
        status: 'checked-in',
        seatNumber: body.seatNumber ?? 1,
        checkedInAt: nowIso(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }),
    )
  }),
  http.get(`${API}/parties/:partyId/reviews`, async ({ params }) => {
    const partyId = params.partyId
    const list = mockReviews.filter((r) => r.partyId === partyId || r.id === 'review_party_1')
    return HttpResponse.json(await delay(list))
  }),
  http.get(`${API}/parties/:partyId/photos`, async ({ params }) =>
    HttpResponse.json(
      await delay([
        {
          id: 'photo_party_1',
          url:
            mockParties.find((p) => p.id === params.partyId)?.coverImageUrl ??
            mockVenues[0].photos[0],
          caption: '오늘의 첫 라운드',
          createdAt: nowIso(),
          userId: mockUsers[0].id,
          uploader: {
            id: mockUsers[0].id,
            nickname: mockUsers[0].nickname,
            avatarId: mockUsers[0].avatarId,
          },
        },
      ]),
    ),
  ),
  http.post(`${API}/parties/:partyId/photos`, async ({ params, request }) => {
    const body = (await request.json()) as { url?: string; caption?: string }
    return HttpResponse.json(
      await delay({
        id: `photo_${Date.now()}`,
        url: body.url ?? mockVenues[0].photos[0],
        caption: body.caption ?? null,
        createdAt: nowIso(),
        partyId: params.partyId,
        userId: mockUsers[0].id,
        uploader: {
          id: mockUsers[0].id,
          nickname: mockUsers[0].nickname,
          avatarId: mockUsers[0].avatarId,
        },
      }),
    )
  }),
  http.post(`${API}/parties`, async ({ request }) => {
    const body = (await request.json()) as Partial<Party>
    const venue = mockVenues.find((v) => v.id === body.venueId) ?? mockVenues[0]
    const party: Party = {
      ...mockParties[0],
      ...body,
      id: `p_${Date.now()}`,
      hostId: mockUsers[0].id,
      venueId: venue.id,
      currentParticipants: 0,
      status: 'open',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    } as Party
    mockParties.unshift(party)
    return HttpResponse.json(await delay(party))
  }),

  // Venues — 정적 라우트(recommend/mine)를 :id 보다 먼저 등록
  http.get(`${API}/venues/recommend`, async ({ request }) => {
    const url = new URL(request.url)
    const num = (k: string) => {
      const v = url.searchParams.get(k)
      return v == null ? null : Number(v)
    }
    const brief = {
      category: (url.searchParams.get('category') ?? 'wine') as never,
      area: url.searchParams.get('area') ?? undefined,
      partySize: num('partySize') ?? 8,
      startAt: url.searchParams.get('startAt') ?? undefined,
      endAt: url.searchParams.get('endAt') ?? undefined,
      lat: num('lat'),
      lng: num('lng'),
      maxBudgetKRW: num('maxBudgetKRW'),
    }
    const recs = recommendVenues(mockVenues, brief, {
      viewer: { lat: brief.lat, lng: brief.lng },
      limit: 12,
    })
    return HttpResponse.json(await delay(recs))
  }),
  http.get(`${API}/venues/mine`, async () =>
    HttpResponse.json(
      await delay(
        mockVenues
          .filter((v) => v.ownerId === 'u_host')
          .map((v) => ({
            ...v,
            isMine: true,
            upcomingParties: mockParties.filter((p) => p.venueId === v.id).length,
            pendingRequests: mockVenueBookings.filter(
              (b) => b.venueId === v.id && b.status === 'requested',
            ).length,
          })),
      ),
    ),
  ),
  http.get(`${API}/venues/areas`, async () =>
    HttpResponse.json(
      await delay(
        Array.from(
          new Set(mockVenues.filter((venue) => venue.partnered).map((venue) => venue.area)),
        ).sort((a, b) => a.localeCompare(b, 'ko-KR')),
      ),
    ),
  ),
  http.get(`${API}/venues`, async () => HttpResponse.json(await delay(mockVenues))),
  http.get(`${API}/venues/:id/availability`, async ({ params }) => {
    const v = mockVenues.find((vv) => vv.id === params.id)
    if (!v) return new HttpResponse('not found', { status: 404 })
    const offHours = suggestOffHoursSlots(v, { days: 14 })
    return HttpResponse.json(await delay({ venueId: v.id, busy: [], offHours }))
  }),
  http.get(`${API}/venues/:id/menu`, async ({ params }) =>
    HttpResponse.json(await delay(mockMenus[params.id as string] ?? [])),
  ),
  http.get(`${API}/venues/:id`, async ({ params }) => {
    const v = mockVenues.find((vv) => vv.id === params.id)
    if (!v) return new HttpResponse('not found', { status: 404 })
    return HttpResponse.json(await delay({ venue: v, menu: mockMenus[v.id] ?? [] }))
  }),
  http.post(`${API}/venues`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      await delay({
        id: `v_${Date.now()}`,
        rating: 0,
        reviewCount: 0,
        partnered: false,
        ...body,
        ownerId: 'u_host',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    )
  }),
  http.patch(`${API}/venues/:id`, async ({ params, request }) => {
    const v = mockVenues.find((vv) => vv.id === params.id)
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(await delay({ ...(v ?? {}), ...body, id: params.id }))
  }),

  // Venue bookings (섭외)
  http.get(`${API}/venue-bookings/mine`, async ({ request }) => {
    const url = new URL(request.url)
    const role = url.searchParams.get('role') ?? 'requester'
    const list =
      role === 'owner'
        ? mockVenueBookings.filter((b) => b.ownerId === 'u_host')
        : mockVenueBookings.filter((b) => b.requesterId === 'u_host')
    return HttpResponse.json(await delay(list))
  }),
  http.post(`${API}/venue-bookings`, async ({ request }) => {
    const body = (await request.json()) as {
      venueId: string
      startAt: string
      endAt: string
      partySize: number
      category: string
      noteToOwner?: string | null
    }
    const v = mockVenues.find((vv) => vv.id === body.venueId)
    const q = v ? quoteVenueBooking(v, body.startAt, body.endAt) : null
    const status = v?.instantBook ? 'confirmed' : 'requested'
    return HttpResponse.json(
      await delay({
        id: `vb_${Date.now()}`,
        venueId: body.venueId,
        venueName: v?.name,
        venueArea: v?.area,
        venuePhoto: v?.photos[0] ?? null,
        requesterId: 'u_host',
        requesterNickname: '소믈리에 도이',
        ownerId: v?.ownerId ?? null,
        partyId: null,
        startAt: body.startAt,
        endAt: body.endAt,
        partySize: body.partySize,
        category: body.category,
        noteToOwner: body.noteToOwner ?? null,
        status,
        hours: q?.hours ?? 0,
        baseKRW: q?.baseKRW ?? 0,
        multiplier: q?.multiplier ?? 1,
        discountKRW: q?.discountKRW ?? 0,
        cleaningFeeKRW: q?.cleaningFeeKRW ?? 0,
        totalKRW: q?.totalKRW ?? 0,
        ownerMessage: null,
        decidedAt: status === 'confirmed' ? new Date().toISOString() : null,
        arrivalGuide: status === 'confirmed' ? (v?.arrivalGuide ?? null) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    )
  }),
  http.patch(`${API}/venue-bookings/:id/confirm`, async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { message?: string }
    return HttpResponse.json(
      await delay(updateBookingStatus(String(params.id), 'confirmed', body.message ?? null)),
    )
  }),
  http.patch(`${API}/venue-bookings/:id/decline`, async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { message?: string }
    return HttpResponse.json(
      await delay(updateBookingStatus(String(params.id), 'declined', body.message ?? null)),
    )
  }),
  http.patch(`${API}/venue-bookings/:id/cancel`, async ({ params }) =>
    HttpResponse.json(await delay(updateBookingStatus(String(params.id), 'cancelled'))),
  ),

  // Question cards
  http.get(`${API}/question-cards`, async () => HttpResponse.json(await delay(mockCards))),
  http.get(`${API}/question-cards/draw`, async () =>
    HttpResponse.json(await delay(mockCards[Math.floor(Math.random() * mockCards.length)])),
  ),
  http.post(`${API}/question-cards`, async ({ request }) => {
    const body = (await request.json()) as Partial<QuestionCard>
    const card: QuestionCard = {
      id: `qc_${Date.now()}`,
      partyId: body.partyId ?? null,
      depth: body.depth ?? 'icebreaker',
      prompt: body.prompt ?? '새로운 대화 주제를 입력해 주세요.',
      category: body.category ?? null,
      language: body.language ?? 'ko',
      usedCount: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    mockCards.unshift(card)
    return HttpResponse.json(await delay(card))
  }),

  // Chat
  http.get(`${API}/chat/rooms`, async () => HttpResponse.json(await delay(mockChatRooms))),
  http.get(`${API}/chat/rooms/:id/messages`, async ({ params }) =>
    HttpResponse.json(await delay(mockChatMessages[String(params.id)] ?? [])),
  ),
  http.post(`${API}/chat/rooms/:id/messages`, async ({ params, request }) => {
    const body = (await request.json()) as {
      body?: string
      kind?: ChatMessageKind
      meta?: Record<string, unknown>
    }
    const room = mockChatRooms.find((item) => item.id === params.id)
    const createdAt = nowIso()
    const message: MockChatMessage = {
      id: `msg_${Date.now()}`,
      roomId: String(params.id),
      userId: mockUsers[0].id,
      nickname: mockUsers[0].nickname,
      body: body.body ?? '',
      kind: body.kind ?? 'text',
      meta: body.meta ?? null,
      createdAt,
    }
    mockChatMessages[message.roomId] = [...(mockChatMessages[message.roomId] ?? []), message]
    if (room) {
      room.lastMessage = { body: message.body, kind: message.kind, createdAt }
    }
    return HttpResponse.json(await delay(message))
  }),
  http.post(`${API}/chat/rooms/:id/read`, async ({ params }) => {
    const room = mockChatRooms.find((item) => item.id === params.id)
    if (room) room.lastReadAt = nowIso()
    return HttpResponse.json(await delay({ ok: true }))
  }),
  http.post(`${API}/chat/parties/:partyId/ensure`, async ({ params }) =>
    HttpResponse.json(await delay(ensureMockChatRoom(String(params.partyId)))),
  ),
  http.get(`${API}/chat/unread-count`, async () => {
    const unreadRooms = mockChatRooms.filter((room) => {
      const messages = mockChatMessages[room.id] ?? []
      return messages.some(
        (message) =>
          message.userId !== mockUsers[0].id &&
          (!room.lastReadAt || message.createdAt > room.lastReadAt),
      )
    })
    const count = unreadRooms.reduce(
      (sum, room) =>
        sum +
        (mockChatMessages[room.id] ?? []).filter(
          (message) =>
            message.userId !== mockUsers[0].id &&
            (!room.lastReadAt || message.createdAt > room.lastReadAt),
        ).length,
      0,
    )
    return HttpResponse.json(await delay({ count, rooms: unreadRooms.length }))
  }),

  // Payments
  http.get(`${API}/payments/me`, async ({ request }) => {
    const url = new URL(request.url)
    const partyId = url.searchParams.get('partyId')
    const items = mockPayments
      .filter((payment) => (partyId ? payment.partyId === partyId : true))
      .map(shapePayment)
    return HttpResponse.json(await delay(items))
  }),
  http.post(`${API}/payments/:partyId/pay`, async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { method?: PaymentMethod }
    const party = mockParties.find((p) => p.id === params.partyId)
    const existing = mockPayments.find(
      (payment) => payment.partyId === params.partyId && payment.status === 'paid',
    )
    if (existing) return HttpResponse.json(await delay(shapePayment(existing)))

    const payment: MockPayment = {
      id: `pay_${Date.now()}`,
      partyId: String(params.partyId),
      userId: mockUsers[0].id,
      amountKRW: party?.pricing.basePriceKRW ?? 18_000,
      status: 'paid',
      method: body.method ?? 'card',
      paidAt: nowIso(),
      refundedAt: null,
      createdAt: nowIso(),
    }
    mockPayments.unshift(payment)
    return HttpResponse.json(await delay(shapePayment(payment)))
  }),
  http.post(`${API}/payments/:id/refund`, async ({ params }) => {
    const payment = mockPayments.find((item) => item.id === params.id)
    if (payment) {
      payment.status = 'refunded'
      payment.refundedAt = nowIso()
    }
    return HttpResponse.json(
      await delay(
        shapePayment(
          payment ?? {
            id: String(params.id),
            partyId: mockParties[0].id,
            userId: mockUsers[0].id,
            amountKRW: mockParties[0].pricing.basePriceKRW,
            status: 'refunded',
            method: 'mock',
            paidAt: nowIso(),
            refundedAt: nowIso(),
            createdAt: nowIso(),
          },
        ),
      ),
    )
  }),

  // Safety (empty list of blocks by default; reports succeed)
  http.get(`${API}/blocks`, async () => HttpResponse.json(await delay([]))),
  http.post(`${API}/blocks/:userId`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.delete(`${API}/blocks/:userId`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.post(`${API}/reports`, async ({ request }) => {
    const body = (await request.json()) as CreateReportDto
    const post = body.communityPostId
      ? mockCommunityPosts.find((item) => item.id === body.communityPostId)
      : null
    const comment = body.communityCommentId
      ? mockCommunityComments.find((item) => item.id === body.communityCommentId)
      : null
    const target = body.targetUserId
      ? mockUsers.find((user) => user.id === body.targetUserId)
      : null
    const targetKey =
      body.communityCommentId ?? body.communityPostId ?? body.partyId ?? body.targetUserId ?? null
    if (
      targetKey &&
      mockReports.some(
        (item) =>
          item.reporter.id === mockUsers[1].id &&
          item.status !== 'resolved' &&
          item.status !== 'dismissed' &&
          [
            item.communityComment?.id,
            item.communityPost?.id,
            item.party?.id,
            item.target?.id,
          ].includes(targetKey),
      )
    ) {
      return HttpResponse.json(
        { code: 'duplicate_active_report', message: '이미 접수된 신고를 운영팀이 확인 중이에요.' },
        { status: 400 },
      )
    }
    const report: MockAdminReport = {
      id: `mock_report_${Date.now()}`,
      kind: body.kind,
      body: body.body,
      status: 'open',
      resolvedNote: null,
      autoHiddenAt: null,
      reporter: { id: mockUsers[1].id, nickname: mockUsers[1].nickname },
      target: target ? { id: target.id, nickname: target.nickname } : null,
      party: body.partyId ? { id: body.partyId, title: post?.partyTitle ?? '선택한 모임' } : null,
      communityPost: post ? { id: post.id, title: post.title } : null,
      communityComment: comment
        ? { id: comment.id, postId: comment.postId, body: comment.body }
        : null,
      auditTrail: [
        {
          id: `mock_audit_${Date.now()}`,
          action: 'report_created',
          note: body.kind,
          actorId: mockUsers[1].id,
          createdAt: nowIso(),
        },
      ],
      createdAt: nowIso(),
    }
    mockReports.unshift(report)
    return HttpResponse.json(await delay({ id: report.id, status: report.status }))
  }),

  // Orders / split
  http.get(`${API}/orders/party/:id/split`, async ({ request }) => {
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') ?? 'equal'
    return HttpResponse.json(
      await delay({
        mode,
        totalKRW: 184_000,
        headcount: 8,
        perPersonKRW: 23_000,
        breakdown: [],
      }),
    )
  }),

  // Orders (host management)
  http.get(`${API}/orders/party/:id`, async () => HttpResponse.json(await delay([]))),
  http.patch(`${API}/orders/:id/status`, async () => HttpResponse.json(await delay({ ok: true }))),

  // Follows
  http.get(`${API}/follows/me`, async () => HttpResponse.json(await delay([]))),
  http.get(`${API}/follows/me/followers`, async () =>
    HttpResponse.json(
      await delay([
        {
          id: mockUsers[1].id,
          nickname: mockUsers[1].nickname,
          avatarId: mockUsers[1].avatarId,
          bio: mockUsers[1].bio,
          isFollowing: false,
        },
      ]),
    ),
  ),
  http.post(`${API}/follows/:userId`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.delete(`${API}/follows/:userId`, async () => HttpResponse.json(await delay({ ok: true }))),

  // Community
  http.get(`${API}/community/posts`, async ({ request }) => {
    const url = new URL(request.url)
    const category = url.searchParams.get('category') as CommunityPostCategory | null
    const area = url.searchParams.get('area')
    const q = url.searchParams.get('q')?.toLowerCase()
    const page = Number(url.searchParams.get('page') ?? 1)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 12)
    const filtered = mockCommunityPosts.filter((post) => {
      if (category && post.category !== category) return false
      if (area && post.area !== area) return false
      if (q && !`${post.title} ${post.body}`.toLowerCase().includes(q)) return false
      return true
    })
    const start = (page - 1) * pageSize
    return HttpResponse.json(
      await delay({
        items: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        pageSize,
        hasNext: start + pageSize < filtered.length,
      }),
    )
  }),
  http.get(`${API}/community/posts/:postId`, async ({ params }) => {
    const post = mockCommunityPosts.find((item) => item.id === params.postId)
    if (!post) return HttpResponse.json({ code: 'community_post_not_found' }, { status: 404 })
    const comments = mockCommunityComments
      .filter((comment) => comment.postId === post.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return HttpResponse.json(
      await delay({ ...post, comments: buildCommunityCommentTree(comments) }),
    )
  }),
  http.post(`${API}/community/posts`, async ({ request }) => {
    const body = (await request.json()) as CreateCommunityPostDto
    const post: CommunityPost = {
      id: `cp_${Date.now()}`,
      title: body.title,
      body: body.body,
      category: body.category ?? 'question',
      area: body.area ?? null,
      partyId: body.partyId ?? null,
      partyTitle: null,
      tags: body.tags ?? [],
      commentCount: 0,
      lastCommentAt: null,
      author: {
        id: mockUsers[1].id,
        nickname: mockUsers[1].nickname,
        avatarId: mockUsers[1].avatarId,
        role: mockUsers[1].role,
        isVerified: mockUsers[1].isVerified,
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    mockCommunityPosts.unshift(post)
    return HttpResponse.json(await delay(post))
  }),
  http.patch(`${API}/community/posts/:postId`, async ({ params, request }) => {
    const post = mockCommunityPosts.find((item) => item.id === params.postId)
    if (!post) return HttpResponse.json({ code: 'community_post_not_found' }, { status: 404 })
    const body = (await request.json()) as UpdateCommunityPostDto
    if (typeof body.title !== 'undefined') post.title = body.title
    if (typeof body.body !== 'undefined') post.body = body.body
    if (typeof body.category !== 'undefined') post.category = body.category
    if (typeof body.area !== 'undefined') post.area = body.area
    if (typeof body.tags !== 'undefined') post.tags = body.tags
    post.updatedAt = nowIso()
    return HttpResponse.json(await delay(post))
  }),
  http.delete(`${API}/community/posts/:postId`, async ({ params }) => {
    const index = mockCommunityPosts.findIndex((item) => item.id === params.postId)
    if (index === -1) {
      return HttpResponse.json({ code: 'community_post_not_found' }, { status: 404 })
    }
    mockCommunityPosts.splice(index, 1)
    for (let i = mockCommunityComments.length - 1; i >= 0; i -= 1) {
      if (mockCommunityComments[i].postId === params.postId) mockCommunityComments.splice(i, 1)
    }
    return HttpResponse.json(await delay({ ok: true }))
  }),
  http.post(`${API}/community/posts/:postId/comments`, async ({ params, request }) => {
    const post = mockCommunityPosts.find((item) => item.id === params.postId)
    if (!post) return HttpResponse.json({ code: 'community_post_not_found' }, { status: 404 })
    const body = (await request.json()) as CreateCommunityCommentDto
    const parent = body.parentId
      ? mockCommunityComments.find((comment) => comment.id === body.parentId)
      : null
    if (body.parentId && (!parent || parent.postId !== post.id)) {
      return HttpResponse.json({ code: 'invalid_parent_comment' }, { status: 400 })
    }
    const parentId = parent?.parentId ?? parent?.id ?? null
    const created = {
      id: `cc_${Date.now()}`,
      postId: post.id,
      parentId,
      body: body.body,
      author: {
        id: mockUsers[1].id,
        nickname: mockUsers[1].nickname,
        avatarId: mockUsers[1].avatarId,
        role: mockUsers[1].role,
        isVerified: mockUsers[1].isVerified,
      },
      replies: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    mockCommunityComments.push(created)
    post.commentCount += 1
    post.lastCommentAt = created.createdAt
    return HttpResponse.json(await delay(created))
  }),
  http.patch(`${API}/community/posts/:postId/comments/:commentId`, async ({ params, request }) => {
    const comment = mockCommunityComments.find(
      (item) => item.id === params.commentId && item.postId === params.postId,
    )
    if (!comment) {
      return HttpResponse.json({ code: 'community_comment_not_found' }, { status: 404 })
    }
    const body = (await request.json()) as UpdateCommunityCommentDto
    comment.body = body.body
    comment.updatedAt = nowIso()
    return HttpResponse.json(await delay(comment))
  }),
  http.delete(`${API}/community/posts/:postId/comments/:commentId`, async ({ params }) => {
    const removeIds = new Set(
      mockCommunityComments
        .filter(
          (item) =>
            item.postId === params.postId &&
            (item.id === params.commentId || item.parentId === params.commentId),
        )
        .map((item) => item.id),
    )
    if (removeIds.size === 0) {
      return HttpResponse.json({ code: 'community_comment_not_found' }, { status: 404 })
    }
    for (let i = mockCommunityComments.length - 1; i >= 0; i -= 1) {
      if (removeIds.has(mockCommunityComments[i].id)) mockCommunityComments.splice(i, 1)
    }
    const post = mockCommunityPosts.find((item) => item.id === params.postId)
    if (post) post.commentCount = Math.max(0, post.commentCount - removeIds.size)
    return HttpResponse.json(await delay({ ok: true }))
  }),

  // Saved parties
  http.get(`${API}/saved`, async () => HttpResponse.json(await delay([]))),
  http.post(`${API}/saved/:partyId`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.delete(`${API}/saved/:partyId`, async () => HttpResponse.json(await delay({ ok: true }))),

  // Notifications
  http.get(`${API}/notifications/unread-count`, async () =>
    HttpResponse.json(
      await delay({ count: mockNotifications.filter((item) => !item.isRead).length }),
    ),
  ),
  http.get(`${API}/notifications`, async () => HttpResponse.json(await delay(mockNotifications))),
  http.post(`${API}/notifications/read-all`, async () => {
    mockNotifications.forEach((item) => {
      item.isRead = true
    })
    return HttpResponse.json(await delay({ ok: true }))
  }),
  http.post(`${API}/notifications/:id/read`, async ({ params }) => {
    const item = mockNotifications.find((notification) => notification.id === params.id)
    if (item) item.isRead = true
    return HttpResponse.json(await delay({ ok: true }))
  }),

  // Host profile (public)
  http.get(`${API}/hosts/:id`, async () =>
    HttpResponse.json(
      await delay({
        user: {
          ...mockUsers[0],
          bio: null,
          mbti: 'ENFP',
          interestsJson: '[]',
          trustScore: 92,
          hostedCount: 3,
          isVerified: true,
          role: 'host',
        },
        stats: { followerCount: 12, hostedCount: 3, averageRating: 4.7, reviewCount: 5 },
        reviews: [],
        recentParties: [mockParties[0]].map(toSummary),
      }),
    ),
  ),

  // Host revenue summary
  http.get(`${API}/payments/host/summary`, async ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(
      await delay(
        getMockHostRevenueSummary({
          hostId: mockUsers[0].id,
          from: url.searchParams.get('from'),
          to: url.searchParams.get('to'),
          partyId: url.searchParams.get('partyId'),
          compareMode: url.searchParams.get('compareMode') ?? undefined,
        }),
      ),
    )
  }),

  http.get(`${API}/payments/admin/monitoring-policy`, async () =>
    HttpResponse.json(await delay(monitoringPolicySnapshot())),
  ),
  http.patch(`${API}/payments/admin/monitoring-policy`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as MonitoringPolicyUpdateBody
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const hasAnyField =
      typeof body.warningRefundRatePercent !== 'undefined' ||
      typeof body.dangerRefundRatePercent !== 'undefined' ||
      typeof body.topPartyConcentrationPercent !== 'undefined'
    if (!hasAnyField) {
      return HttpResponse.json({ code: 'invalid_monitoring_policy' }, { status: 400 })
    }

    const previous = { ...mockMonitoringPolicy }
    if (typeof body.warningRefundRatePercent !== 'undefined') {
      const value = Number(body.warningRefundRatePercent)
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return HttpResponse.json({ code: 'invalid_warning_refund_rate_threshold' }, { status: 400 })
      }
      mockMonitoringPolicy.warningRefundRatePercent = safePercent(value)
    }
    if (typeof body.dangerRefundRatePercent !== 'undefined') {
      const value = Number(body.dangerRefundRatePercent)
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return HttpResponse.json({ code: 'invalid_danger_refund_rate_threshold' }, { status: 400 })
      }
      mockMonitoringPolicy.dangerRefundRatePercent = safePercent(value)
    }
    if (typeof body.topPartyConcentrationPercent !== 'undefined') {
      const value = Number(body.topPartyConcentrationPercent)
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return HttpResponse.json(
          { code: 'invalid_top_party_concentration_threshold' },
          { status: 400 },
        )
      }
      mockMonitoringPolicy.topPartyConcentrationPercent = safePercent(value)
    }

    if (
      mockMonitoringPolicy.warningRefundRatePercent > mockMonitoringPolicy.dangerRefundRatePercent
    ) {
      mockMonitoringPolicy = previous
      return HttpResponse.json({ code: 'invalid_monitoring_policy_order' }, { status: 400 })
    }

    const changed =
      previous.warningRefundRatePercent !== mockMonitoringPolicy.warningRefundRatePercent ||
      previous.dangerRefundRatePercent !== mockMonitoringPolicy.dangerRefundRatePercent ||
      previous.topPartyConcentrationPercent !== mockMonitoringPolicy.topPartyConcentrationPercent

    if (changed) {
      appendMonitoringPolicyHistory(previous, mockMonitoringPolicy, reason)
      mockMonitoringPolicyUpdatedAt = nowIso()
      mockMonitoringPolicyUpdatedBy = mockUsers[0].id
    }

    return HttpResponse.json(await delay(monitoringPolicySnapshot()))
  }),

  http.get(`${API}/payments/admin/monitoring-policy/history`, async ({ request }) => {
    const url = new URL(request.url)
    const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '20', 10)
    const safeLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20
    const sorted = mockMonitoringPolicyHistories
      .slice()
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
    return HttpResponse.json(await delay(sorted.slice(0, safeLimit)))
  }),
  http.post(`${API}/payments/admin/monitoring-policy/rollback`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as RollbackMonitoringPolicyBody
    const sorted = mockMonitoringPolicyHistories
      .slice()
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
    const targetHistory = body.historyId
      ? sorted.find((history) => history.id === body.historyId)
      : sorted[0]

    if (!targetHistory) {
      return HttpResponse.json({ code: 'monitoring_policy_history_not_found' }, { status: 404 })
    }

    const previous = { ...mockMonitoringPolicy }
    const next = {
      warningRefundRatePercent: targetHistory.fromWarningRefundRatePercent,
      dangerRefundRatePercent: targetHistory.fromDangerRefundRatePercent,
      topPartyConcentrationPercent: targetHistory.fromTopPartyConcentrationPercent,
    }
    const reason =
      typeof body.reason === 'string' && body.reason.trim().length > 0
        ? body.reason.trim()
        : '이전 설정으로 롤백'

    const changed =
      previous.warningRefundRatePercent !== next.warningRefundRatePercent ||
      previous.dangerRefundRatePercent !== next.dangerRefundRatePercent ||
      previous.topPartyConcentrationPercent !== next.topPartyConcentrationPercent

    if (changed) {
      appendMonitoringPolicyHistory(previous, next, reason)
      mockMonitoringPolicy = next
      mockMonitoringPolicyUpdatedAt = nowIso()
      mockMonitoringPolicyUpdatedBy = mockUsers[0].id
    }

    return HttpResponse.json(await delay(monitoringPolicySnapshot()))
  }),

  http.get(`${API}/payments/admin/revenue-rules`, async () =>
    HttpResponse.json(await delay(revenueRuleSnapshot())),
  ),
  http.post(`${API}/payments/admin/revenue-rules/simulate`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as MockRevenueRuleSimulationRequest
    if (!body || typeof body !== 'object') {
      return HttpResponse.json({ code: 'invalid_revenue_rules_payload' }, { status: 400 })
    }

    const platformFeePercent =
      typeof body.platformFeePercent === 'number'
        ? Number(body.platformFeePercent)
        : typeof body.platformFeePercent === 'string'
          ? Number(body.platformFeePercent)
          : undefined
    const refundRetentionPercent =
      typeof body.refundRetentionPercent === 'number'
        ? Number(body.refundRetentionPercent)
        : typeof body.refundRetentionPercent === 'string'
          ? Number(body.refundRetentionPercent)
          : undefined
    const minimumHostPayoutPercent =
      typeof body.minimumHostPayoutPercent === 'number'
        ? Number(body.minimumHostPayoutPercent)
        : typeof body.minimumHostPayoutPercent === 'string'
          ? Number(body.minimumHostPayoutPercent)
          : undefined

    if (
      typeof platformFeePercent === 'undefined' &&
      typeof refundRetentionPercent === 'undefined' &&
      typeof minimumHostPayoutPercent === 'undefined'
    ) {
      return HttpResponse.json({ code: 'invalid_revenue_rules' }, { status: 400 })
    }

    if (typeof platformFeePercent !== 'undefined') {
      if (
        !Number.isFinite(platformFeePercent) ||
        platformFeePercent < 0 ||
        platformFeePercent > 100
      ) {
        return HttpResponse.json({ code: 'invalid_platform_fee' }, { status: 400 })
      }
    }

    if (typeof refundRetentionPercent !== 'undefined') {
      if (
        !Number.isFinite(refundRetentionPercent) ||
        refundRetentionPercent < 0 ||
        refundRetentionPercent > 100
      ) {
        return HttpResponse.json({ code: 'invalid_refund_retention' }, { status: 400 })
      }
    }

    if (typeof minimumHostPayoutPercent !== 'undefined') {
      if (
        !Number.isFinite(minimumHostPayoutPercent) ||
        minimumHostPayoutPercent < 0 ||
        minimumHostPayoutPercent > 100
      ) {
        return HttpResponse.json({ code: 'invalid_minimum_host_payout' }, { status: 400 })
      }
    }

    const previous = {
      platformFeePercent: mockRevenueRules.platformFeePercent,
      refundRetentionPercent: mockRevenueRules.refundRetentionPercent,
      minimumHostPayoutPercent: mockRevenueRules.minimumHostPayoutPercent,
    }
    const next = {
      platformFeePercent:
        typeof platformFeePercent === 'number'
          ? safePercent(platformFeePercent)
          : previous.platformFeePercent,
      refundRetentionPercent:
        typeof refundRetentionPercent === 'number'
          ? safePercent(refundRetentionPercent)
          : previous.refundRetentionPercent,
      minimumHostPayoutPercent:
        typeof minimumHostPayoutPercent === 'number'
          ? safePercent(minimumHostPayoutPercent)
          : previous.minimumHostPayoutPercent,
    }

    const currentSummaryOptions = {
      from: body.from ?? null,
      to: body.to ?? null,
      partyId: body.partyId ?? null,
      topLimit: body.topLimit ?? 12,
      compareMode: 'none',
    }
    const currentHealthScore = buildMockProjectedRevenueHealthScore(previous, currentSummaryOptions)
    const simulatedHealthScore = buildMockProjectedRevenueHealthScore(next, currentSummaryOptions)

    return HttpResponse.json(
      await delay({
        currentRules: previous,
        nextRules: next,
        currentHealthScore,
        simulatedHealthScore,
        scoreDelta: simulatedHealthScore.score - currentHealthScore.score,
      } as MockRevenueRuleSimulationResponse),
    )
  }),
  http.patch(`${API}/payments/admin/revenue-rules`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      platformFeePercent?: unknown
      refundRetentionPercent?: unknown
      minimumHostPayoutPercent?: unknown
      reason?: string
    }
    const previous = {
      platformFeePercent: mockRevenueRules.platformFeePercent,
      refundRetentionPercent: mockRevenueRules.refundRetentionPercent,
      minimumHostPayoutPercent: mockRevenueRules.minimumHostPayoutPercent,
    }

    if (
      typeof body.platformFeePercent === 'undefined' &&
      typeof body.refundRetentionPercent === 'undefined' &&
      typeof body.minimumHostPayoutPercent === 'undefined'
    ) {
      return HttpResponse.json({ code: 'invalid_revenue_rules' }, { status: 400 })
    }

    if (typeof body.platformFeePercent !== 'undefined') {
      const value = Number(body.platformFeePercent)
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return HttpResponse.json({ code: 'invalid_platform_fee' }, { status: 400 })
      }
      mockRevenueRules.platformFeePercent = safePercent(value)
    }
    if (typeof body.refundRetentionPercent !== 'undefined') {
      const value = Number(body.refundRetentionPercent)
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return HttpResponse.json({ code: 'invalid_refund_retention' }, { status: 400 })
      }
      mockRevenueRules.refundRetentionPercent = safePercent(value)
    }
    if (typeof body.minimumHostPayoutPercent !== 'undefined') {
      const value = Number(body.minimumHostPayoutPercent)
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return HttpResponse.json({ code: 'invalid_minimum_host_payout' }, { status: 400 })
      }
      mockRevenueRules.minimumHostPayoutPercent = safePercent(value)
    }

    const next = {
      platformFeePercent: mockRevenueRules.platformFeePercent,
      refundRetentionPercent: mockRevenueRules.refundRetentionPercent,
      minimumHostPayoutPercent: mockRevenueRules.minimumHostPayoutPercent,
    }
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const projectedHealthScore = buildMockProjectedRevenueHealthScore(next)
    if (projectedHealthScore?.level === 'critical' && !reason) {
      return HttpResponse.json(
        {
          code: 'invalid_revenue_rules_reason_required',
          message: '수익 건전성이 위험 구간입니다. 변경 사유를 반드시 입력해 주세요.',
        },
        { status: 400 },
      )
    }

    if (
      next.platformFeePercent !== previous.platformFeePercent ||
      next.refundRetentionPercent !== previous.refundRetentionPercent ||
      next.minimumHostPayoutPercent !== previous.minimumHostPayoutPercent
    ) {
      appendRevenueRuleHistory(previous, next, reason)
    }

    mockRevenueRules.updatedAt = nowIso()
    mockRevenueRules.updatedBy = mockUsers[0].id

    return HttpResponse.json(await delay(revenueRuleSnapshot()))
  }),
  http.get(`${API}/payments/admin/revenue-rules/history`, async ({ request }) => {
    const url = new URL(request.url)
    const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '20', 10)
    const safeLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20
    return HttpResponse.json(await delay(mockRevenueRuleHistories.slice(0, safeLimit)))
  }),
  http.post(`${API}/payments/admin/revenue-rules/rollback`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      historyId?: string
      reason?: string
    }

    const targetHistory = body.historyId
      ? mockRevenueRuleHistories.find((item) => item.id === body.historyId)
      : mockRevenueRuleHistories[0]
    if (!targetHistory) {
      return HttpResponse.json({ code: 'revenue_rule_history_not_found' }, { status: 404 })
    }

    const previous = {
      platformFeePercent: mockRevenueRules.platformFeePercent,
      refundRetentionPercent: mockRevenueRules.refundRetentionPercent,
      minimumHostPayoutPercent: mockRevenueRules.minimumHostPayoutPercent,
    }

    const next = {
      platformFeePercent: targetHistory.fromPlatformFeePercent,
      refundRetentionPercent: targetHistory.fromRefundRetentionPercent,
      minimumHostPayoutPercent: targetHistory.fromMinimumHostPayoutPercent,
    }

    if (
      next.platformFeePercent !== previous.platformFeePercent ||
      next.refundRetentionPercent !== previous.refundRetentionPercent ||
      next.minimumHostPayoutPercent !== previous.minimumHostPayoutPercent
    ) {
      const reason =
        typeof body.reason === 'string' && body.reason.trim().length > 0
          ? body.reason.trim()
          : '이전 설정으로 롤백'

      appendRevenueRuleHistory(previous, next, reason)
      mockRevenueRules.platformFeePercent = next.platformFeePercent
      mockRevenueRules.refundRetentionPercent = next.refundRetentionPercent
      mockRevenueRules.minimumHostPayoutPercent = next.minimumHostPayoutPercent
      mockRevenueRules.updatedAt = nowIso()
      mockRevenueRules.updatedBy = mockUsers[0].id
    }

    return HttpResponse.json(await delay(revenueRuleSnapshot()))
  }),
  http.get(`${API}/payments/admin/summary`, async ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(
      await delay(
        getMockAdminRevenueSummary({
          from: url.searchParams.get('from'),
          to: url.searchParams.get('to'),
          partyId: url.searchParams.get('partyId'),
          topLimit: url.searchParams.get('topLimit') ?? undefined,
          compareMode: url.searchParams.get('compareMode') ?? undefined,
        }),
      ),
    )
  }),

  // Vibe matching
  http.post(`${API}/vibe`, async () =>
    HttpResponse.json(
      await delay({
        matches: mockParties.slice(0, 3).map(toSummary),
        explanation: '입력하신 분위기와 가장 잘 맞는 모임을 골라봤어요.',
      }),
    ),
  ),

  // Host applications
  http.get(`${API}/host-applications/mine`, async () => HttpResponse.json(await delay(null))),
  http.post(`${API}/host-applications`, async () =>
    HttpResponse.json(
      await delay({
        id: 'app-mock',
        userId: mockUsers[0].id,
        introduction: '',
        hostingStyle: '',
        plannedCategories: [],
        experience: null,
        status: 'pending',
        reviewedById: null,
        reviewedNote: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ),
  ),

  // Admin
  http.get(`${API}/admin/reports`, async ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const reports = status ? mockReports.filter((report) => report.status === status) : mockReports
    return HttpResponse.json(await delay(reports))
  }),
  http.patch(`${API}/admin/reports/:id`, async ({ params, request }) => {
    const body = (await request.json()) as {
      status: MockAdminReport['status']
      hideContent?: boolean
      note?: string
    }
    const report = mockReports.find((item) => item.id === params.id)
    if (!report) return HttpResponse.json({ code: 'report_not_found' }, { status: 404 })
    report.status = body.status
    report.resolvedNote = body.note ?? null
    if (body.hideContent && report.communityComment) {
      const comment = mockCommunityComments.find((item) => item.id === report.communityComment?.id)
      if (comment) comment.body = '[운영 기준에 따라 숨김 처리된 댓글입니다.]'
    }
    if (body.hideContent && report.communityPost && !report.communityComment) {
      const post = mockCommunityPosts.find((item) => item.id === report.communityPost?.id)
      if (post) post.body = '[운영 기준에 따라 숨김 처리된 글입니다.]'
    }
    report.auditTrail = [
      {
        id: `mock_audit_${Date.now()}`,
        action: body.hideContent ? 'content_hidden_and_status_updated' : 'status_updated',
        note: body.note ?? null,
        actorId: mockUsers[0].id,
        createdAt: nowIso(),
      },
      ...(report.auditTrail ?? []),
    ]
    return HttpResponse.json(await delay({ ok: true }))
  }),
  // Recent reviews (digest)
  http.get(`${API}/reviews/recent`, async () => HttpResponse.json(await delay([]))),

  http.post(`${API}/reviews`, async ({ request }) => {
    const body = (await request.json()) as {
      partyId?: string
      targetUserId?: string
      rating?: number
      body?: string
      anonymous?: boolean
      tags?: string[]
    }
    const newReview = {
      id: `review_${Date.now()}`,
      partyId: body.partyId ?? null,
      targetUserId: body.targetUserId ?? null,
      rating: body.rating ?? 5,
      body: body.body ?? '',
      anonymous: body.anonymous ?? true,
      tags: body.tags ?? [],
      author: { nickname: mockUsers[0].nickname, avatarId: mockUsers[0].avatarId ?? null },
      hostReply: null,
      hostRepliedAt: null,
      createdAt: nowIso(),
    }
    mockReviews.unshift(newReview)
    return HttpResponse.json(await delay(newReview))
  }),
  http.patch(`${API}/reviews/:id/reply`, async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { body?: string }
    const rev = mockReviews.find((r) => r.id === params.id)
    if (rev) {
      rev.hostReply = body.body ?? ''
      rev.hostRepliedAt = nowIso()
    }
    return HttpResponse.json(
      await delay({
        id: params.id,
        hostReply: body.body ?? '',
        hostRepliedAt: nowIso(),
      }),
    )
  }),
  http.get(`${API}/users/:id/reviews`, async () =>
    HttpResponse.json(
      await delay({
        averageRating: 4.8,
        count: 2,
        reviews: [
          {
            id: 'host_review_1',
            rating: 5,
            body: '시간 배분과 분위기 조율이 안정적이었어요.',
            createdAt: nowIso(),
            author: { nickname: '참가자', avatarId: null },
          },
        ],
      }),
    ),
  ),

  // Account / profile
  http.get(`${API}/users/me/referral`, async () =>
    HttpResponse.json(
      await delay({ referralCode: 'ROTI-2026', pointsKRW: 12_000, referredCount: 3 }),
    ),
  ),
  http.patch(`${API}/avatars/me`, async ({ request }) =>
    HttpResponse.json(
      await delay({
        id: 'avatar_me',
        ownerId: mockUsers[0].id,
        mood: 'sparkling',
        hue: '#7A1F3D',
        pattern: 'gradient',
        emojiBadge: '🍷',
        faceSeed: mockUsers[0].nickname,
        ...((await request.json()) as Record<string, unknown>),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }),
    ),
  ),
  http.patch(`${API}/users/me`, async ({ request }) => {
    const body = (await request.json()) as Partial<(typeof mockUsers)[number]>
    Object.assign(mockUsers[0], body, { updatedAt: nowIso() })
    return HttpResponse.json(await delay(mockUsers[0]))
  }),
  http.post(`${API}/users/me/become-host`, async () => {
    mockUsers[0].role = 'host'
    mockUsers[0].updatedAt = nowIso()
    return HttpResponse.json(await delay(mockUsers[0]))
  }),
  http.delete(`${API}/users/me`, async () => HttpResponse.json(await delay({ ok: true }))),

  // Payments host summary (kakao quick create)
  http.post(`${API}/auth/kakao`, async ({ request }) => {
    const body = (await request.json()) as { kakaoId: string; nickname: string }
    return HttpResponse.json(
      await delay({
        token: MOCK_TOKEN,
        user: { ...mockUsers[0], nickname: body.nickname },
      }),
    )
  }),

  // Match reveal — 내 인연 (파티 정책대로 산출; mock은 상호 매칭 1건)
  http.get(`${API}/parties/:partyId/matching/my-matches`, async ({ params }) => {
    const partyId = String(params.partyId)
    const party = mockParties.find((p) => p.id === partyId)
    const scope = party?.config?.matchScope ?? 'mutual-only'
    const contactExchangePolicy = party?.config?.contactExchangePolicy ?? 'mutual-consent'
    const connectionChannels = party?.config?.connectionChannels ?? ['chat', 'instagram']
    const isChatOnly = contactExchangePolicy === 'chat-only'
    const userId = 'u_host'
    const partnerId = 'u_w1'
    const channels =
      contactExchangePolicy === 'request-approval'
        ? buildMockRequestApprovalChannels(partyId, userId, partnerId, connectionChannels)
        : connectionChannels.map((channel) => ({
            channel,
            handle:
              channel === 'chat' || isChatOnly
                ? null
                : mockContactHandle(partnerId, channel as ConnectionChannel),
          }))

    return HttpResponse.json(
      await delay({
        scope,
        contactExchangePolicy,
        connectionChannels,
        groupAfterParty: Boolean(party?.config?.groupAfterParty),
        myLikesReceived: 3,
        matches: [
          {
            partnerId,
            nickname: '윤슬',
            avatarId: 'a_w1',
            result:
              scope === 'top-n' ? 'top-pick' : scope === 'all-participants' ? 'all' : 'mutual',
            phone: isChatOnly ? null : '010-1234-5678',
            compatibility: {
              score: 87,
              title: '천생연분 ✨',
              blurb: '오늘 같은 흐름, 흔치 않아요.',
            },
            verified: true,
            channels,
          },
          ...(scope === 'top-n' || scope === 'mutual-plus-top-n'
            ? [
                {
                  partnerId: 'u_w2',
                  nickname: '안개',
                  avatarId: 'a_w2',
                  result: 'top-pick',
                  phone: isChatOnly ? null : '010-9999-8888',
                  compatibility: {
                    score: 74,
                    title: '탐색 가능성',
                    blurb: '대화 주제 호환성이 높은 편이에요.',
                  },
                  verified: false,
                  channels: [
                    { channel: 'chat', handle: null },
                    { channel: 'instagram', handle: isChatOnly ? null : 'haeun_pic' },
                    { channel: 'kakao', handle: isChatOnly ? null : null },
                    { channel: 'phone', handle: isChatOnly ? null : '010-9999-8888' },
                  ],
                },
              ]
            : []),
        ],
      }),
    )
  }),

  http.post(
    `${API}/parties/:partyId/matching/contact-requests/:partnerId`,
    async ({ params, request }) => {
      const partyId = String(params.partyId)
      const partnerId = String(params.partnerId)
      const body = (await request.json()) as { channel: ConnectionChannel }
      const userId = 'u_host'
      const existing = mockContactExchangeRequests.find(
        (item) =>
          item.partyId === partyId &&
          item.requesterId === userId &&
          item.receiverId === partnerId &&
          item.channel === body.channel,
      )
      if (existing) {
        existing.status = 'pending'
        existing.decidedAt = null
        existing.decidedById = null
        return HttpResponse.json(
          await delay({
            requestId: existing.id,
            status: existing.status,
            channel: existing.channel,
          }),
        )
      }

      const record: MockContactExchangeRequest = {
        id: `cx_mock_${Date.now()}`,
        partyId,
        requesterId: userId,
        receiverId: partnerId,
        channel: body.channel,
        status: 'pending',
        decidedById: null,
        decidedAt: null,
        createdAt: nowIso(),
      }
      mockContactExchangeRequests.push(record)
      return HttpResponse.json(
        await delay({ requestId: record.id, status: record.status, channel: record.channel }),
      )
    },
  ),

  http.post(
    `${API}/parties/:partyId/matching/contact-requests/:requestId/decision`,
    async ({ params, request }) => {
      const body = (await request.json()) as { action: 'approve' | 'reject' }
      const record = mockContactExchangeRequests.find((item) => item.id === params.requestId)
      if (!record) {
        return HttpResponse.json(
          { code: 'contact_request_not_found', message: '요청을 찾을 수 없어요' },
          { status: 404 },
        )
      }
      record.status = body.action === 'approve' ? 'approved' : 'rejected'
      record.decidedAt = nowIso()
      record.decidedById = 'u_host'
      return HttpResponse.json(
        await delay({
          requestId: record.id,
          status: record.status,
          channel: record.channel,
          decidedById: record.decidedById,
        }),
      )
    },
  ),

  // Match reveal — 오늘의 인기남/인기녀 (성별별 최다 호감 1인)
  http.get(`${API}/parties/:partyId/matching/popular`, async () =>
    HttpResponse.json(
      await delay({
        revealPopular: true,
        popularMale: { userId: 'u_m1', nickname: '도현', avatarId: 'a_m1', likes: 4 },
        popularFemale: { userId: 'u_w1', nickname: '윤슬', avatarId: 'a_w1', likes: 5 },
      }),
    ),
  ),

  // Notes (쪽지)
  http.get(`${API}/notes/mine`, async () => HttpResponse.json(await delay([]))),
  http.get(`${API}/notes/party/:partyId`, async () =>
    HttpResponse.json(await delay({ received: [], sent: [] })),
  ),
  http.post(`${API}/notes`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      await delay({ id: `note_${Date.now()}`, ...body, deliveredAt: null, readAt: null }),
    )
  }),
  http.patch(`${API}/notes/:id/read`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.post(`${API}/notes/party/:partyId/deliver`, async () =>
    HttpResponse.json(await delay({ delivered: 0 })),
  ),

  // Me (사전 프로필 · 신상 인증 · 지인 회피)
  http.patch(`${API}/me/profile`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.patch(`${API}/me/trust`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.post(`${API}/me/verify`, async ({ request }) => {
    const body = (await request.json()) as { field?: string }
    return HttpResponse.json(await delay({ verifiedFields: body.field ? [body.field] : [] }))
  }),
  http.patch(`${API}/me/contact`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.get(`${API}/me/avoid-contacts`, async () => HttpResponse.json(await delay([]))),
  http.post(`${API}/me/avoid-contacts`, async () => HttpResponse.json(await delay({ count: 1 }))),
  http.delete(`${API}/me/avoid-contacts/:id`, async () =>
    HttpResponse.json(await delay({ ok: true })),
  ),
  http.get(`${API}/me/avoid-people`, async () => HttpResponse.json(await delay(mockAvoidPeople))),
  http.post(`${API}/me/avoid-people`, async ({ request }) => {
    const body = (await request.json()) as { label?: string }
    const item = {
      id: `avoid-person-${Date.now()}`,
      label: body.label ?? null,
      createdAt: nowIso(),
    }
    mockAvoidPeople.unshift(item)
    return HttpResponse.json(await delay(item))
  }),
  http.delete(`${API}/me/avoid-people/:id`, async ({ params }) => {
    const index = mockAvoidPeople.findIndex((item) => item.id === params.id)
    if (index >= 0) mockAvoidPeople.splice(index, 1)
    return HttpResponse.json(await delay({ ok: true }))
  }),
  http.get(`${API}/me/avoid-check`, async () => HttpResponse.json(await delay([]))),
  http.patch(`${API}/me/avoid-prefs`, async ({ request }) =>
    HttpResponse.json(await delay((await request.json()) as Record<string, unknown>)),
  ),
  http.patch(`${API}/me/privacy`, async ({ request }) =>
    HttpResponse.json(await delay((await request.json()) as Record<string, unknown>)),
  ),

  // ============ After Party (2차 모임) 모의 핸들러 ============
  http.get(`${API}/parties/:partyId/after-party`, async ({ params }) => {
    const data = getOrCreateAfterParty(params.partyId as string)
    return HttpResponse.json(await delay(data))
  }),

  http.post(`${API}/parties/:partyId/after-party/vote`, async ({ params, request }) => {
    const {
      status,
      nickname,
      userId = 'me',
    } = (await request.json()) as {
      status: 'go' | 'maybe' | 'no'
      nickname?: string
      userId?: string
    }
    const data = getOrCreateAfterParty(params.partyId as string)

    const existing = data.votes.find((v) => v.userId === userId)
    if (existing) {
      existing.status = status
    } else {
      data.votes.push({ userId, status, nickname: nickname ?? '나', avatarId: 'a_default' })
    }
    return HttpResponse.json(await delay(data))
  }),

  http.post(`${API}/parties/:partyId/after-party/venue-vote`, async ({ params, request }) => {
    const { venueId, userId = 'me' } = (await request.json()) as {
      venueId: string
      userId?: string
    }
    const data = getOrCreateAfterParty(params.partyId as string)

    const venue = data.suggestedVenues.find((v) => v.id === venueId)
    if (venue) {
      const idx = venue.votes.indexOf(userId)
      if (idx >= 0) {
        venue.votes.splice(idx, 1)
      } else {
        venue.votes.push(userId)
      }
    }
    return HttpResponse.json(await delay(data))
  }),

  http.post(`${API}/parties/:partyId/after-party/confirm`, async ({ params, request }) => {
    const body = (await request.json()) as { venueName: string; address: string; time: string }
    const data = getOrCreateAfterParty(params.partyId as string)

    data.status = 'confirmed'
    data.confirmedVenue = {
      name: body.venueName,
      type: '호스트 확정 장소',
      area: '연남',
      address: body.address || '서울 마포구 연남동 123-45 2층',
      time: body.time || '오후 9시 30분',
      link: 'https://map.naver.com',
    }
    return HttpResponse.json(await delay(data))
  }),
]

// ============ After Party (2차 모임) 모의 DB ============
const mockAfterParties: Record<
  string,
  {
    status: 'voting' | 'confirmed' | 'cancelled'
    votes: { userId: string; status: 'go' | 'maybe' | 'no'; nickname: string; avatarId?: string }[]
    suggestedVenues: {
      id: string
      name: string
      type: string
      area: string
      distance: string
      votes: string[]
    }[]
    confirmedVenue?: {
      name: string
      type: string
      area: string
      address: string
      time: string
      link: string
    } | null
  }
> = {}

function getOrCreateAfterParty(partyId: string) {
  if (!mockAfterParties[partyId]) {
    mockAfterParties[partyId] = {
      status: 'voting',
      votes: [
        { userId: 'u_m1', status: 'go', nickname: '도현', avatarId: 'a_m1' },
        { userId: 'u_w1', status: 'go', nickname: '윤슬', avatarId: 'a_w1' },
        { userId: 'u_m2', status: 'maybe', nickname: '현우', avatarId: 'a_m2' },
        { userId: 'u_w2', status: 'no', nickname: '서연', avatarId: 'a_w2' },
      ],
      suggestedVenues: [
        {
          id: 'v_af1',
          name: '연남 어스름 (2차)',
          type: '위스키 & 와인바',
          area: '연남',
          distance: '도보 3분',
          votes: ['u_m1', 'u_w1'],
        },
        {
          id: 'v_af2',
          name: '길목 이자카야',
          type: '캐주얼 펍',
          area: '연남',
          distance: '도보 5분',
          votes: ['u_m2'],
        },
        {
          id: 'v_af3',
          name: '누보 디저트 카페',
          type: '카페 & 논알콜',
          area: '연남',
          distance: '도보 2분',
          votes: [],
        },
      ],
      confirmedVenue: null,
    }
  }
  return mockAfterParties[partyId]
}
