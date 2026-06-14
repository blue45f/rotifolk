export interface Achievement {
  id: string
  emoji: string
  label: string
  description: string
  earned: boolean
}

interface AchievementInput {
  hostedCount: number
  joinedCount: number
  trustScore: number
  isVerified: boolean
  hasReferred?: number
}

/** Pure compute — no side effects. Order = display order. */
export function computeAchievements(input: AchievementInput): Achievement[] {
  const { hostedCount, joinedCount, trustScore, isVerified, hasReferred = 0 } = input
  return [
    {
      id: 'first-join',
      emoji: '🍷',
      label: '첫 모임',
      description: '처음으로 한 잔 모임에 참여했어요',
      earned: joinedCount >= 1,
    },
    {
      id: 'regular',
      emoji: '🌹',
      label: '단골',
      description: '모임에 5번 이상 참여했어요',
      earned: joinedCount >= 5,
    },
    {
      id: 'connoisseur',
      emoji: '🥂',
      label: '잔도사',
      description: '모임에 15번 이상 참여했어요',
      earned: joinedCount >= 15,
    },
    {
      id: 'first-host',
      emoji: '🎙️',
      label: '첫 호스팅',
      description: '직접 모임을 열어봤어요',
      earned: hostedCount >= 1,
    },
    {
      id: 'curator',
      emoji: '🎷',
      label: '큐레이터',
      description: '모임을 5회 이상 열었어요',
      earned: hostedCount >= 5,
    },
    {
      id: 'maestro',
      emoji: '🏆',
      label: '마에스트로',
      description: '모임을 15회 이상 열었어요',
      earned: hostedCount >= 15,
    },
    {
      id: 'verified',
      emoji: '✓',
      label: '인증 호스트',
      description: '운영팀 인증을 받았어요',
      earned: isVerified,
    },
    {
      id: 'trustworthy',
      emoji: '🌙',
      label: '신뢰의 잔',
      description: '신뢰도 80점 이상',
      earned: trustScore >= 80,
    },
    {
      id: 'connector',
      emoji: '💌',
      label: '연결자',
      description: '3명 이상의 친구를 초대했어요',
      earned: hasReferred >= 3,
    },
  ]
}

export function summarizeAchievements(list: Achievement[]): { earned: number; total: number } {
  return {
    earned: list.filter((a) => a.earned).length,
    total: list.length,
  }
}
