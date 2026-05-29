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
  seed = 1,
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
  seed = 1,
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
