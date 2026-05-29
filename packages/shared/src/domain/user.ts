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

  // 연결 채널 (매칭 + 상호 동의한 채널만 단계적 공개)
  phone?: string | null
  shareContact: boolean // 전화번호 공개 동의
  kakaoId?: string | null
  shareKakao: boolean
  instagram?: string | null
  shareInstagram: boolean
  avoidSameCompany?: boolean // 같은 회사 사람 자동 회피

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

  // 민감 정보 노출 설정
  showLikesReceived?: boolean // 받은 호감 수 공개
  joinPopularityRanking?: boolean // 오늘의 인기남/인기녀 선정 대상 포함
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
