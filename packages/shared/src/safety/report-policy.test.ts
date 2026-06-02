import { describe, expect, it } from 'vitest'
import {
  REPORT_AUTO_HIDE_THRESHOLD,
  REPORT_RATE_LIMIT_MAX,
  buildReportTargetKey,
  shouldAutoHideReportTarget,
} from './report-policy'

describe('report policy', () => {
  it('builds stable target keys with the most specific community target first', () => {
    expect(
      buildReportTargetKey({
        targetUserId: 'user_1',
        communityPostId: 'post_1',
        communityCommentId: 'comment_1',
      }),
    ).toBe('community-comment:comment_1')

    expect(buildReportTargetKey({ communityPostId: 'post_1' })).toBe('community-post:post_1')
    expect(buildReportTargetKey({ partyId: 'party_1' })).toBe('party:party_1')
    expect(buildReportTargetKey({ targetUserId: 'user_1' })).toBe('user:user_1')
  })

  it('does not build a key for missing targets', () => {
    expect(buildReportTargetKey({})).toBeNull()
  })

  it('auto-hides after the configured active report threshold', () => {
    expect(REPORT_RATE_LIMIT_MAX).toBeGreaterThan(0)
    expect(shouldAutoHideReportTarget(REPORT_AUTO_HIDE_THRESHOLD - 1)).toBe(false)
    expect(shouldAutoHideReportTarget(REPORT_AUTO_HIDE_THRESHOLD)).toBe(true)
  })
})
