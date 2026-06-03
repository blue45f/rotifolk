export type HostLevel = 'newbie' | 'sapling' | 'sommelier' | 'curator' | 'legend'

export interface HostLevelInfo {
  level: HostLevel
  label: string
  emoji: string
  minHosted: number
  minRating: number
}

export const HOST_LEVELS: HostLevelInfo[] = [
  { level: 'newbie', label: '새내기', emoji: '🌱', minHosted: 0, minRating: 0 },
  { level: 'sapling', label: '새싹', emoji: '🌿', minHosted: 3, minRating: 4.0 },
  { level: 'sommelier', label: '소믈리에', emoji: '🍷', minHosted: 10, minRating: 4.3 },
  { level: 'curator', label: '큐레이터', emoji: '🎙️', minHosted: 25, minRating: 4.5 },
  { level: 'legend', label: '레전드', emoji: '👑', minHosted: 60, minRating: 4.7 },
]

/**
 * 호스팅 횟수와 평균 평점을 기준으로 가장 높은 호스트 레벨을 반환한다.
 * - 두 조건(minHosted, minRating)을 **모두** 만족하는 단계 중 가장 상위 레벨을 선택한다.
 * - 어떤 조건도 만족하지 못하는 경우에도 최소한 newbie(🌱)는 반환된다.
 */
export function computeHostLevel(input: {
  hostedCount: number
  averageRating: number
}): HostLevelInfo {
  const { hostedCount, averageRating } = input
  // HOST_LEVELS는 minHosted 오름차순이므로 뒤에서부터 첫 번째 매칭이 가장 상위 레벨.
  for (let i = HOST_LEVELS.length - 1; i >= 0; i--) {
    const lv = HOST_LEVELS[i]
    if (hostedCount >= lv.minHosted && averageRating >= lv.minRating) {
      return lv
    }
  }
  return HOST_LEVELS[0]
}
