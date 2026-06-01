import type { RevenueHealthAlertThreshold } from './revenue-monitoring-policy'

export type RevenueHealthLevel = 'good' | 'warning' | 'critical'

export interface RevenueHealthScore {
  score: number
  level: RevenueHealthLevel
  levelLabel: string
  topPartyConcentrationPercent: number
  reasons: string[]
  summary: string
}

interface RevenueHealthScoreArgs {
  totalPaidKRW: number
  totalTickets: number
  refundRatePercent: number
  platformRevenueKRW: number
  topPartyConcentrationPercent: number
  monitoring: RevenueHealthAlertThreshold
  netSalesChangePercent: number | null
}

export function computeRevenueHealthScore(args: RevenueHealthScoreArgs): RevenueHealthScore {
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

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}
