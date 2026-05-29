// 모임 참가 자격 — 나이(성별별) · 혼인상태(돌싱 등) · 아이 유무 · 필수 인증.

import type { ChildrenPolicy } from '../domain/party'
import type { MaritalStatus, VerificationField } from '../domain/profile'
import { isAgeEligible, type AgeLimitSource } from '../pricing/participant-pricing'

export type EligibilityReason = 'age' | 'marital' | 'children' | 'verification'

export const ELIGIBILITY_REASON_LABEL: Record<EligibilityReason, string> = {
  age: '나이 조건',
  marital: '혼인 상태 조건',
  children: '아이 유무 조건',
  verification: '필수 인증',
}

export interface EligibilityPolicy extends AgeLimitSource {
  requiredVerifications?: readonly VerificationField[]
  maritalRequirement?: readonly MaritalStatus[]
  childrenPolicy?: ChildrenPolicy
}

export interface Applicant {
  gender?: string | null
  age?: number | null
  maritalStatus?: MaritalStatus | null
  hasChildren?: boolean | null
  verifiedFields?: readonly VerificationField[]
}

export interface EligibilityResult {
  ok: boolean
  reasons: EligibilityReason[]
  missingVerifications: VerificationField[]
}

/** 참가 자격을 종합 판정. 모든 조건을 통과해야 ok=true. */
export function checkEligibility(
  policy: EligibilityPolicy,
  applicant: Applicant,
): EligibilityResult {
  const reasons: EligibilityReason[] = []

  if (!isAgeEligible(policy, applicant.gender, applicant.age)) reasons.push('age')

  const marital = policy.maritalRequirement ?? []
  if (marital.length > 0) {
    if (!applicant.maritalStatus || !marital.includes(applicant.maritalStatus)) {
      reasons.push('marital')
    }
  }

  const childrenPolicy = policy.childrenPolicy ?? 'any'
  if (childrenPolicy !== 'any') {
    // 아이 유무 미입력이면 조건이 있는 모임엔 통과시키지 않음
    if (applicant.hasChildren == null) reasons.push('children')
    else if (childrenPolicy === 'has' && !applicant.hasChildren) reasons.push('children')
    else if (childrenPolicy === 'none' && applicant.hasChildren) reasons.push('children')
  }

  const required = policy.requiredVerifications ?? []
  const have = new Set(applicant.verifiedFields ?? [])
  const missingVerifications = required.filter((v) => !have.has(v))
  if (missingVerifications.length > 0) reasons.push('verification')

  return { ok: reasons.length === 0, reasons, missingVerifications }
}
