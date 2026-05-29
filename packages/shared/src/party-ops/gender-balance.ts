export type GenderKey = 'male' | 'female'

export interface GenderCounts {
  male: number
  female: number
}

/** "5:3" → {a:5,b:3}, "any"/빈값 → null */
export function parseGenderRatio(target: string): { a: number; b: number } | null {
  if (!target || target === 'any') return null
  const m = target.match(/^(\d+)\s*:\s*(\d+)$/)
  if (!m) return null
  const a = Number(m[1])
  const b = Number(m[2])
  if (a <= 0 || b <= 0) return null
  return { a, b }
}

/**
 * 소수 성별의 비례 하한 = min/max.
 * "5:3" → 0.6 → 다수 5명당 소수 최소 3명. 다수 10명이면 소수 최소 6명.
 */
export function minorityFloor(target: string): number {
  const r = parseGenderRatio(target)
  if (!r) return 0
  return Math.min(r.a, r.b) / Math.max(r.a, r.b)
}

export interface GenderBalanceResult {
  balanced: boolean
  floor: number
  /** 현재 성비 (소수/다수, 1이면 완벽) */
  ratioActual: number
  /** 균형을 맞추려면 추가로 필요한 인원 */
  neededMale: number
  neededFemale: number
}

/** 현재 성비가 목표(비례 하한)를 만족하는지 평가. */
export function evaluateGenderBalance(counts: GenderCounts, target: string): GenderBalanceResult {
  const floor = minorityFloor(target)
  const { male, female } = counts
  if (floor === 0) {
    return { balanced: true, floor: 0, ratioActual: 1, neededMale: 0, neededFemale: 0 }
  }
  const max = Math.max(male, female)
  const min = Math.min(male, female)
  const ratioActual = max === 0 ? 1 : min / max
  const reqFemaleForMales = Math.ceil(male * floor)
  const reqMaleForFemales = Math.ceil(female * floor)
  const neededFemale = Math.max(0, reqFemaleForMales - female)
  const neededMale = Math.max(0, reqMaleForFemales - male)
  const balanced = male > 0 && female > 0 && neededMale === 0 && neededFemale === 0
  return { balanced, floor, ratioActual, neededMale, neededFemale }
}

export interface AcceptGenderOptions {
  caps?: { male?: number | null; female?: number | null }
  /** 초기 충원 단계의 허용 편차 */
  tolerance?: number
}

/**
 * 새 참가자(gender)를 받아도 목표 성비가 깨지지 않는지.
 * 깨지면 false → 호출부에서 대기열(waitlist)로 보낸다.
 */
export function canAcceptGender(
  gender: GenderKey,
  counts: GenderCounts,
  target: string,
  opts: AcceptGenderOptions = {},
): boolean {
  const cap = gender === 'male' ? opts.caps?.male : opts.caps?.female
  if (cap != null && counts[gender] >= cap) return false

  const floor = minorityFloor(target)
  if (floor === 0) return true

  const tol = opts.tolerance ?? 0
  const other = gender === 'male' ? counts.female : counts.male
  const mine = counts[gender]
  const maxAllowed = other === 0 ? 1 + tol : Math.floor(other / floor) + tol
  return mine + 1 <= maxAllowed
}
