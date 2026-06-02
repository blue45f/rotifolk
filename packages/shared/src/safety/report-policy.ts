export const REPORT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
export const REPORT_RATE_LIMIT_MAX = 5
export const REPORT_AUTO_HIDE_THRESHOLD = 3

export interface ReportTargetInput {
  targetUserId?: string | null
  partyId?: string | null
  communityPostId?: string | null
  communityCommentId?: string | null
}

export function buildReportTargetKey(input: ReportTargetInput): string | null {
  if (input.communityCommentId) return `community-comment:${input.communityCommentId}`
  if (input.communityPostId) return `community-post:${input.communityPostId}`
  if (input.partyId) return `party:${input.partyId}`
  if (input.targetUserId) return `user:${input.targetUserId}`
  return null
}

export function shouldAutoHideReportTarget(activeReportCount: number): boolean {
  return activeReportCount >= REPORT_AUTO_HIDE_THRESHOLD
}
