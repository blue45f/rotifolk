import type { ID, Timestamps } from './common'
import type {
  Education,
  FieldVisibility,
  IncomeBand,
  MaritalStatus,
  PreProfile,
  VerifiableDetailField,
  VerificationField,
} from './profile'

export type UserRole = 'admin' | 'host' | 'participant'
export type Gender = 'male' | 'female' | 'other' | 'private'

export interface User extends Timestamps {
  id: ID
  email: string
  nickname: string
  role: UserRole
  avatarId?: ID | null
  bio?: string | null
  gender?: Gender | null
  birthYear?: number | null
  interests: string[]
  mbti?: string | null
  trustScore: number
  hostedCount: number
  joinedCount: number
  isVerified: boolean

  // 연락처 (매칭 + 상호 동의 시에만 공개)
  phone?: string | null
  shareContact: boolean

  // 사전 프로필
  profile?: PreProfile | null

  // 신상 인증 (구간/배지 중심, 원본 미보관)
  occupation?: string | null
  company?: string | null
  incomeBand?: IncomeBand | null
  maritalStatus?: MaritalStatus | null
  education?: Education | null
  verifiedFields: VerificationField[]
  visibility: Partial<Record<VerifiableDetailField, FieldVisibility>>
}

export type PublicUser = Pick<
  User,
  | 'id'
  | 'nickname'
  | 'avatarId'
  | 'bio'
  | 'mbti'
  | 'interests'
  | 'trustScore'
  | 'isVerified'
  | 'verifiedFields'
>
