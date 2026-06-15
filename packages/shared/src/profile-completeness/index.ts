import type { User } from '../domain/user'

/** 프로필 완성도 항목 — 하나씩 채울 때마다 매칭 품질·신뢰도가 올라간다. */
export interface ProfileCompletenessItem {
  /** 안정적인 식별자 (UI key·딥링크용). */
  key: string
  /** 사용자에게 보여줄 짧은 라벨. */
  label: string
  /** 이 항목을 채웠는지 여부. */
  done: boolean
  /** 가중치 — 매칭에 더 중요한 항목일수록 높다. */
  weight: number
}

export interface ProfileCompleteness {
  /** 0~100 정수 백분율 (가중 평균). */
  percent: number
  /** 채운 항목 수. */
  doneCount: number
  /** 전체 항목 수. */
  totalCount: number
  /** 항목별 상세 (체크리스트 렌더링용, 입력 순서 유지). */
  items: ProfileCompletenessItem[]
  /** 아직 안 채운 항목 중 가중치가 가장 높은 다음 액션 (없으면 null). */
  nextItem: ProfileCompletenessItem | null
}

/** 프로필 완성도 입력 — User에서 필요한 필드만 추린 부분집합. */
export type ProfileCompletenessInput = Pick<
  User,
  | 'bio'
  | 'mbti'
  | 'interests'
  | 'avatarImage'
  | 'gender'
  | 'birthYear'
  | 'isVerified'
  | 'verifiedFields'
  | 'instagram'
  | 'kakaoId'
  | 'profile'
>

function hasText(v: string | null | undefined): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

/**
 * 프로필 완성도를 가중 평균으로 계산한다.
 *
 * - 항목별 가중치를 두어 매칭에 중요한 정보(소개·관심사·사진·본인인증)를 더 크게 반영한다.
 * - percent는 0~100 정수로 반올림한다.
 * - nextItem은 미완 항목 중 가중치가 가장 높은 한 가지(동률이면 먼저 정의된 항목)를 가리킨다.
 *
 * 순수 함수 — 동일 입력에 항상 동일 결과(테스트·SSR 안전).
 */
export function computeProfileCompleteness(user: ProfileCompletenessInput): ProfileCompleteness {
  const interests = user.interests ?? []
  const verified = user.verifiedFields ?? []
  const profile = user.profile ?? null
  // 사전 프로필에 의미 있는 한 줄/이상형/프롬프트가 하나라도 있으면 채운 것으로 본다.
  const hasPreProfile =
    !!profile &&
    (hasText(profile.oneLiner) ||
      hasText(profile.lookingFor) ||
      (Array.isArray(profile.idealType) && profile.idealType.some(hasText)) ||
      (Array.isArray(profile.prompts) && profile.prompts.some((p) => hasText(p.a))))

  const items: ProfileCompletenessItem[] = [
    { key: 'bio', label: '한 줄 소개', done: hasText(user.bio), weight: 3 },
    { key: 'avatar', label: '프로필 사진', done: hasText(user.avatarImage), weight: 3 },
    {
      key: 'interests',
      label: '관심사 (2개 이상)',
      done: interests.length >= 2,
      weight: 3,
    },
    { key: 'mbti', label: 'MBTI', done: hasText(user.mbti), weight: 1 },
    {
      key: 'basics',
      label: '성별·출생연도',
      done: hasText(user.gender) && typeof user.birthYear === 'number' && user.birthYear > 0,
      weight: 2,
    },
    {
      key: 'preProfile',
      label: '사전 프로필 (이상형·대화 프롬프트)',
      done: hasPreProfile,
      weight: 2,
    },
    {
      key: 'channel',
      label: '연결 채널 (인스타·카톡)',
      done: hasText(user.instagram) || hasText(user.kakaoId),
      weight: 1,
    },
    {
      key: 'verified',
      label: '본인 인증',
      done: user.isVerified || verified.includes('identity'),
      weight: 3,
    },
  ]

  const totalWeight = items.reduce((sum, it) => sum + it.weight, 0)
  const doneWeight = items.reduce((sum, it) => sum + (it.done ? it.weight : 0), 0)
  const percent = totalWeight === 0 ? 0 : Math.round((doneWeight / totalWeight) * 100)

  const doneCount = items.filter((it) => it.done).length
  const nextItem = items.filter((it) => !it.done).sort((a, b) => b.weight - a.weight)[0] ?? null

  return {
    percent,
    doneCount,
    totalCount: items.length,
    items,
    nextItem,
  }
}
