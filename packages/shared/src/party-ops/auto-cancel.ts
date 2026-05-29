import type { PartyRecruitment } from '../domain/party'
import { evaluateGenderBalance, type GenderCounts } from './gender-balance'

export type RecruitmentHealth = 'on-track' | 'at-risk' | 'failing'

export interface RecruitmentAssessment {
  health: RecruitmentHealth
  meetsHeadcount: boolean
  meetsRatio: boolean
  shouldAutoCancel: boolean
  reasons: string[]
  /** 자동취소 마감까지 남은 ms (마감 설정 시) */
  countdownMs?: number | null
}

export interface AssessRecruitmentInput {
  minParticipants: number
  counts: GenderCounts
  recruitment: PartyRecruitment
  now?: Date | string
}

/**
 * 모집 현황 평가 — 마감 시각까지 인원/성비 미달이면 자동 취소 대상.
 * 성비는 절대 최소가 아니라 비례 성비(genderRatioTarget)로 판정.
 */
export function assessRecruitment(input: AssessRecruitmentInput): RecruitmentAssessment {
  const { minParticipants, counts, recruitment } = input
  const now = input.now ? new Date(input.now) : new Date()
  const total = counts.male + counts.female
  const reasons: string[] = []

  let meetsHeadcount = total >= minParticipants
  if (!meetsHeadcount) reasons.push(`최소 인원 부족 (${total}/${minParticipants})`)
  if (recruitment.minMale != null && counts.male < recruitment.minMale) {
    meetsHeadcount = false
    reasons.push(`남성 ${counts.male}/${recruitment.minMale}`)
  }
  if (recruitment.minFemale != null && counts.female < recruitment.minFemale) {
    meetsHeadcount = false
    reasons.push(`여성 ${counts.female}/${recruitment.minFemale}`)
  }

  const bal = evaluateGenderBalance(counts, recruitment.genderRatioTarget)
  const meetsRatio = recruitment.genderRatioTarget === 'any' || bal.balanced
  if (!meetsRatio) {
    if (bal.neededFemale > 0) reasons.push(`여성 ${bal.neededFemale}명 더 필요`)
    if (bal.neededMale > 0) reasons.push(`남성 ${bal.neededMale}명 더 필요`)
  }

  const deadline = recruitment.autoCancelAt ? new Date(recruitment.autoCancelAt) : null
  const pastDeadline = deadline != null && now.getTime() >= deadline.getTime()
  const ok = meetsHeadcount && meetsRatio
  const shouldAutoCancel = pastDeadline && !ok

  const health: RecruitmentHealth = ok ? 'on-track' : pastDeadline ? 'failing' : 'at-risk'

  return {
    health,
    meetsHeadcount,
    meetsRatio,
    shouldAutoCancel,
    reasons,
    countdownMs: deadline ? deadline.getTime() - now.getTime() : null,
  }
}
