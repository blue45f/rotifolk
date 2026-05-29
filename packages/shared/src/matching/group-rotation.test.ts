import { describe, expect, it } from 'vitest'
import { buildGroupRotation, buildHubRotation } from './group-rotation'

const ids = ['a', 'b', 'c', 'd', 'e', 'f']

describe('buildGroupRotation (N:N)', () => {
  it('각 라운드가 전원을 그룹으로 나눈다', () => {
    const rounds = buildGroupRotation(ids, 3, 4)
    expect(rounds).toHaveLength(4)
    for (const r of rounds) {
      const flat = r.groups.flat()
      expect(new Set(flat).size).toBe(ids.length)
    }
  })
})

describe('buildHubRotation (N:1 핫시트)', () => {
  it('hub가 라운드마다 돌아가고 자기 자신은 그룹에 없다', () => {
    const rounds = buildHubRotation(ids, 3, ids.length)
    const hubs = rounds.map((r) => r.hubId)
    expect(new Set(hubs).size).toBe(ids.length)
    for (const r of rounds) {
      expect(r.groupIds).not.toContain(r.hubId)
      expect(r.groupIds.length).toBeLessThanOrEqual(2)
    }
  })
})
