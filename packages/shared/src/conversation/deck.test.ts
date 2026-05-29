import { describe, expect, it } from 'vitest'
import { buildConversationCard, drawFortune, FORTUNES, todaysFortune } from './deck'

describe('conversation deck', () => {
  it('운세는 시드에 대해 결정적', () => {
    expect(FORTUNES.length).toBeGreaterThan(0)
    expect(drawFortune(3)).toEqual(drawFortune(3))
    expect(todaysFortune('u1', '2026-05-29T10:00:00Z')).toEqual(
      todaysFortune('u1', '2026-05-29T23:00:00Z'),
    )
  })

  it('밸런스 카드는 vs 형식', () => {
    expect(buildConversationCard('balance', 0).text).toContain(' vs ')
    expect(buildConversationCard('game', 1).hint).toBeTruthy()
  })
})
