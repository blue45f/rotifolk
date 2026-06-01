export interface RevenueHealthAlertThreshold {
  warningRefundRatePercent: number
  dangerRefundRatePercent: number
  topPartyConcentrationPercent: number
}

export interface RevenueMonitoringPolicy {
  healthAlerts: RevenueHealthAlertThreshold
}

export const REVENUE_MONITORING_POLICY: RevenueMonitoringPolicy = {
  healthAlerts: {
    warningRefundRatePercent: 12,
    dangerRefundRatePercent: 25,
    topPartyConcentrationPercent: 70,
  },
}
