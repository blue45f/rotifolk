import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Module,
  NotFoundException,
  Patch,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ageFromBirthYear, resolveParticipantPrice } from '@rotifolk/shared'
import { REVENUE_MONITORING_POLICY, computeRevenueHealthScore } from '@rotifolk/shared'
import type { PricingRule, RevenueHealthAlertThreshold } from '@rotifolk/shared'
import { PrismaService } from '@/prisma/prisma.service'
import { parseJsonArray } from '@/common/json-utils'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'

type PaymentMethod = 'card' | 'kakao' | 'toss' | 'mock'
const ALLOWED_METHODS: PaymentMethod[] = ['card', 'kakao', 'toss', 'mock']

interface RevenueRules {
  platformFeePercent: number
  refundRetentionPercent: number
  minimumHostPayoutPercent: number
}

interface RevenueRuleSnapshot {
  platformFeePercent: number
  refundRetentionPercent: number
  minimumHostPayoutPercent: number
  updatedAt: string
  updatedBy: string | null
}

interface RevenueRuleRecord {
  key: string
  platformFeePercent: number
  refundRetentionPercent: number
  minimumHostPayoutPercent: number
  updatedAt: Date
  updatedBy: string | null
}

interface RevenueRuleChangeHistory {
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

type RevenueRuleHistoryRow = {
  id: string
  key: string
  fromPlatformFeePercent: number
  toPlatformFeePercent: number
  fromRefundRetentionPercent: number
  toRefundRetentionPercent: number
  fromMinimumHostPayoutPercent: number
  toMinimumHostPayoutPercent: number
  changedBy: string | null
  changedAt: Date
  reason: string | null
}

type MonitoringPolicyRecord = {
  key: string
  warningRefundRatePercent: number
  dangerRefundRatePercent: number
  topPartyConcentrationPercent: number
  updatedBy: string | null
  updatedAt: Date
}

type MonitoringPolicyHistoryRow = {
  id: string
  key: string
  fromWarningRefundRatePercent: number
  toWarningRefundRatePercent: number
  fromDangerRefundRatePercent: number
  toDangerRefundRatePercent: number
  fromTopPartyConcentrationPercent: number
  toTopPartyConcentrationPercent: number
  changedBy: string | null
  changedAt: Date
  reason: string | null
}

interface MonitoringPolicySnapshot {
  healthAlerts: RevenueHealthAlertThreshold
  updatedAt: string
  updatedBy: string | null
}

interface MonitoringPolicyChangeHistory {
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

interface MonitoringPolicyUpdateBody {
  warningRefundRatePercent?: number
  dangerRefundRatePercent?: number
  topPartyConcentrationPercent?: number
  reason?: string
}

interface RollbackMonitoringPolicyBody {
  historyId?: string
  reason?: string
}

interface RevenueRuleSimulationInput {
  platformFeePercent?: number
  refundRetentionPercent?: number
  minimumHostPayoutPercent?: number
  from?: string
  to?: string
  partyId?: string
  topLimit?: number | string
}

interface RevenueRuleSimulationResponse {
  currentRules: RevenueRules
  nextRules: RevenueRules
  currentHealthScore: ReturnType<typeof computeRevenueHealthScore>
  simulatedHealthScore: ReturnType<typeof computeRevenueHealthScore>
  scoreDelta: number
}

type RevenueComparisonMode = 'none' | 'previous_period' | 'previous_month' | 'previous_year'

interface AdminRevenueComparison {
  mode: RevenueComparisonMode
  enabled: boolean
  rangeFrom: string | null
  rangeTo: string | null
}

interface AdminRevenueSummaryParty {
  partyId: string
  partyTitle: string
  hostId: string
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
  topParties: AdminRevenueSummaryParty[]
  rules: RevenueRules
  partyCount: number
  refundRatePercent: number
  rangeFrom: string | null
  rangeTo: string | null
  previousPeriod: AdminRevenueTrend | null
  comparison: AdminRevenueComparison
  healthAlerts: AdminRevenueHealthAlert[]
}

interface RevenueSummaryComputed {
  totalPaidCount: number
  totalRefundedCount: number
  grossPaidKRW: number
  grossRefundedKRW: number
  netSalesKRW: number
  platformFeeKRW: number
  refundRetentionKRW: number
  hostPayoutKRW: number
  platformRevenueKRW: number
  minimumHostPayoutPercent: number
  avgTicketKRW: number
  topParties: AdminRevenueSummaryParty[]
  partyCount: number
  refundRatePercent: number
}

interface PayBody {
  method?: PaymentMethod
}

interface UpdateRevenueRulesBody {
  platformFeePercent?: number
  refundRetentionPercent?: number
  minimumHostPayoutPercent?: number
  reason?: string
}

interface AdminSummaryQuery {
  from?: string
  to?: string
  partyId?: string
  topLimit?: string
  compareMode?: string
}

interface HostSummaryQuery {
  from?: string
  to?: string
  partyId?: string
  compareMode?: string
}

interface HostRevenueComparison {
  mode: RevenueComparisonMode
  enabled: boolean
  rangeFrom: string | null
  rangeTo: string | null
}

interface RollbackRevenueRulesBody {
  historyId?: string
  reason?: string
}

interface PaymentRow {
  id: string
  partyId: string
  userId: string
  amountKRW: number
  status: string
  method: string
  paidAt: Date | null
  refundedAt: Date | null
  createdAt: Date
}

type PaymentAdminSummaryRow = {
  amountKRW: number
  status: string
  partyId: string
  party: {
    id: string
    title: string
    hostId: string
  }
}

const DEFAULT_REVENUE_RULES: RevenueRules = {
  platformFeePercent: clampPercent(process.env.PLATFORM_FEE_PERCENT, 8),
  refundRetentionPercent: clampPercent(process.env.REFUND_RETENTION_PERCENT, 0),
  minimumHostPayoutPercent: clampPercent(process.env.MIN_HOST_PAYOUT_PERCENT, 85),
}
const DEFAULT_MONITORING_POLICY: RevenueHealthAlertThreshold = {
  ...REVENUE_MONITORING_POLICY.healthAlerts,
}
let monitoringPolicyState: RevenueHealthAlertThreshold = { ...DEFAULT_MONITORING_POLICY }
let monitoringPolicyUpdatedAt = new Date()
let monitoringPolicyUpdatedBy: string | null = null
const monitoringPolicyHistories: MonitoringPolicyChangeHistory[] = []
const REVENUE_MONITORING_POLICY_CONFIG_KEY = 'global'

let revenueRuleState: RevenueRules = { ...DEFAULT_REVENUE_RULES }
let revenueRuleUpdatedAt = new Date()
let revenueRuleUpdatedBy: string | null = null
const revenueRuleHistories: RevenueRuleChangeHistory[] = []
const REVENUE_RULE_CONFIG_KEY = 'global'

@Controller('payments')
@UseGuards(AuthGuard('jwt'))
class PaymentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('admin/summary')
  async adminSummary(
    @CurrentUser() me: JwtUserPayload,
    @Query() query: AdminSummaryQuery,
  ): Promise<AdminRevenueSummary> {
    this.assertAdmin(me)

    const rules = await this.currentRules()
    const policy = await this.currentMonitoringPolicy()
    const rangeFrom = normalizeDateBoundary(query.from, 'from')
    const rangeTo = normalizeDateBoundary(query.to, 'to', true)
    if (rangeFrom && rangeTo && rangeFrom > rangeTo) {
      throw new BadRequestException({
        code: 'invalid_date_range',
        message: 'from 날짜는 to 날짜보다 늦을 수 없어요.',
      })
    }
    const comparisonMode = normalizeCompareMode(query.compareMode)
    const [previousFrom, previousTo] = buildComparisonRangeFilter(
      comparisonMode,
      rangeFrom,
      rangeTo,
    )
    const hasPreviousPeriod = !!(previousFrom && previousTo)

    const requestedTopLimit = Number.parseInt(query.topLimit ?? '12', 10)
    const topLimit = Number.isFinite(requestedTopLimit)
      ? Math.max(1, Math.min(requestedTopLimit, 50))
      : 12

    const rows: PaymentAdminSummaryRow[] = await this.prisma.payment.findMany({
      select: {
        amountKRW: true,
        status: true,
        partyId: true,
        party: {
          select: {
            id: true,
            title: true,
            hostId: true,
          },
        },
      },
      where: {
        ...buildRangeFilter(rangeFrom, rangeTo),
        ...(query.partyId ? { partyId: query.partyId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
    const currentSummary = calculateRevenueSummary(rows, rules, topLimit)
    const previousSummary = hasPreviousPeriod
      ? await this.prisma.payment
          .findMany({
            select: {
              amountKRW: true,
              status: true,
              partyId: true,
              party: {
                select: {
                  id: true,
                  title: true,
                  hostId: true,
                },
              },
            },
            where: {
              ...buildRangeFilter(previousFrom, previousTo),
              ...(query.partyId ? { partyId: query.partyId } : {}),
            },
            orderBy: { createdAt: 'desc' },
          })
          .then((rows) => calculateRevenueSummary(rows as PaymentAdminSummaryRow[], rules, 0))
      : null

    return {
      ...currentSummary,
      rules,
      previousPeriod: previousSummary
        ? {
            grossPaidKRW: previousSummary.grossPaidKRW,
            grossRefundedKRW: previousSummary.grossRefundedKRW,
            netSalesKRW: previousSummary.netSalesKRW,
            platformFeeKRW: previousSummary.platformFeeKRW,
            refundRetentionKRW: previousSummary.refundRetentionKRW,
            hostPayoutKRW: previousSummary.hostPayoutKRW,
            platformRevenueKRW: previousSummary.platformRevenueKRW,
            totalPaidCount: previousSummary.totalPaidCount,
            totalRefundedCount: previousSummary.totalRefundedCount,
            refundRatePercent: previousSummary.refundRatePercent,
          }
        : null,
      comparison: {
        mode: comparisonMode,
        enabled: !!previousSummary,
        rangeFrom: previousFrom ? previousFrom.toISOString() : null,
        rangeTo: previousTo ? previousTo.toISOString() : null,
      },
      healthAlerts: buildRevenueHealthAlerts(currentSummary, policy),
      rangeFrom: rangeFrom ? rangeFrom.toISOString() : null,
      rangeTo: rangeTo ? rangeTo.toISOString() : null,
    }
  }

  @Get('admin/monitoring-policy')
  async getMonitoringPolicy(@CurrentUser() me: JwtUserPayload): Promise<MonitoringPolicySnapshot> {
    this.assertAdmin(me)
    return this.monitoringPolicySnapshot()
  }

  @Patch('admin/monitoring-policy')
  async updateMonitoringPolicy(
    @CurrentUser() me: JwtUserPayload,
    @Body() body: MonitoringPolicyUpdateBody,
  ): Promise<MonitoringPolicySnapshot> {
    this.assertAdmin(me)

    const hasAnyField =
      typeof body?.warningRefundRatePercent !== 'undefined' ||
      typeof body?.dangerRefundRatePercent !== 'undefined' ||
      typeof body?.topPartyConcentrationPercent !== 'undefined'

    if (!hasAnyField) {
      throw new BadRequestException({
        code: 'invalid_monitoring_policy',
        message: '변경할 임계값을 전달해 주세요.',
      })
    }

    const current = await this.currentMonitoringPolicy()
    const next = this.normalizeMonitoringPolicy(current, body)
    const changed =
      current.warningRefundRatePercent !== next.warningRefundRatePercent ||
      current.dangerRefundRatePercent !== next.dangerRefundRatePercent ||
      current.topPartyConcentrationPercent !== next.topPartyConcentrationPercent
    const reason = this.normalizeMonitoringPolicyReason(body.reason)

    if (!changed) {
      return this.monitoringPolicySnapshot()
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.monitoringPolicyConfig.upsert({
          where: { key: REVENUE_MONITORING_POLICY_CONFIG_KEY },
          create: {
            key: REVENUE_MONITORING_POLICY_CONFIG_KEY,
            warningRefundRatePercent: next.warningRefundRatePercent,
            dangerRefundRatePercent: next.dangerRefundRatePercent,
            topPartyConcentrationPercent: next.topPartyConcentrationPercent,
            updatedBy: me.sub,
          },
          update: {
            warningRefundRatePercent: next.warningRefundRatePercent,
            dangerRefundRatePercent: next.dangerRefundRatePercent,
            topPartyConcentrationPercent: next.topPartyConcentrationPercent,
            updatedBy: me.sub,
          },
        })

        await tx.monitoringPolicyHistory.create({
          data: {
            key: REVENUE_MONITORING_POLICY_CONFIG_KEY,
            fromWarningRefundRatePercent: current.warningRefundRatePercent,
            toWarningRefundRatePercent: next.warningRefundRatePercent,
            fromDangerRefundRatePercent: current.dangerRefundRatePercent,
            toDangerRefundRatePercent: next.dangerRefundRatePercent,
            fromTopPartyConcentrationPercent: current.topPartyConcentrationPercent,
            toTopPartyConcentrationPercent: next.topPartyConcentrationPercent,
            changedBy: me.sub,
            reason,
          },
        })
      })
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        monitoringPolicyState = next
        monitoringPolicyUpdatedAt = new Date()
        monitoringPolicyUpdatedBy = me.sub
        this.appendMonitoringPolicyHistory(current, next, reason)
      } else {
        throw error
      }
    }

    return this.monitoringPolicySnapshot()
  }

  @Get('admin/monitoring-policy/history')
  async getMonitoringPolicyHistory(
    @CurrentUser() me: JwtUserPayload,
    @Query('limit') limit?: string,
  ): Promise<MonitoringPolicyChangeHistory[]> {
    this.assertAdmin(me)

    const parsedLimit = Number.parseInt(limit ?? '20', 10)
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 20

    try {
      const rows = await this.prisma.monitoringPolicyHistory.findMany({
        where: { key: REVENUE_MONITORING_POLICY_CONFIG_KEY },
        orderBy: { changedAt: 'desc' },
        take: safeLimit,
      })

      return rows.map((row: MonitoringPolicyHistoryRow) => ({
        id: row.id,
        key: row.key,
        fromWarningRefundRatePercent: row.fromWarningRefundRatePercent,
        toWarningRefundRatePercent: row.toWarningRefundRatePercent,
        fromDangerRefundRatePercent: row.fromDangerRefundRatePercent,
        toDangerRefundRatePercent: row.toDangerRefundRatePercent,
        fromTopPartyConcentrationPercent: row.fromTopPartyConcentrationPercent,
        toTopPartyConcentrationPercent: row.toTopPartyConcentrationPercent,
        changedBy: row.changedBy,
        changedAt: row.changedAt.toISOString(),
        reason: row.reason,
      }))
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        return monitoringPolicyHistories
          .slice()
          .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
          .slice(0, safeLimit)
      }
      throw error
    }
  }

  @Post('admin/monitoring-policy/rollback')
  async rollbackMonitoringPolicy(
    @CurrentUser() me: JwtUserPayload,
    @Body() body: RollbackMonitoringPolicyBody,
  ): Promise<MonitoringPolicySnapshot> {
    this.assertAdmin(me)

    const rollbackReason = this.normalizeMonitoringPolicyReason(body.reason) ?? '이전 설정으로 롤백'
    const current = await this.currentMonitoringPolicy()

    let targetHistory: MonitoringPolicyHistoryRow | null = null
    let fallbackTargetHistory: MonitoringPolicyChangeHistory | null = null

    try {
      targetHistory = body.historyId
        ? await this.prisma.monitoringPolicyHistory.findUnique({
            where: { id: body.historyId },
          })
        : await this.prisma.monitoringPolicyHistory.findFirst({
            where: { key: REVENUE_MONITORING_POLICY_CONFIG_KEY },
            orderBy: { changedAt: 'desc' },
          })
    } catch (error) {
      if (!isPrismaMissingTableError(error)) {
        throw error
      }

      const sortedHistories = monitoringPolicyHistories
        .slice()
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())

      fallbackTargetHistory = body.historyId
        ? (sortedHistories.find((history) => history.id === body.historyId) ?? null)
        : (sortedHistories[0] ?? null)
    }

    const target = fallbackTargetHistory ?? targetHistory
    if (!target || target.key !== REVENUE_MONITORING_POLICY_CONFIG_KEY) {
      throw new NotFoundException({
        code: 'monitoring_policy_history_not_found',
        message: '롤백할 모니터링 정책 이력을 찾지 못했어요.',
      })
    }

    const next: RevenueHealthAlertThreshold = {
      warningRefundRatePercent: target.fromWarningRefundRatePercent,
      dangerRefundRatePercent: target.fromDangerRefundRatePercent,
      topPartyConcentrationPercent: target.fromTopPartyConcentrationPercent,
    }
    const changed =
      current.warningRefundRatePercent !== next.warningRefundRatePercent ||
      current.dangerRefundRatePercent !== next.dangerRefundRatePercent ||
      current.topPartyConcentrationPercent !== next.topPartyConcentrationPercent

    if (!changed) {
      return this.monitoringPolicySnapshot()
    }

    if (fallbackTargetHistory) {
      monitoringPolicyState = next
      monitoringPolicyUpdatedAt = new Date()
      monitoringPolicyUpdatedBy = me.sub
      this.appendMonitoringPolicyHistory(current, next, rollbackReason)
      return this.monitoringPolicySnapshot()
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.monitoringPolicyConfig.upsert({
          where: { key: REVENUE_MONITORING_POLICY_CONFIG_KEY },
          create: {
            key: REVENUE_MONITORING_POLICY_CONFIG_KEY,
            warningRefundRatePercent: next.warningRefundRatePercent,
            dangerRefundRatePercent: next.dangerRefundRatePercent,
            topPartyConcentrationPercent: next.topPartyConcentrationPercent,
            updatedBy: me.sub,
          },
          update: {
            warningRefundRatePercent: next.warningRefundRatePercent,
            dangerRefundRatePercent: next.dangerRefundRatePercent,
            topPartyConcentrationPercent: next.topPartyConcentrationPercent,
            updatedBy: me.sub,
          },
        })

        await tx.monitoringPolicyHistory.create({
          data: {
            key: REVENUE_MONITORING_POLICY_CONFIG_KEY,
            fromWarningRefundRatePercent: current.warningRefundRatePercent,
            toWarningRefundRatePercent: next.warningRefundRatePercent,
            fromDangerRefundRatePercent: current.dangerRefundRatePercent,
            toDangerRefundRatePercent: next.dangerRefundRatePercent,
            fromTopPartyConcentrationPercent: current.topPartyConcentrationPercent,
            toTopPartyConcentrationPercent: next.topPartyConcentrationPercent,
            changedBy: me.sub,
            reason: rollbackReason,
          },
        })
      })
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        monitoringPolicyState = next
        monitoringPolicyUpdatedAt = new Date()
        monitoringPolicyUpdatedBy = me.sub
        this.appendMonitoringPolicyHistory(current, next, rollbackReason)
      } else {
        throw error
      }
    }

    return this.monitoringPolicySnapshot()
  }
  @Get('admin/revenue-rules')
  async getRevenueRules(@CurrentUser() me: JwtUserPayload) {
    this.assertAdmin(me)
    return this.revenueRuleSnapshot()
  }

  @Post('admin/revenue-rules/simulate')
  async simulateRevenueRules(
    @CurrentUser() me: JwtUserPayload,
    @Body() body: RevenueRuleSimulationInput,
  ): Promise<RevenueRuleSimulationResponse> {
    this.assertAdmin(me)

    const current = await this.currentRules()
    const next = this.normalizeRevenueRules(current, {
      platformFeePercent: body.platformFeePercent,
      refundRetentionPercent: body.refundRetentionPercent,
      minimumHostPayoutPercent: body.minimumHostPayoutPercent,
    })

    const [currentHealthScore, simulatedHealthScore] = await Promise.all([
      this.buildProjectedRuleHealthScore(current, {
        from: body.from,
        to: body.to,
        partyId: body.partyId,
        topLimit: body.topLimit,
      }),
      this.buildProjectedRuleHealthScore(next, {
        from: body.from,
        to: body.to,
        partyId: body.partyId,
        topLimit: body.topLimit,
      }),
    ])

    return {
      currentRules: current,
      nextRules: next,
      currentHealthScore,
      simulatedHealthScore,
      scoreDelta: simulatedHealthScore.score - currentHealthScore.score,
    }
  }

  @Patch('admin/revenue-rules')
  async updateRevenueRules(
    @CurrentUser() me: JwtUserPayload,
    @Body() body: UpdateRevenueRulesBody,
  ) {
    this.assertAdmin(me)

    if (
      typeof body?.platformFeePercent === 'undefined' &&
      typeof body?.refundRetentionPercent === 'undefined' &&
      typeof body?.minimumHostPayoutPercent === 'undefined'
    ) {
      throw new BadRequestException({
        code: 'invalid_revenue_rules',
        message: '변경할 수수료 값을 전달해 주세요.',
      })
    }

    const current = await this.currentRules()
    const next = this.normalizeRevenueRules(current, body)
    const reason = this.normalizeReason(body.reason)
    if (
      current.platformFeePercent === next.platformFeePercent &&
      current.refundRetentionPercent === next.refundRetentionPercent &&
      current.minimumHostPayoutPercent === next.minimumHostPayoutPercent
    ) {
      return this.revenueRuleSnapshot()
    }

    const projectedHealth = await this.buildProjectedRuleHealthScore(next)
    if (projectedHealth.level === 'critical' && !reason) {
      throw new BadRequestException({
        code: 'invalid_revenue_rules_reason_required',
        message: '수익 건전성이 위험 구간입니다. 변경 사유를 반드시 입력해 주세요.',
      })
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.revenueRuleConfig.upsert({
          where: { key: REVENUE_RULE_CONFIG_KEY },
          create: {
            key: REVENUE_RULE_CONFIG_KEY,
            platformFeePercent: next.platformFeePercent,
            refundRetentionPercent: next.refundRetentionPercent,
            minimumHostPayoutPercent: next.minimumHostPayoutPercent,
            updatedBy: me.sub,
          },
          update: {
            platformFeePercent: next.platformFeePercent,
            refundRetentionPercent: next.refundRetentionPercent,
            minimumHostPayoutPercent: next.minimumHostPayoutPercent,
            updatedBy: me.sub,
          },
        })

        await tx.revenueRuleHistory.create({
          data: {
            key: REVENUE_RULE_CONFIG_KEY,
            fromPlatformFeePercent: current.platformFeePercent,
            toPlatformFeePercent: next.platformFeePercent,
            fromRefundRetentionPercent: current.refundRetentionPercent,
            toRefundRetentionPercent: next.refundRetentionPercent,
            fromMinimumHostPayoutPercent: current.minimumHostPayoutPercent,
            toMinimumHostPayoutPercent: next.minimumHostPayoutPercent,
            changedBy: me.sub,
            reason,
          },
        })
      })
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        revenueRuleState = next
        revenueRuleUpdatedAt = new Date()
        revenueRuleUpdatedBy = me.sub
        this.appendRevenueRuleHistory(current, next, reason)
        return this.revenueRuleSnapshot()
      }
      throw error
    }

    return this.revenueRuleSnapshot()
  }

  @Get('admin/revenue-rules/history')
  async getRevenueRuleHistory(
    @CurrentUser() me: JwtUserPayload,
    @Query('limit') limit?: string,
  ): Promise<RevenueRuleChangeHistory[]> {
    this.assertAdmin(me)

    const parsedLimit = Number.parseInt(limit ?? '20', 10)
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 20

    try {
      const rows = await this.prisma.revenueRuleHistory.findMany({
        where: { key: REVENUE_RULE_CONFIG_KEY },
        orderBy: { changedAt: 'desc' },
        take: safeLimit,
      })

      return rows.map((row: RevenueRuleHistoryRow) => ({
        id: row.id,
        key: row.key,
        fromPlatformFeePercent: row.fromPlatformFeePercent,
        toPlatformFeePercent: row.toPlatformFeePercent,
        fromRefundRetentionPercent: row.fromRefundRetentionPercent,
        toRefundRetentionPercent: row.toRefundRetentionPercent,
        fromMinimumHostPayoutPercent: row.fromMinimumHostPayoutPercent,
        toMinimumHostPayoutPercent: row.toMinimumHostPayoutPercent,
        changedBy: row.changedBy,
        changedAt: row.changedAt.toISOString(),
        reason: row.reason,
      }))
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        return revenueRuleHistories
          .slice()
          .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
          .slice(0, safeLimit)
      }
      throw error
    }
  }

  @Post('admin/revenue-rules/rollback')
  async rollbackRevenueRules(
    @CurrentUser() me: JwtUserPayload,
    @Body() body: RollbackRevenueRulesBody,
  ): Promise<RevenueRuleSnapshot> {
    this.assertAdmin(me)

    const current = await this.currentRules()
    const rollbackReason = this.normalizeReason(body.reason) ?? '이전 설정으로 롤백'

    let history
    let fallbackTargetHistory: RevenueRuleChangeHistory | null = null
    try {
      history = body.historyId
        ? await this.prisma.revenueRuleHistory.findUnique({
            where: { id: body.historyId },
          })
        : await this.prisma.revenueRuleHistory.findFirst({
            where: { key: REVENUE_RULE_CONFIG_KEY },
            orderBy: { changedAt: 'desc' },
          })
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        const sortedHistories = revenueRuleHistories
          .slice()
          .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
        fallbackTargetHistory = body.historyId
          ? (sortedHistories.find((item) => item.id === body.historyId) ?? null)
          : (sortedHistories[0] ?? null)
      } else {
        throw error
      }
    }

    const targetHistory = fallbackTargetHistory ?? history
    if (!targetHistory || targetHistory.key !== REVENUE_RULE_CONFIG_KEY) {
      throw new NotFoundException({
        code: 'revenue_rule_history_not_found',
        message: '롤백할 변경 이력을 찾지 못했어요.',
      })
    }

    const next: RevenueRules = {
      platformFeePercent: targetHistory.fromPlatformFeePercent,
      refundRetentionPercent: targetHistory.fromRefundRetentionPercent,
      minimumHostPayoutPercent: targetHistory.fromMinimumHostPayoutPercent,
    }

    if (
      current.platformFeePercent === next.platformFeePercent &&
      current.refundRetentionPercent === next.refundRetentionPercent &&
      current.minimumHostPayoutPercent === next.minimumHostPayoutPercent
    ) {
      return this.revenueRuleSnapshot()
    }

    if (fallbackTargetHistory) {
      revenueRuleState = next
      revenueRuleUpdatedAt = new Date()
      revenueRuleUpdatedBy = me.sub
      this.appendRevenueRuleHistory(current, next, rollbackReason)
      return this.revenueRuleSnapshot()
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.revenueRuleConfig.upsert({
          where: { key: REVENUE_RULE_CONFIG_KEY },
          create: {
            key: REVENUE_RULE_CONFIG_KEY,
            platformFeePercent: next.platformFeePercent,
            refundRetentionPercent: next.refundRetentionPercent,
            minimumHostPayoutPercent: next.minimumHostPayoutPercent,
            updatedBy: me.sub,
          },
          update: {
            platformFeePercent: next.platformFeePercent,
            refundRetentionPercent: next.refundRetentionPercent,
            minimumHostPayoutPercent: next.minimumHostPayoutPercent,
            updatedBy: me.sub,
          },
        })

        await tx.revenueRuleHistory.create({
          data: {
            key: REVENUE_RULE_CONFIG_KEY,
            fromPlatformFeePercent: current.platformFeePercent,
            toPlatformFeePercent: next.platformFeePercent,
            fromRefundRetentionPercent: current.refundRetentionPercent,
            toRefundRetentionPercent: next.refundRetentionPercent,
            fromMinimumHostPayoutPercent: current.minimumHostPayoutPercent,
            toMinimumHostPayoutPercent: next.minimumHostPayoutPercent,
            changedBy: me.sub,
            reason: rollbackReason,
          },
        })
      })
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        revenueRuleState = next
        revenueRuleUpdatedAt = new Date()
        revenueRuleUpdatedBy = me.sub
        this.appendRevenueRuleHistory(current, next, rollbackReason)
      } else {
        throw error
      }
    }

    return this.revenueRuleSnapshot()
  }

  @Post(':partyId/pay')
  async pay(
    @CurrentUser() me: JwtUserPayload,
    @Param('partyId') partyId: string,
    @Body() body: PayBody,
  ) {
    const method: PaymentMethod = ALLOWED_METHODS.includes(body?.method as PaymentMethod)
      ? (body.method as PaymentMethod)
      : 'card'

    const party = await this.prisma.party.findUnique({ where: { id: partyId } })
    if (!party) {
      throw new NotFoundException({
        code: 'party_not_found',
        message: '파티를 찾을 수 없어요',
      })
    }

    // 성별·연령별 참가비 — 결제자의 성별·나이에 맞는 규칙가를 적용(없으면 기본가)
    const payer = await this.prisma.user.findUnique({
      where: { id: me.sub },
      select: { gender: true, birthYear: true },
    })
    const rules = parseJsonArray<PricingRule>(party.pricingRulesJson)
    const age = ageFromBirthYear(payer?.birthYear ?? null, new Date().getFullYear())
    const amountKRW = resolveParticipantPrice(party.basePriceKRW, rules, {
      gender: payer?.gender ?? null,
      age,
    })

    // 중복 결제 방지 — 조회와 생성을 한 트랜잭션으로 묶어 동시 요청에도 한 건만 생성.
    const result = await this.prisma.$transaction(async (tx) => {
      const existingPaid = await tx.payment.findFirst({
        where: { partyId, userId: me.sub, status: 'paid' },
        orderBy: { createdAt: 'desc' },
      })
      if (existingPaid) return existingPaid

      return tx.payment.create({
        data: {
          partyId,
          userId: me.sub,
          amountKRW,
          status: 'paid',
          method,
          paidAt: new Date(),
        },
      })
    })
    return this.shape(result)
  }

  @Post(':id/refund')
  async refund(@CurrentUser() me: JwtUserPayload, @Param('id') id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } })
    if (!payment) {
      throw new NotFoundException({
        code: 'payment_not_found',
        message: '결제를 찾을 수 없어요',
      })
    }
    if (payment.userId !== me.sub) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: '본인의 결제만 환불할 수 있어요',
      })
    }
    if (payment.status !== 'paid') {
      throw new BadRequestException({
        code: 'not_refundable',
        message: '환불 가능한 결제가 아니에요',
      })
    }
    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: 'refunded', refundedAt: new Date() },
    })
    return this.shape(updated)
  }

  @Get('me')
  async mine(@CurrentUser() me: JwtUserPayload, @Query('partyId') partyId?: string) {
    const items = await this.prisma.payment.findMany({
      where: {
        userId: me.sub,
        ...(partyId ? { partyId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        party: {
          select: {
            id: true,
            title: true,
            category: true,
            startAt: true,
            coverImageUrl: true,
          },
        },
      },
    })
    return items.map((p) => ({
      ...this.shape(p),
      party: p.party
        ? {
            id: p.party.id,
            title: p.party.title,
            category: p.party.category,
            startAt: p.party.startAt.toISOString(),
            coverImageUrl: p.party.coverImageUrl ?? null,
          }
        : null,
    }))
  }

  @Get('host/summary')
  async hostSummary(@CurrentUser() me: JwtUserPayload, @Query() query: HostSummaryQuery) {
    const rules = await this.currentRules()
    const rangeFrom = normalizeDateBoundary(query.from, 'from')
    const rangeTo = normalizeDateBoundary(query.to, 'to', true)
    if (rangeFrom && rangeTo && rangeFrom > rangeTo) {
      throw new BadRequestException({
        code: 'invalid_date_range',
        message: 'from 날짜는 to 날짜보다 늦을 수 없어요.',
      })
    }
    const comparisonMode = normalizeCompareMode(query.compareMode)
    const [previousFrom, previousTo] = buildComparisonRangeFilter(
      comparisonMode,
      rangeFrom,
      rangeTo,
    )

    const hostedParties = await this.prisma.party.findMany({
      where: { hostId: me.sub },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    if (hostedParties.length === 0) {
      const baseComparison: HostRevenueComparison = {
        mode: comparisonMode,
        enabled: false,
        rangeFrom: previousFrom ? previousFrom.toISOString() : null,
        rangeTo: previousTo ? previousTo.toISOString() : null,
      }
      return {
        totalKRW: 0,
        paidCount: 0,
        totalPaidCount: 0,
        totalRefundedCount: 0,
        totalTickets: 0,
        avgTicketKRW: 0,
        partyCount: 0,
        refundedKRW: 0,
        platformFeePercent: rules.platformFeePercent,
        refundRetentionPercent: rules.refundRetentionPercent,
        platformFeeKRW: 0,
        refundRetentionKRW: 0,
        hostPayoutKRW: 0,
        previousPeriod: null,
        comparison: baseComparison,
        rangeFrom: rangeFrom ? rangeFrom.toISOString() : null,
        rangeTo: rangeTo ? rangeTo.toISOString() : null,
        recent: [],
      }
    }

    const partyIds = hostedParties.map((p) => p.id)
    const targetPartyId = query.partyId?.trim() ?? null
    if (targetPartyId && !partyIds.includes(targetPartyId)) {
      const baseComparison: HostRevenueComparison = {
        mode: comparisonMode,
        enabled: false,
        rangeFrom: previousFrom ? previousFrom.toISOString() : null,
        rangeTo: previousTo ? previousTo.toISOString() : null,
      }
      return {
        totalKRW: 0,
        paidCount: 0,
        totalPaidCount: 0,
        totalRefundedCount: 0,
        totalTickets: 0,
        avgTicketKRW: 0,
        partyCount: 0,
        refundedKRW: 0,
        platformFeePercent: rules.platformFeePercent,
        refundRetentionPercent: rules.refundRetentionPercent,
        platformFeeKRW: 0,
        refundRetentionKRW: 0,
        hostPayoutKRW: 0,
        previousPeriod: null,
        comparison: baseComparison,
        rangeFrom: rangeFrom ? rangeFrom.toISOString() : null,
        rangeTo: rangeTo ? rangeTo.toISOString() : null,
        recent: [],
      }
    }

    const partyFilter = targetPartyId ? { partyId: targetPartyId } : { partyId: { in: partyIds } }
    const payments = await this.prisma.payment.findMany({
      where: {
        ...buildRangeFilter(rangeFrom, rangeTo),
        ...partyFilter,
      },
      select: { partyId: true, amountKRW: true, status: true },
    })

    const currentSummary = this.summarizeHostRevenue(payments, hostedParties, rules)
    const previousSummary =
      previousFrom && previousTo
        ? await this.prisma.payment
            .findMany({
              where: {
                ...buildRangeFilter(previousFrom, previousTo),
                ...partyFilter,
              },
              select: { partyId: true, amountKRW: true, status: true },
            })
            .then((rows) => this.summarizeHostRevenue(rows, hostedParties, rules))
        : null

    return {
      ...currentSummary,
      rangeFrom: rangeFrom ? rangeFrom.toISOString() : null,
      rangeTo: rangeTo ? rangeTo.toISOString() : null,
      platformFeePercent: rules.platformFeePercent,
      refundRetentionPercent: rules.refundRetentionPercent,
      platformFeeKRW: currentSummary.platformFeeKRW,
      refundRetentionKRW: currentSummary.refundRetentionKRW,
      hostPayoutKRW: currentSummary.hostPayoutKRW,
      comparison: {
        mode: comparisonMode,
        enabled: !!previousSummary,
        rangeFrom: previousFrom ? previousFrom.toISOString() : null,
        rangeTo: previousTo ? previousTo.toISOString() : null,
      },
      previousPeriod: previousSummary
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
    }
  }

  private shape(p: PaymentRow) {
    return {
      id: p.id,
      partyId: p.partyId,
      userId: p.userId,
      amountKRW: p.amountKRW,
      status: p.status as 'pending' | 'paid' | 'refunded' | 'cancelled',
      method: p.method as PaymentMethod,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      refundedAt: p.refundedAt ? p.refundedAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    }
  }

  private summarizeHostRevenue(
    payments: Array<Pick<PaymentRow, 'partyId' | 'amountKRW' | 'status'>>,
    hostedParties: Array<{ id: string; title: string }>,
    rules: RevenueRules,
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
  } {
    let grossKRW = 0
    let paidCount = 0
    let refundedKRW = 0
    let totalPaidCount = 0
    let totalRefundedCount = 0
    const byParty = new Map<
      string,
      { totalKRW: number; paidCount: number; refundedCount: number; refundedKRW: number }
    >()

    for (const payment of payments) {
      const entry = byParty.get(payment.partyId) ?? {
        totalKRW: 0,
        paidCount: 0,
        refundedCount: 0,
        refundedKRW: 0,
      }

      if (payment.status === 'paid') {
        grossKRW += payment.amountKRW
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

    const platformFeeKRW = Math.round((grossKRW * rules.platformFeePercent) / 100)
    const refundRetentionKRW = Math.round((refundedKRW * rules.refundRetentionPercent) / 100)
    const hostPayoutKRW = grossKRW - platformFeeKRW
    const avgTicketKRW = paidCount > 0 ? Math.round(grossKRW / paidCount) : 0
    const totalTickets = totalPaidCount + totalRefundedCount
    const refundRatePercent =
      totalTickets > 0 ? Math.round((totalRefundedCount / totalTickets) * 1000) / 10 : 0
    const partyCount = byParty.size

    const recent = hostedParties.slice(0, 12).map((party) => {
      const entry = byParty.get(party.id) ?? {
        totalKRW: 0,
        paidCount: 0,
        refundedCount: 0,
        refundedKRW: 0,
      }
      const partyPlatformFeeKRW = Math.round((entry.totalKRW * rules.platformFeePercent) / 100)
      return {
        partyId: party.id,
        partyTitle: party.title,
        totalKRW: entry.totalKRW,
        paidCount: entry.paidCount,
        refundedCount: entry.refundedCount,
        refundedKRW: entry.refundedKRW,
        grossTicketCount: entry.paidCount + entry.refundedCount,
        refundRatePercent:
          entry.paidCount + entry.refundedCount > 0
            ? Math.round((entry.refundedCount / (entry.paidCount + entry.refundedCount)) * 1000) /
              10
            : 0,
        platformFeeKRW: partyPlatformFeeKRW,
        hostPayoutKRW: Math.max(entry.totalKRW - partyPlatformFeeKRW, 0),
      }
    })

    return {
      totalKRW: grossKRW,
      paidCount,
      totalPaidCount,
      totalRefundedCount,
      totalTickets,
      avgTicketKRW,
      refundRatePercent,
      partyCount,
      refundedKRW,
      platformFeeKRW,
      refundRetentionKRW,
      hostPayoutKRW,
      recent,
    }
  }

  private assertAdmin(me: JwtUserPayload) {
    if (me.role !== 'admin') {
      throw new ForbiddenException({
        code: 'admin_only',
        message: '관리자 전용 기능입니다.',
      })
    }
  }

  private async currentRules(): Promise<RevenueRules> {
    const config = await this.getRevenueRuleConfig()
    return {
      platformFeePercent: clampPercent(config.platformFeePercent),
      refundRetentionPercent: clampPercent(config.refundRetentionPercent),
      minimumHostPayoutPercent: clampPercent(config.minimumHostPayoutPercent),
    }
  }

  private async revenueRuleSnapshot(): Promise<RevenueRuleSnapshot> {
    const config = await this.getRevenueRuleConfig()
    return {
      platformFeePercent: clampPercent(config.platformFeePercent),
      refundRetentionPercent: clampPercent(config.refundRetentionPercent),
      minimumHostPayoutPercent: clampPercent(config.minimumHostPayoutPercent),
      updatedAt: config.updatedAt.toISOString(),
      updatedBy: config.updatedBy,
    }
  }

  private async getRevenueRuleConfig(): Promise<RevenueRuleRecord> {
    try {
      const existing = await this.prisma.revenueRuleConfig.findUnique({
        where: { key: REVENUE_RULE_CONFIG_KEY },
      })
      if (existing) return existing

      return this.prisma.revenueRuleConfig.create({
        data: {
          key: REVENUE_RULE_CONFIG_KEY,
          platformFeePercent: DEFAULT_REVENUE_RULES.platformFeePercent,
          refundRetentionPercent: DEFAULT_REVENUE_RULES.refundRetentionPercent,
          minimumHostPayoutPercent: DEFAULT_REVENUE_RULES.minimumHostPayoutPercent,
        },
      })
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        return {
          key: REVENUE_RULE_CONFIG_KEY,
          platformFeePercent: revenueRuleState.platformFeePercent,
          refundRetentionPercent: revenueRuleState.refundRetentionPercent,
          minimumHostPayoutPercent: revenueRuleState.minimumHostPayoutPercent,
          updatedAt: new Date(),
          updatedBy: revenueRuleUpdatedBy,
        }
      }
      throw error
    }
  }

  private async getMonitoringPolicyConfig(): Promise<MonitoringPolicyRecord> {
    try {
      const existing = await this.prisma.monitoringPolicyConfig.findUnique({
        where: { key: REVENUE_MONITORING_POLICY_CONFIG_KEY },
      })
      if (existing) {
        return existing
      }

      return this.prisma.monitoringPolicyConfig.create({
        data: {
          key: REVENUE_MONITORING_POLICY_CONFIG_KEY,
          warningRefundRatePercent: monitoringPolicyState.warningRefundRatePercent,
          dangerRefundRatePercent: monitoringPolicyState.dangerRefundRatePercent,
          topPartyConcentrationPercent: monitoringPolicyState.topPartyConcentrationPercent,
          updatedBy: monitoringPolicyUpdatedBy,
        },
      })
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        return {
          key: REVENUE_MONITORING_POLICY_CONFIG_KEY,
          warningRefundRatePercent: monitoringPolicyState.warningRefundRatePercent,
          dangerRefundRatePercent: monitoringPolicyState.dangerRefundRatePercent,
          topPartyConcentrationPercent: monitoringPolicyState.topPartyConcentrationPercent,
          updatedAt: monitoringPolicyUpdatedAt,
          updatedBy: monitoringPolicyUpdatedBy,
        }
      }
      throw error
    }
  }

  private normalizeRevenueRules(current: RevenueRules, body: UpdateRevenueRulesBody): RevenueRules {
    const next: RevenueRules = { ...current }

    if (typeof body.platformFeePercent !== 'undefined') {
      const percent = body.platformFeePercent
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new BadRequestException({
          code: 'invalid_platform_fee',
          message: '플랫폼 수수료는 0~100 사이여야 합니다.',
        })
      }
      next.platformFeePercent = clampPercent(percent)
    }

    if (typeof body.refundRetentionPercent !== 'undefined') {
      const percent = body.refundRetentionPercent
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new BadRequestException({
          code: 'invalid_refund_retention',
          message: '환불 수수료는 0~100 사이여야 합니다.',
        })
      }
      next.refundRetentionPercent = clampPercent(percent)
    }

    if (typeof body.minimumHostPayoutPercent !== 'undefined') {
      const percent = body.minimumHostPayoutPercent
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new BadRequestException({
          code: 'invalid_minimum_host_payout',
          message: '호스트 최소 정산 비율은 0~100 사이여야 합니다.',
        })
      }
      next.minimumHostPayoutPercent = clampPercent(percent)
    }

    return next
  }

  private async buildProjectedRuleHealthScore(
    nextRules: RevenueRules,
    context: { from?: string; to?: string; partyId?: string; topLimit?: number | string } = {},
  ) {
    const summaryRangeFrom = normalizeDateBoundary(context.from, 'from')
    const summaryRangeTo = normalizeDateBoundary(context.to, 'to', true)
    if (summaryRangeFrom && summaryRangeTo && summaryRangeFrom > summaryRangeTo) {
      throw new BadRequestException({
        code: 'invalid_date_range',
        message: 'from 날짜는 to 날짜보다 늦을 수 없어요.',
      })
    }
    const topLimit = clampSummaryTopLimit(context.topLimit)

    const rows = await this.prisma.payment.findMany({
      select: {
        amountKRW: true,
        status: true,
        partyId: true,
        party: {
          select: {
            id: true,
            title: true,
            hostId: true,
          },
        },
      },
      where: {
        ...buildRangeFilter(summaryRangeFrom, summaryRangeTo),
        ...(context.partyId ? { partyId: context.partyId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    const summary = calculateRevenueSummary(rows as PaymentAdminSummaryRow[], nextRules, topLimit)
    const policy = await this.currentMonitoringPolicy()
    const topPartyConcentrationPercent =
      summary.topParties.length > 0 && summary.grossPaidKRW > 0
        ? (summary.topParties[0].paidGrossKRW / summary.grossPaidKRW) * 100
        : 0

    return computeRevenueHealthScore({
      totalPaidKRW: summary.grossPaidKRW,
      totalTickets: summary.totalPaidCount + summary.totalRefundedCount,
      refundRatePercent: summary.refundRatePercent,
      platformRevenueKRW: summary.platformRevenueKRW,
      hostPayoutKRW: summary.hostPayoutKRW,
      minimumHostPayoutPercent: nextRules.minimumHostPayoutPercent,
      topPartyConcentrationPercent,
      monitoring: policy,
      netSalesChangePercent: null,
    })
  }

  private normalizeReason(reason?: string): string | null {
    const value = reason?.trim() ?? ''
    return value.length > 0 ? value : null
  }

  private async monitoringPolicySnapshot(): Promise<MonitoringPolicySnapshot> {
    const config = await this.getMonitoringPolicyConfig()
    return {
      healthAlerts: {
        warningRefundRatePercent: config.warningRefundRatePercent,
        dangerRefundRatePercent: config.dangerRefundRatePercent,
        topPartyConcentrationPercent: config.topPartyConcentrationPercent,
      },
      updatedAt: config.updatedAt.toISOString(),
      updatedBy: config.updatedBy,
    }
  }

  private async currentMonitoringPolicy(): Promise<RevenueHealthAlertThreshold> {
    const config = await this.getMonitoringPolicyConfig()
    return {
      warningRefundRatePercent: config.warningRefundRatePercent,
      dangerRefundRatePercent: config.dangerRefundRatePercent,
      topPartyConcentrationPercent: config.topPartyConcentrationPercent,
    }
  }

  private normalizeMonitoringPolicy(
    current: RevenueHealthAlertThreshold,
    body: MonitoringPolicyUpdateBody,
  ): RevenueHealthAlertThreshold {
    const next: RevenueHealthAlertThreshold = { ...current }

    if (typeof body.warningRefundRatePercent !== 'undefined') {
      const value = body.warningRefundRatePercent
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new BadRequestException({
          code: 'invalid_warning_refund_rate_threshold',
          message: '환불률 경고 임계값은 0~100 사이여야 합니다.',
        })
      }
      next.warningRefundRatePercent = clampPercent(value)
    }

    if (typeof body.dangerRefundRatePercent !== 'undefined') {
      const value = body.dangerRefundRatePercent
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new BadRequestException({
          code: 'invalid_danger_refund_rate_threshold',
          message: '환불률 위험 임계값은 0~100 사이여야 합니다.',
        })
      }
      next.dangerRefundRatePercent = clampPercent(value)
    }

    if (typeof body.topPartyConcentrationPercent !== 'undefined') {
      const value = body.topPartyConcentrationPercent
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new BadRequestException({
          code: 'invalid_top_party_concentration_threshold',
          message: '파티 집중도 임계값은 0~100 사이여야 합니다.',
        })
      }
      next.topPartyConcentrationPercent = clampPercent(value)
    }

    if (next.warningRefundRatePercent > next.dangerRefundRatePercent) {
      throw new BadRequestException({
        code: 'invalid_monitoring_policy_order',
        message: '환불률 경고 임계값은 위험 임계값보다 작거나 같아야 합니다.',
      })
    }

    return next
  }

  private normalizeMonitoringPolicyReason(reason?: string): string | null {
    const value = reason?.trim() ?? ''
    return value.length > 0 ? value : null
  }

  private appendMonitoringPolicyHistory(
    current: RevenueHealthAlertThreshold,
    next: RevenueHealthAlertThreshold,
    reason: string | null,
  ) {
    monitoringPolicyHistories.unshift({
      id: `mph_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
      key: REVENUE_MONITORING_POLICY_CONFIG_KEY,
      fromWarningRefundRatePercent: current.warningRefundRatePercent,
      toWarningRefundRatePercent: next.warningRefundRatePercent,
      fromDangerRefundRatePercent: current.dangerRefundRatePercent,
      toDangerRefundRatePercent: next.dangerRefundRatePercent,
      fromTopPartyConcentrationPercent: current.topPartyConcentrationPercent,
      toTopPartyConcentrationPercent: next.topPartyConcentrationPercent,
      changedBy: monitoringPolicyUpdatedBy,
      changedAt: monitoringPolicyUpdatedAt.toISOString(),
      reason,
    })
  }

  private appendRevenueRuleHistory(
    current: RevenueRules,
    next: RevenueRules,
    reason: string | null,
  ) {
    revenueRuleHistories.unshift({
      id: `rrh_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
      key: REVENUE_RULE_CONFIG_KEY,
      fromPlatformFeePercent: current.platformFeePercent,
      toPlatformFeePercent: next.platformFeePercent,
      fromRefundRetentionPercent: current.refundRetentionPercent,
      toRefundRetentionPercent: next.refundRetentionPercent,
      fromMinimumHostPayoutPercent: current.minimumHostPayoutPercent,
      toMinimumHostPayoutPercent: next.minimumHostPayoutPercent,
      changedBy: revenueRuleUpdatedBy,
      changedAt: revenueRuleUpdatedAt.toISOString(),
      reason,
    })
  }
}

@Module({ controllers: [PaymentsController] })
export class PaymentsModule {}

function clampPercent(value: number | string | undefined, fallback?: number): number {
  const raw = typeof value === 'string' ? Number(value) : value
  const base = Number.isFinite(raw as number) ? (raw as number) : (fallback ?? 0)
  return Math.round(Math.max(0, Math.min(100, base)) * 100) / 100
}

function clampSummaryTopLimit(topLimit?: number | string | null): number {
  const parsed = Number.parseInt(String(topLimit ?? '12'), 10)
  if (!Number.isFinite(parsed)) return 12
  return Math.max(1, Math.min(parsed, 50))
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeDateBoundary(
  value: string | undefined,
  fieldLabel: string,
  isEndOfDay = false,
): Date | null {
  if (!value) return null
  const valueText = value.trim()
  if (valueText.length === 0) return null
  const parsed = new Date(valueText)
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({
      code: 'invalid_date_format',
      message: `${fieldLabel} 날짜 형식이 유효하지 않아요.`,
    })
  }
  if (isEndOfDay) {
    parsed.setHours(23, 59, 59, 999)
  }
  return parsed
}

function buildRangeFilter(rangeFrom: Date | null, rangeTo: Date | null) {
  if (!rangeFrom && !rangeTo) return {}
  return {
    createdAt: {
      ...(rangeFrom ? { gte: rangeFrom } : {}),
      ...(rangeTo ? { lte: rangeTo } : {}),
    },
  }
}

function normalizeCompareMode(mode?: string): RevenueComparisonMode {
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

function buildComparisonRangeFilter(
  mode: RevenueComparisonMode,
  rangeFrom: Date | null,
  rangeTo: Date | null,
): [Date | null, Date | null] {
  if (mode === 'none' || !rangeFrom || !rangeTo || rangeFrom > rangeTo) {
    return [null, null]
  }

  if (mode === 'previous_period') {
    const periodMs = rangeTo.getTime() - rangeFrom.getTime()
    const previousTo = new Date(rangeFrom.getTime() - 1)
    const previousFrom = new Date(previousTo.getTime() - periodMs)
    return [previousFrom, previousTo]
  }

  if (mode === 'previous_month') {
    return [shiftDateUnit(rangeFrom, 'month', -1), shiftDateUnit(rangeTo, 'month', -1)]
  }

  return [shiftDateUnit(rangeFrom, 'year', -1), shiftDateUnit(rangeTo, 'year', -1)]
}

function shiftDateUnit(date: Date, unit: 'month' | 'year', amount: number): Date {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  const milliseconds = date.getMilliseconds()

  const target = new Date(year, month, 1, hours, minutes, seconds, milliseconds)
  if (unit === 'month') {
    target.setMonth(month + amount)
  } else {
    target.setFullYear(year + amount)
  }
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, maxDay))
  return target
}

function calculateRevenueSummary(
  rows: PaymentAdminSummaryRow[],
  rules: RevenueRules,
  topPartyLimit: number,
): RevenueSummaryComputed {
  let totalPaidCount = 0
  let totalRefundedCount = 0
  let grossPaidKRW = 0
  let grossRefundedKRW = 0

  const byParty = new Map<
    string,
    {
      partyId: string
      partyTitle: string
      hostId: string
      paidCount: number
      refundedCount: number
      paidGrossKRW: number
      refundedGrossKRW: number
    }
  >()

  for (const payment of rows) {
    const item = byParty.get(payment.partyId) ?? {
      partyId: payment.partyId,
      partyTitle: payment.party.title,
      hostId: payment.party.hostId,
      paidCount: 0,
      refundedCount: 0,
      paidGrossKRW: 0,
      refundedGrossKRW: 0,
    }

    if (payment.status === 'paid') {
      totalPaidCount += 1
      grossPaidKRW += payment.amountKRW
      item.paidCount += 1
      item.paidGrossKRW += payment.amountKRW
    } else if (payment.status === 'refunded') {
      totalRefundedCount += 1
      grossRefundedKRW += payment.amountKRW
      item.refundedCount += 1
      item.refundedGrossKRW += payment.amountKRW
    }

    byParty.set(payment.partyId, item)
  }

  const platformFeeKRW = Math.round((grossPaidKRW * rules.platformFeePercent) / 100)
  const refundRetentionKRW = Math.round((grossRefundedKRW * rules.refundRetentionPercent) / 100)
  const hostPayoutKRW = grossPaidKRW - platformFeeKRW
  const netSalesKRW = grossPaidKRW - grossRefundedKRW
  const avgTicketKRW = totalPaidCount > 0 ? Math.round(grossPaidKRW / totalPaidCount) : 0
  const netTicketCount = totalPaidCount + totalRefundedCount
  const refundRatePercent =
    netTicketCount > 0 ? roundPercent((totalRefundedCount / netTicketCount) * 100) : 0

  const safeLimit = Math.max(0, Math.min(topPartyLimit, 50))
  const topParties = Array.from(byParty.values())
    .map((entry) => {
      const partyPlatformFeeKRW = Math.round((entry.paidGrossKRW * rules.platformFeePercent) / 100)
      const grossTicketCount = entry.paidCount + entry.refundedCount
      const refundRatePercent =
        grossTicketCount > 0 ? roundPercent((entry.refundedCount / grossTicketCount) * 100) : 0
      return {
        ...entry,
        netGrossKRW: Math.max(entry.paidGrossKRW - entry.refundedGrossKRW, 0),
        refundRatePercent,
        grossTicketCount,
        platformFeeKRW: partyPlatformFeeKRW,
        hostPayoutKRW: Math.max(entry.paidGrossKRW - partyPlatformFeeKRW, 0),
      }
    })
    .sort((a, b) => b.paidGrossKRW - a.paidGrossKRW)
    .slice(0, safeLimit)

  return {
    totalPaidCount,
    totalRefundedCount,
    grossPaidKRW,
    grossRefundedKRW,
    netSalesKRW,
    platformFeeKRW,
    refundRetentionKRW,
    hostPayoutKRW,
    platformRevenueKRW: platformFeeKRW + refundRetentionKRW,
    minimumHostPayoutPercent: rules.minimumHostPayoutPercent,
    avgTicketKRW,
    topParties,
    partyCount: byParty.size,
    refundRatePercent,
  }
}

function buildRevenueHealthAlerts(
  summary: RevenueSummaryComputed,
  policy: RevenueHealthAlertThreshold,
): AdminRevenueHealthAlert[] {
  const alerts: AdminRevenueHealthAlert[] = []
  const totalTickets = summary.totalPaidCount + summary.totalRefundedCount
  const minimumHostPayoutPercent = clampPercent(summary.minimumHostPayoutPercent)
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

  if (summary.refundRatePercent >= policy.dangerRefundRatePercent) {
    alerts.push({
      code: 'high_refund_rate',
      level: 'danger',
      title: '환불률 급증',
      detail: `환불률이 ${summary.refundRatePercent.toFixed(1)}%로 임계값을 초과했습니다.`,
    })
  } else if (summary.refundRatePercent >= policy.warningRefundRatePercent) {
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
    if (concentration >= policy.topPartyConcentrationPercent) {
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

function isPrismaMissingTableError(error: unknown): boolean {
  if (
    typeof error === 'object' &&
    error !== null &&
    ((error as { code?: string }).code === 'P2021' || (error as { code?: string }).code === 'P2022')
  ) {
    return true
  }
  return false
}
