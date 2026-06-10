/**
 * 파티 타이밍 운영 계산 — 시작 지연·종료 역산·휴식 규칙을 다루는 순수 함수 모듈.
 * 라이브 화면의 호스트 운영 패널과 단위 테스트가 같은 소스를 공유한다.
 * (실제 라운드 진행은 호스트가 수동으로 트리거 — 이 모듈은 계획/가이드 계산만 담당)
 */

/** "N라운드마다 M분 휴식" 규칙. everyNRounds < 1 또는 breakMin < 1이면 비활성. */
export interface BreakRule {
  everyNRounds: number
  breakMin: number
}

export interface TimelineInput {
  /** 원래 시작 시각 (epoch ms) */
  startAtMs: number
  totalRounds: number
  roundDurationSec: number
  /** 라운드 사이 기본(짧은) 휴식 초 */
  breakBetweenRoundsSec: number
  /** 시작 지연 누적 분 (+5/+10 버튼) */
  delayMin?: number
  /** 긴 휴식 규칙 — 해당 라운드 뒤의 짧은 휴식을 대체한다 */
  breakRule?: BreakRule | null
}

export type TimelineBlock =
  | { kind: 'round'; index: number; startAtMs: number; durationSec: number }
  | {
      kind: 'break'
      afterRound: number
      startAtMs: number
      durationSec: number
      /** 규칙에 의한 긴 휴식 여부 (false면 라운드 간 기본 휴식) */
      long: boolean
    }

const MIN_ROUND_SEC = 60

function isActiveRule(rule: BreakRule | null | undefined): rule is BreakRule {
  return !!rule && rule.everyNRounds >= 1 && rule.breakMin >= 1
}

/** 시작 지연 적용 — +5분/+10분 누적 후의 실제 시작 시각. */
export function applyStartDelay(startAtMs: number, delayMin: number): number {
  return startAtMs + Math.max(0, delayMin) * 60_000
}

/** roundIndex 라운드가 끝난 뒤 긴 휴식인지 (예: 3라운드마다 → 3, 6, 9...). */
export function isLongBreakAfterRound(
  roundIndex: number | null | undefined,
  rule: BreakRule | null | undefined,
): boolean {
  if (!roundIndex || roundIndex < 1 || !isActiveRule(rule)) return false
  return roundIndex % rule.everyNRounds === 0
}

/** 라운드·휴식 블록 타임라인 — 마지막 라운드 뒤에는 휴식을 붙이지 않는다. */
export function buildTimeline(input: TimelineInput): TimelineBlock[] {
  const blocks: TimelineBlock[] = []
  if (input.totalRounds < 1 || input.roundDurationSec <= 0) return blocks
  let cursor = applyStartDelay(input.startAtMs, input.delayMin ?? 0)
  for (let r = 1; r <= input.totalRounds; r++) {
    blocks.push({ kind: 'round', index: r, startAtMs: cursor, durationSec: input.roundDurationSec })
    cursor += input.roundDurationSec * 1000
    if (r === input.totalRounds) break
    const long = isLongBreakAfterRound(r, input.breakRule)
    const durationSec = long ? input.breakRule!.breakMin * 60 : input.breakBetweenRoundsSec
    if (durationSec > 0) {
      blocks.push({ kind: 'break', afterRound: r, startAtMs: cursor, durationSec, long })
      cursor += durationSec * 1000
    }
  }
  return blocks
}

/** 전체 로테이션 종료 시각 (epoch ms) — 지연·휴식 규칙 반영. */
export function timelineEndMs(input: TimelineInput): number {
  const blocks = buildTimeline(input)
  if (blocks.length === 0) return applyStartDelay(input.startAtMs, input.delayMin ?? 0)
  const last = blocks[blocks.length - 1]
  return last.startAtMs + last.durationSec * 1000
}

/** 라운드 사이 휴식 총합(초) — 역산 시 차감할 양. */
export function totalBreakSec(
  totalRounds: number,
  breakBetweenRoundsSec: number,
  breakRule?: BreakRule | null,
): number {
  if (totalRounds <= 1) return 0
  const gaps = totalRounds - 1
  const longCount = isActiveRule(breakRule) ? Math.floor(gaps / breakRule.everyNRounds) : 0
  const shortCount = gaps - longCount
  const longSec = isActiveRule(breakRule) ? breakRule.breakMin * 60 : 0
  return shortCount * breakBetweenRoundsSec + longCount * longSec
}

export interface SolveInput {
  /** 실제 시작(지연 반영 전) 시각 epoch ms */
  startAtMs: number
  /** 고정할 종료 시각 epoch ms */
  endAtMs: number
  totalRounds: number
  breakBetweenRoundsSec: number
  delayMin?: number
  breakRule?: BreakRule | null
}

/**
 * 종료 역산 — 종료 시각과 라운드 수를 고정하면 라운드당 시간을 계산한다(휴식 차감).
 * 라운드당 60초 미만이면 실행 불가능으로 보고 null.
 */
export function solveRoundDurationSec(input: SolveInput): number | null {
  if (input.totalRounds < 1) return null
  const start = applyStartDelay(input.startAtMs, input.delayMin ?? 0)
  const availableSec = Math.floor((input.endAtMs - start) / 1000)
  const breaks = totalBreakSec(input.totalRounds, input.breakBetweenRoundsSec, input.breakRule)
  const perRound = Math.floor((availableSec - breaks) / input.totalRounds)
  return perRound >= MIN_ROUND_SEC ? perRound : null
}

/** "5분" / "5분 30초" / "45초" — 운영 패널 표시용. */
export function formatDurationKo(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const m = Math.floor(s / 60)
  const rest = s % 60
  if (m === 0) return `${rest}초`
  if (rest === 0) return `${m}분`
  return `${m}분 ${rest}초`
}

/** "오후 9:30" 형태의 시각 라벨. */
export function formatClockKo(ms: number): string {
  return new Date(ms).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
}

/**
 * "HH:mm" 입력을 기준일(startAtMs)과 같은 날의 epoch ms로 변환.
 * 시작 시각보다 이르면 익일로 해석한다(자정 넘김 모임).
 */
export function endTimeFromHHmm(startAtMs: number, hhmm: string): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim())
  if (!match) return null
  const base = new Date(startAtMs)
  base.setHours(Number(match[1]), Number(match[2]), 0, 0)
  let end = base.getTime()
  if (end <= startAtMs) end += 24 * 3600_000
  return end
}
