// 성별·연령별 참여 비용 + 성별별 나이 제한.

import type { PricingRule } from '../domain/party'

export interface ParticipantWho {
  gender?: string | null
  age?: number | null
}

/**
 * 규칙을 순서대로 검사해 먼저 매칭되는 가격을 반환. 매칭 없으면 basePriceKRW.
 * 규칙에 gender가 있으면 같은 성별만, ageMin/ageMax가 있으면 그 범위만 매칭.
 * 나이를 모르면(age 미입력) 나이 조건이 있는 규칙은 건너뛴다.
 */
export function resolveParticipantPrice(
  basePriceKRW: number,
  rules: readonly PricingRule[],
  who: ParticipantWho,
): number {
  for (const r of rules) {
    if (r.gender && (!who.gender || who.gender !== r.gender)) continue
    if (r.ageMin != null && (who.age == null || who.age < r.ageMin)) continue
    if (r.ageMax != null && (who.age == null || who.age > r.ageMax)) continue
    return r.priceKRW
  }
  return basePriceKRW
}

export interface AgeLimitSource {
  ageMin?: number | null
  ageMax?: number | null
  maleAgeMin?: number | null
  maleAgeMax?: number | null
  femaleAgeMin?: number | null
  femaleAgeMax?: number | null
}

/** 성별에 적용되는 나이 범위 — 성별 전용값이 있으면 우선, 없으면 공통값. */
export function ageRangeForGender(
  src: AgeLimitSource,
  gender?: string | null,
): { min: number | null; max: number | null } {
  if (gender === 'male' && (src.maleAgeMin != null || src.maleAgeMax != null)) {
    return { min: src.maleAgeMin ?? null, max: src.maleAgeMax ?? null }
  }
  if (gender === 'female' && (src.femaleAgeMin != null || src.femaleAgeMax != null)) {
    return { min: src.femaleAgeMin ?? null, max: src.femaleAgeMax ?? null }
  }
  return { min: src.ageMin ?? null, max: src.ageMax ?? null }
}

/** 나이 자격 충족 여부. 나이를 모르면(age 미입력) 차단하지 않고 통과. */
export function isAgeEligible(
  src: AgeLimitSource,
  gender: string | null | undefined,
  age: number | null | undefined,
): boolean {
  const { min, max } = ageRangeForGender(src, gender)
  if (age == null) return true
  if (min != null && age < min) return false
  if (max != null && age > max) return false
  return true
}

/** 출생연도 → 만 나이 근사. currentYear는 외부에서 주입(테스트 가능·결정적). */
export function ageFromBirthYear(
  birthYear: number | null | undefined,
  currentYear: number,
): number | null {
  if (!birthYear || birthYear < 1900) return null
  return Math.max(0, currentYear - birthYear)
}
