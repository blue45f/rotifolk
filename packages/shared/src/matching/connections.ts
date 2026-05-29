import type { MatchScope } from '../domain/party'
import { findMutualMatches, type RawVote } from './final-match'

export type ConnectionResult = 'mutual' | 'top-pick' | 'all'

export interface Connection {
  userAId: string
  userBId: string
  result: ConnectionResult
}

export interface ComputeConnectionsInput {
  scope: MatchScope
  /** 방향성 투표/호감 (mid·final). 같은 쌍이 여러 번 = 누적 호감. */
  votes: readonly RawVote[]
  /** all-participants 범위에서 사용할 전체 참가자 */
  allUserIds?: readonly string[]
  /** top-n 범위에서 1인당 최대 연결 수 */
  maxPerPerson?: number
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function uniqueUserIds(votes: readonly RawVote[]): string[] {
  const set = new Set<string>()
  for (const v of votes) {
    set.add(v.fromUserId)
    set.add(v.toUserId)
  }
  return [...set]
}

/**
 * 매칭 범위 정책에 따라 최종 연결을 계산.
 * - mutual-only: 서로 지목한 상호 매칭만
 * - top-n: 각자 누적 호감 상위 N명까지 연결 (상호 아니어도)
 * - all-participants: 참가자 전원을 서로 연결
 */
export function computeConnections(input: ComputeConnectionsInput): Connection[] {
  const { scope, votes } = input

  if (scope === 'mutual-only') {
    return findMutualMatches(votes).map((m) => ({ ...m, result: 'mutual' as const }))
  }

  if (scope === 'all-participants') {
    const ids = [...(input.allUserIds ?? uniqueUserIds(votes))]
    const out: Connection[] = []
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        out.push({ userAId: ids[i], userBId: ids[j], result: 'all' })
      }
    }
    return out
  }

  // top-n: 각 사용자의 호감 상위 N명
  const max = Math.max(1, input.maxPerPerson ?? 3)
  const byFrom = new Map<string, Map<string, number>>()
  for (const v of votes) {
    if (!byFrom.has(v.fromUserId)) byFrom.set(v.fromUserId, new Map())
    const m = byFrom.get(v.fromUserId)!
    m.set(v.toUserId, (m.get(v.toUserId) ?? 0) + 1)
  }
  const seen = new Set<string>()
  const out: Connection[] = []
  for (const [from, targets] of byFrom) {
    const top = [...targets.entries()].sort((a, b) => b[1] - a[1]).slice(0, max)
    for (const [to] of top) {
      const key = pairKey(from, to)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        userAId: from < to ? from : to,
        userBId: from < to ? to : from,
        result: 'top-pick',
      })
    }
  }
  return out
}
