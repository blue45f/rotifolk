import { describe, expect, it } from 'vitest'
import { detectRoundMilestone, ROUND_MILESTONE_MESSAGE } from './roundMilestones'

describe('detectRoundMilestone', () => {
  it('stays silent on ordinary ticks between milestones', () => {
    expect(detectRoundMilestone(300, 299, 300)).toBeNull()
    expect(detectRoundMilestone(120, 119, 300)).toBeNull()
  })

  it('ignores resets when remaining time increases (round start)', () => {
    expect(detectRoundMilestone(0, 300, 300)).toBeNull()
    expect(detectRoundMilestone(7, 300, 300)).toBeNull()
  })

  it('fires half only when the half point lands before the one-minute mark', () => {
    expect(detectRoundMilestone(151, 150, 300)).toBe('half')
    expect(detectRoundMilestone(150, 149, 300)).toBeNull()
    // 절반(45초)이 1분 경계 뒤라 1분·10초 안내와 겹치므로 생략
    expect(detectRoundMilestone(46, 45, 90)).toBeNull()
  })

  it('fires one-minute and ten-seconds boundaries exactly once', () => {
    expect(detectRoundMilestone(61, 60, 300)).toBe('one-minute')
    expect(detectRoundMilestone(60, 59, 300)).toBeNull()
    expect(detectRoundMilestone(11, 10, 300)).toBe('ten-seconds')
    expect(detectRoundMilestone(10, 9, 300)).toBeNull()
  })

  it('fires ended at zero and stays silent afterwards', () => {
    expect(detectRoundMilestone(1, 0, 300)).toBe('ended')
    expect(detectRoundMilestone(0, 0, 300)).toBeNull()
  })

  it('picks only the most urgent milestone when ticks are skipped', () => {
    expect(detectRoundMilestone(70, 8, 300)).toBe('ten-seconds')
    expect(detectRoundMilestone(70, 0, 300)).toBe('ended')
  })
})

describe('ROUND_MILESTONE_MESSAGE', () => {
  it('maps every milestone to a non-empty announcement', () => {
    const milestones = ['half', 'one-minute', 'ten-seconds', 'ended'] as const
    for (const m of milestones) {
      expect(ROUND_MILESTONE_MESSAGE[m].length).toBeGreaterThan(0)
    }
  })
})
