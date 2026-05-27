import type { ID, Timestamps } from './common'

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
}

export type PublicUser = Pick<
  User,
  'id' | 'nickname' | 'avatarId' | 'bio' | 'mbti' | 'interests' | 'trustScore' | 'isVerified'
>
