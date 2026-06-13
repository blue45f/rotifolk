import { groupByN, shuffle } from './shuffle'

/** N:N 그룹 테이블 회전 — 라운드마다 새 그룹 구성. */
export interface GroupRound {
  roundIndex: number
  groups: string[][]
}

export function buildGroupRotation(
  userIds: readonly string[],
  groupSize: number,
  rounds: number,
  seed = 1
): GroupRound[] {
  const size = Math.max(2, Math.floor(groupSize))
  if (userIds.length < size) return []
  const out: GroupRound[] = []
  for (let r = 0; r < rounds; r++) {
    out.push({ roundIndex: r + 1, groups: groupByN(userIds, size, seed + r * 131) })
  }
  return out
}

/** N:1 핫시트 — 매 라운드 한 명(hub)을 그룹이 둘러싼다. hub는 라운드마다 교체. */
export interface HubRound {
  roundIndex: number
  hubId: string
  groupIds: string[]
}

export function buildHubRotation(
  userIds: readonly string[],
  groupSize: number,
  rounds: number,
  seed = 1
): HubRound[] {
  const n = userIds.length
  if (n < 2) return []
  const spokes = Math.max(1, Math.floor(groupSize) - 1)
  const out: HubRound[] = []
  for (let r = 0; r < rounds; r++) {
    const hubId = userIds[r % n]
    const others = userIds.filter((u) => u !== hubId)
    const groupIds = shuffle(others, seed + r * 131).slice(0, spokes)
    out.push({ roundIndex: r + 1, hubId, groupIds })
  }
  return out
}

// ──────────────────────── 회피 제약 (best-effort) ────────────────────────

const pkey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/**
 * 같은 그룹/짝에 금지쌍이 함께 들어갔으면, 같은 라운드 내 다른 그룹 멤버와 교환해
 * 회피(best-effort). 인원 구성상 불가피하면 그대로 둔다(최종 매칭은 별도로 제외됨).
 */
export function repairForbiddenPairs(
  rounds: readonly { index: number; pairs: string[][] }[],
  forbidden: readonly (readonly [string, string])[]
): { index: number; pairs: string[][] }[] {
  if (forbidden.length === 0) return rounds.map((r) => ({ index: r.index, pairs: r.pairs }))
  const fset = new Set(forbidden.map(([a, b]) => pkey(a, b)))
  const conflicts = (group: readonly string[]): boolean => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (fset.has(pkey(group[i], group[j]))) return true
      }
    }
    return false
  }

  return rounds.map((round) => {
    const groups = round.pairs.map((g) => [...g])
    for (let gi = 0; gi < groups.length; gi++) {
      let guard = 0
      while (conflicts(groups[gi]) && guard++ < 50) {
        let swapped = false
        for (let mi = 0; mi < groups[gi].length && !swapped; mi++) {
          const member = groups[gi][mi]
          for (let gj = 0; gj < groups.length && !swapped; gj++) {
            if (gj === gi) continue
            for (let mj = 0; mj < groups[gj].length; mj++) {
              const giAfter = groups[gi].slice()
              const gjAfter = groups[gj].slice()
              giAfter[mi] = groups[gj][mj]
              gjAfter[mj] = member
              if (!conflicts(giAfter) && !conflicts(gjAfter)) {
                groups[gi] = giAfter
                groups[gj] = gjAfter
                swapped = true
                break
              }
            }
          }
        }
        if (!swapped) break
      }
    }
    return { index: round.index, pairs: groups }
  })
}
