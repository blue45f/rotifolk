import type { ID } from './common'

// ──────────────────────────────────────────────
// 사전 프로필 (아이스브레이커 · 매칭 활용)
// ──────────────────────────────────────────────
export interface ProfilePrompt {
  q: string
  a: string
}

export interface PreProfile {
  /** 한 줄 소개 */
  oneLiner?: string
  /** 이상형 키워드 */
  idealType?: string[]
  /** 어떤 관계를 찾는지 */
  lookingFor?: string
  /** 자유 Q&A 프롬프트 */
  prompts?: ProfilePrompt[]
  /** 재미있는 사실 */
  funFacts?: string[]
  /** 좋아하는 것 (대화 소재) */
  favorites?: string[]
}

// ──────────────────────────────────────────────
// 신상 인증 (프라이버시 보존 — 원본 미보관, 배지 + 구간만)
// ──────────────────────────────────────────────
export type VerificationField =
  | 'identity' // 본인(성인) 인증
  | 'job' // 직업 인증
  | 'company' // 재직 인증
  | 'income' // 소득 구간 인증
  | 'marital' // 미혼 인증
  | 'education' // 학력 인증

export const VERIFICATION_FIELD_LABEL: Record<VerificationField, string> = {
  identity: '본인 인증',
  job: '직업 인증',
  company: '재직 인증',
  income: '소득 인증',
  marital: '미혼 인증',
  education: '학력 인증',
}

export type VerificationMethod =
  | 'mobile-id' // 휴대폰 본인인증
  | 'company-email' // 회사 이메일 도메인
  | 'document' // 서류 제출(원본 미보관, 검증 후 폐기)
  | 'social' // 소셜/링크드인 연결

export const VERIFICATION_METHOD_LABEL: Record<VerificationMethod, string> = {
  'mobile-id': '휴대폰 본인인증',
  'company-email': '회사 이메일',
  document: '서류 인증',
  social: '소셜 연결',
}

export interface VerificationRecord {
  field: VerificationField
  method: VerificationMethod
  verifiedAt: string
}

/** 소득은 정확액이 아니라 구간만 저장/노출. */
export type IncomeBand = 'u3000' | 'b3000_5000' | 'b5000_7000' | 'b7000_10000' | 'o10000'

export const INCOME_BAND_LABEL: Record<IncomeBand, string> = {
  u3000: '3천만원 미만',
  b3000_5000: '3~5천만원',
  b5000_7000: '5~7천만원',
  b7000_10000: '7천만~1억',
  o10000: '1억 이상',
}

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'private'

export const MARITAL_STATUS_LABEL: Record<MaritalStatus, string> = {
  single: '미혼',
  married: '기혼',
  divorced: '돌싱',
  widowed: '사별',
  private: '비공개',
}

export type Education = 'highschool' | 'college' | 'bachelor' | 'master' | 'doctorate' | 'private'

export const EDUCATION_LABEL: Record<Education, string> = {
  highschool: '고졸',
  college: '전문대',
  bachelor: '학사',
  master: '석사',
  doctorate: '박사',
  private: '비공개',
}

/** 필드별 공개 범위 — 개인정보 최소화 원칙. */
export type FieldVisibility = 'public' | 'matched' | 'hidden'

export const VERIFIABLE_DETAIL_FIELDS = [
  'occupation',
  'company',
  'income',
  'marital',
  'education',
] as const
export type VerifiableDetailField = (typeof VERIFIABLE_DETAIL_FIELDS)[number]

/** 공개적으로 노출 가능한 신뢰 프로필 (뷰어 권한에 따라 서버가 마스킹). */
export interface TrustProfile {
  userId: ID
  verifiedFields: VerificationField[]
  occupation?: string | null
  company?: string | null
  incomeBand?: IncomeBand | null
  maritalStatus?: MaritalStatus | null
  education?: Education | null
  visibility: Partial<Record<VerifiableDetailField, FieldVisibility>>
}
