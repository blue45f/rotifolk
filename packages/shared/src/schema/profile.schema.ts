import { z } from 'zod'

export const PreProfileSchema = z.object({
  oneLiner: z.string().max(120).optional(),
  idealType: z.array(z.string().max(20)).max(8).optional(),
  lookingFor: z.string().max(200).optional(),
  prompts: z
    .array(z.object({ q: z.string().max(60), a: z.string().max(300) }))
    .max(6)
    .optional(),
  funFacts: z.array(z.string().max(80)).max(6).optional(),
  favorites: z.array(z.string().max(40)).max(10).optional(),
})
export type PreProfileDto = z.infer<typeof PreProfileSchema>

export const IncomeBandEnum = z.enum(['u3000', 'b3000_5000', 'b5000_7000', 'b7000_10000', 'o10000'])
export const MaritalStatusEnum = z.enum(['single', 'married', 'divorced', 'widowed', 'private'])
export const EducationEnum = z.enum([
  'highschool',
  'college',
  'bachelor',
  'master',
  'doctorate',
  'private',
])
export const FieldVisibilityEnum = z.enum(['public', 'matched', 'hidden'])
export const VerificationFieldEnum = z.enum([
  'identity',
  'job',
  'company',
  'income',
  'marital',
  'education',
])
export const VerificationMethodEnum = z.enum(['mobile-id', 'company-email', 'document', 'social'])

export const UpdateTrustProfileSchema = z.object({
  occupation: z.string().max(40).optional().nullable(),
  company: z.string().max(60).optional().nullable(),
  incomeBand: IncomeBandEnum.optional().nullable(),
  maritalStatus: MaritalStatusEnum.optional().nullable(),
  education: EducationEnum.optional().nullable(),
  visibility: z.record(z.string(), FieldVisibilityEnum).optional(),
})
export type UpdateTrustProfileDto = z.infer<typeof UpdateTrustProfileSchema>

/** 인증 요청 — 증빙은 검증 후 폐기, 결과(배지)만 저장 (개인정보 최소화). */
export const VerifyFieldSchema = z.object({
  field: VerificationFieldEnum,
  method: VerificationMethodEnum,
  evidence: z.string().max(200).optional(),
  incomeBand: IncomeBandEnum.optional(),
})
export type VerifyFieldDto = z.infer<typeof VerifyFieldSchema>

/** 연결 채널 — 채널별 핸들 + 공개 동의. 매칭 후 상호 동의한 채널만 노출. */
export const UpdateContactSchema = z.object({
  phone: z.string().min(9).max(20).optional().nullable(),
  shareContact: z.boolean().optional(),
  kakaoId: z.string().max(40).optional().nullable(),
  shareKakao: z.boolean().optional(),
  instagram: z.string().max(40).optional().nullable(),
  shareInstagram: z.boolean().optional(),
})
export type UpdateContactDto = z.infer<typeof UpdateContactSchema>

/** 회피 연락처 추가 — 번호는 서버에서 해시 후 저장(원본 미보관). */
export const AddAvoidContactsSchema = z.object({
  phones: z.array(z.string().min(9).max(20)).min(1).max(2000),
  label: z.string().max(40).optional(),
})
export type AddAvoidContactsDto = z.infer<typeof AddAvoidContactsSchema>

/** 마주치기 싫은 사람 1명 추가 — 이름/메모 + 번호(해시 저장). */
export const AddAvoidPersonSchema = z.object({
  phone: z.string().min(9).max(20),
  label: z.string().max(40).optional(),
})
export type AddAvoidPersonDto = z.infer<typeof AddAvoidPersonSchema>

export const AvoidPrefsSchema = z.object({
  avoidSameCompany: z.boolean().optional(),
})
export type AvoidPrefsDto = z.infer<typeof AvoidPrefsSchema>
