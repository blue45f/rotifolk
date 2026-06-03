export interface RawVote {
  fromUserId: string
  toUserId: string
}

export interface MutualMatch {
  userAId: string
  userBId: string
}

/** 양쪽 모두 서로를 지목한 케이스(상호 매칭)를 추출 */
export function findMutualMatches(votes: readonly RawVote[]): MutualMatch[] {
  const set = new Set(votes.map((v) => `${v.fromUserId}->${v.toUserId}`))
  const seenPair = new Set<string>()
  const matches: MutualMatch[] = []

  for (const v of votes) {
    if (set.has(`${v.toUserId}->${v.fromUserId}`)) {
      const [a, b] =
        v.fromUserId < v.toUserId ? [v.fromUserId, v.toUserId] : [v.toUserId, v.fromUserId]
      const key = `${a}|${b}`
      if (seenPair.has(key)) continue
      seenPair.add(key)
      matches.push({ userAId: a, userBId: b })
    }
  }
  return matches
}
