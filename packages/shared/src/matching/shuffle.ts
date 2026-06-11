/** Fisher–Yates with optional seed */
export function shuffle<T>(arr: readonly T[], seed?: number): T[] {
  const out = [...arr]
  const rng = seed != null ? mulberry32(seed) : Math.random
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 랜덤 셔플 후 N명씩 그룹화 */
export function groupByN<T>(arr: readonly T[], groupSize: number, seed?: number): T[][] {
  const shuffled = shuffle(arr, seed)
  const groups: T[][] = []
  for (let i = 0; i < shuffled.length; i += groupSize) {
    groups.push(shuffled.slice(i, i + groupSize))
  }
  if (groups.length > 1 && groups[groups.length - 1].length < groupSize) {
    const tail = groups.pop() as T[]
    groups[groups.length - 1].push(...tail)
  }
  return groups
}
