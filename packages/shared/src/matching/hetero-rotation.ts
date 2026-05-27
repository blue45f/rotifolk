import type { RoundPairing } from './round-robin'

export type HeteroGender = 'male' | 'female'

export interface HeteroParticipant {
  userId: string
  gender: HeteroGender
}

/**
 * 이성 페어링 전용 라운드 회전.
 *
 * 알고리즘:
 *  - 작은 쪽(women|men)을 고정, 큰 쪽을 라운드마다 한 칸씩 시계방향 회전.
 *  - 총 라운드 = 큰 그룹의 크기 (예: 5W × 6M → 6라운드, 매 라운드 5쌍).
 *  - 회전 덕에 큰 그룹 한 명은 라운드마다 한 번씩 BYE(휴식).
 *  - 큰 쪽 그룹의 BYE 사용자는 동성 휴식 그룹으로 묶어 "남자 라운지" 같은 사이드 활동 가능.
 *
 * 가정: 양쪽 모두 1명 이상. 그렇지 않으면 빈 배열 반환.
 */
export function buildHeteroRotation(
  participants: readonly HeteroParticipant[],
  maxRounds = 8,
): RoundPairing[] {
  const women = participants.filter((p) => p.gender === 'female').map((p) => p.userId)
  const men = participants.filter((p) => p.gender === 'male').map((p) => p.userId)
  if (women.length === 0 || men.length === 0) return []

  const isWomenSmaller = women.length <= men.length
  const small = isWomenSmaller ? women : men
  const big = isWomenSmaller ? men : women

  const rounds: RoundPairing[] = []
  const totalRounds = Math.min(big.length, maxRounds)

  for (let r = 0; r < totalRounds; r++) {
    const pairs: Array<[string, string]> = []
    let byeUserId: string | undefined
    for (let i = 0; i < small.length; i++) {
      const partner = big[(i + r) % big.length]
      // 작은 그룹 user를 첫 번째, 큰 그룹 user를 두 번째로 둠
      pairs.push(isWomenSmaller ? [small[i], partner] : [partner, small[i]])
    }
    // 큰 그룹 중 이번 라운드에 매칭 안 된 사람
    const assigned = new Set(pairs.map((p) => (isWomenSmaller ? p[1] : p[0])))
    const rest = big.filter((id) => !assigned.has(id))
    if (rest.length > 0) byeUserId = rest[0] // 표면상 첫 번째 BYE만 노출 (UI는 모든 잉여를 리스트로 보여줘도 됨)
    rounds.push({ roundIndex: r + 1, pairs, byeUserId })
  }
  return rounds
}

/**
 * 이성 풀에서 동성 그룹 트리오(여여여, 남남남)를 만들어 BYE/사이드 활동에 활용.
 */
export function buildSameGenderSideGroups(
  participants: readonly HeteroParticipant[],
  groupSize = 3,
): { female: string[][]; male: string[][] } {
  const group = (ids: readonly string[]) => {
    const out: string[][] = []
    for (let i = 0; i < ids.length; i += groupSize) {
      out.push(ids.slice(i, i + groupSize))
    }
    return out
  }
  return {
    female: group(participants.filter((p) => p.gender === 'female').map((p) => p.userId)),
    male: group(participants.filter((p) => p.gender === 'male').map((p) => p.userId)),
  }
}
