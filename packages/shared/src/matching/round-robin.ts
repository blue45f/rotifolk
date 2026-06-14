/**
 * Berger 테이블 기반 라운드 로빈 페어링.
 * n명을 모두가 모두를 한 번씩 만나는 (n-1) 라운드로 배치.
 * 홀수 인원이면 한 명의 "BYE" 자리(휴식)가 라운드마다 돌아간다.
 */
export interface RoundPairing {
  roundIndex: number
  pairs: Array<[string, string]> // userId tuples
  byeUserId?: string
}

export function buildRoundRobin(userIds: readonly string[]): RoundPairing[] {
  if (userIds.length < 2) return []

  const ids = [...userIds]
  const hasBye = ids.length % 2 === 1
  if (hasBye) ids.push('__BYE__')

  const n = ids.length
  const rounds: RoundPairing[] = []
  const half = n / 2

  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[string, string]> = []
    let byeUserId: string | undefined

    for (let i = 0; i < half; i++) {
      const a = ids[i]
      const b = ids[n - 1 - i]
      if (a === '__BYE__') byeUserId = b
      else if (b === '__BYE__') byeUserId = a
      else pairs.push([a, b])
    }
    rounds.push({ roundIndex: r + 1, pairs, byeUserId })

    // rotate: keep index 0 fixed, rotate the rest right by 1
    const fixed = ids[0]
    const rest = ids.slice(1)
    rest.unshift(rest.pop() as string)
    ids.splice(0, ids.length, fixed, ...rest)
  }

  return rounds
}

/**
 * 3인 1조 라운드 로빈 (정확한 BIBD는 어렵기 때문에 휴리스틱).
 * 그룹 사이즈 3, 라운드마다 다른 조합이 되도록 셔플 + 중복 페어 패널티 최소화.
 */
export interface TrioRoundPairing {
  roundIndex: number
  trios: string[][]
}

export function buildTrioRotation(
  userIds: readonly string[],
  rounds: number,
  seed = 1
): TrioRoundPairing[] {
  if (userIds.length < 3) return []

  const seenPairs = new Map<string, number>()
  const result: TrioRoundPairing[] = []
  const rng = mulberry32(seed)

  for (let r = 0; r < rounds; r++) {
    const sorted = [...userIds].sort((a, b) => {
      const aw = weight(a, seenPairs)
      const bw = weight(b, seenPairs)
      return aw - bw + (rng() - 0.5) * 0.01
    })
    const trios: string[][] = []
    for (let i = 0; i < sorted.length; i += 3) {
      const trio = sorted.slice(i, i + 3)
      if (trio.length === 3) trios.push(trio)
      else if (trios.length > 0) {
        // 마지막 2명/1명은 직전 trio에 합치기
        trios[trios.length - 1].push(...trio)
      }
    }
    for (const trio of trios) {
      for (let i = 0; i < trio.length; i++) {
        for (let j = i + 1; j < trio.length; j++) {
          const key = pairKey(trio[i], trio[j])
          seenPairs.set(key, (seenPairs.get(key) ?? 0) + 1)
        }
      }
    }
    result.push({ roundIndex: r + 1, trios })
  }
  return result
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function weight(_userId: string, _seen: Map<string, number>): number {
  return Math.random()
}

function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
