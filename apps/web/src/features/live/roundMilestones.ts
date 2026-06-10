/** 라운드 타이머에서 알릴 가치가 있는 시점 — 스크린리더 낭독·알람이 같은 소스를 공유한다. */
export type RoundMilestone = 'half' | 'one-minute' | 'ten-seconds' | 'ended'

/** 마일스톤별 스크린리더 안내 문구 */
export const ROUND_MILESTONE_MESSAGE: Record<RoundMilestone, string> = {
  half: '라운드가 절반 지났어요',
  'one-minute': '1분 남았어요',
  'ten-seconds': '10초 남았어요',
  ended: '라운드가 끝났어요',
}

/**
 * 직전 틱과 현재 틱 사이에 마일스톤 경계를 지났는지 판정한다.
 * 매초 aria-live 낭독 대신 의미 있는 시점만 알리기 위한 단일 소스 —
 * 틱이 유실돼 여러 초를 건너뛰어도 가장 급한 경계 하나만 잡힌다.
 * 절반 안내는 절반 지점이 1분 경계보다 앞일 때만 켜서 짧은 라운드의 중복 낭독을 막는다.
 */
export function detectRoundMilestone(
  prevSec: number,
  currentSec: number,
  durationSec: number,
): RoundMilestone | null {
  if (currentSec >= prevSec) return null // 라운드 시작 등 리셋(증가) 구간은 무시
  if (currentSec <= 0) return 'ended'
  if (prevSec > 10 && currentSec <= 10) return 'ten-seconds'
  if (prevSec > 60 && currentSec <= 60) return 'one-minute'
  const half = Math.floor(durationSec / 2)
  if (half > 60 && prevSec > half && currentSec <= half) return 'half'
  return null
}
