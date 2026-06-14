import { describe, expect, it } from 'vitest'

import {
  applyStartDelay,
  buildTimeline,
  endTimeFromHHmm,
  formatDurationKo,
  isLongBreakAfterRound,
  solveRoundDurationSec,
  timelineEndMs,
  totalBreakSec,
} from './partyTiming'

const T0 = Date.UTC(2026, 5, 11, 9, 0, 0) // 기준 시작 시각

describe('applyStartDelay (지각 지연)', () => {
  it('+5분/+10분 누적만큼 시작과 종료가 함께 밀린다', () => {
    expect(applyStartDelay(T0, 0)).toBe(T0)
    expect(applyStartDelay(T0, 15)).toBe(T0 + 15 * 60_000)

    const base = { startAtMs: T0, totalRounds: 4, roundDurationSec: 300, breakBetweenRoundsSec: 30 }
    const noDelayEnd = timelineEndMs(base)
    const delayedEnd = timelineEndMs({ ...base, delayMin: 10 })
    // 4라운드 × 300초 + 3회 × 30초 휴식 = 1290초
    expect(noDelayEnd).toBe(T0 + 1290 * 1000)
    expect(delayedEnd - noDelayEnd).toBe(10 * 60_000)
  })

  it('음수 지연은 0으로 클램프한다', () => {
    expect(applyStartDelay(T0, -5)).toBe(T0)
  })
})

describe('buildTimeline (휴식 포함)', () => {
  it('마지막 라운드 뒤에는 휴식 블록이 없다', () => {
    const blocks = buildTimeline({
      startAtMs: T0,
      totalRounds: 3,
      roundDurationSec: 300,
      breakBetweenRoundsSec: 30,
    })
    expect(blocks.map((b) => b.kind)).toEqual(['round', 'break', 'round', 'break', 'round'])
    expect(blocks.at(-1)).toMatchObject({ kind: 'round', index: 3 })
  })

  it('N라운드마다 M분 휴식 규칙이 짧은 휴식을 대체한다 (예: 3라운드 후 10분)', () => {
    const blocks = buildTimeline({
      startAtMs: T0,
      totalRounds: 6,
      roundDurationSec: 300,
      breakBetweenRoundsSec: 30,
      breakRule: { everyNRounds: 3, breakMin: 10 },
    })
    const breaks = blocks.filter((b) => b.kind === 'break')
    expect(breaks).toHaveLength(5)
    const longs = breaks.filter((b) => b.kind === 'break' && b.long)
    expect(longs.map((b) => (b.kind === 'break' ? b.afterRound : -1))).toEqual([3])
    expect(longs[0].durationSec).toBe(600)
    // 짧은 휴식은 그대로 30초
    expect(breaks.filter((b) => !b.long).every((b) => b.durationSec === 30)).toBe(true)
    // 블록은 빈틈없이 이어진다
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].startAtMs).toBe(blocks[i - 1].startAtMs + blocks[i - 1].durationSec * 1000)
    }
  })

  it('라운드가 0개면 빈 타임라인', () => {
    expect(
      buildTimeline({
        startAtMs: T0,
        totalRounds: 0,
        roundDurationSec: 300,
        breakBetweenRoundsSec: 30,
      })
    ).toEqual([])
  })
})

describe('totalBreakSec', () => {
  it('짧은 휴식과 긴 휴식을 섞어 계산한다', () => {
    // 5라운드 → 4회 휴식. 2라운드마다 10분 → 2·4라운드 뒤 긴 휴식 2회 + 짧은 2회
    expect(totalBreakSec(5, 60, { everyNRounds: 2, breakMin: 10 })).toBe(2 * 60 + 2 * 600)
    expect(totalBreakSec(5, 60)).toBe(4 * 60)
    expect(totalBreakSec(1, 60)).toBe(0)
  })
})

describe('solveRoundDurationSec (종료 역산)', () => {
  it('종료 시각·라운드 수 고정 시 휴식을 차감하고 라운드당 시간을 계산한다', () => {
    const end = T0 + 90 * 60_000 // 90분 뒤 종료
    expect(
      solveRoundDurationSec({
        startAtMs: T0,
        endAtMs: end,
        totalRounds: 5,
        breakBetweenRoundsSec: 60,
      })
    ).toBe(Math.floor((90 * 60 - 4 * 60) / 5)) // 1032초

    expect(
      solveRoundDurationSec({
        startAtMs: T0,
        endAtMs: end,
        totalRounds: 5,
        breakBetweenRoundsSec: 60,
        breakRule: { everyNRounds: 2, breakMin: 10 },
      })
    ).toBe(Math.floor((90 * 60 - (2 * 60 + 2 * 600)) / 5)) // 816초
  })

  it('시작 지연이 반영된다', () => {
    const end = T0 + 60 * 60_000
    const noDelay = solveRoundDurationSec({
      startAtMs: T0,
      endAtMs: end,
      totalRounds: 4,
      breakBetweenRoundsSec: 0,
    })
    const delayed = solveRoundDurationSec({
      startAtMs: T0,
      endAtMs: end,
      totalRounds: 4,
      breakBetweenRoundsSec: 0,
      delayMin: 20,
    })
    expect(noDelay).toBe(900)
    expect(delayed).toBe(600)
  })

  it('라운드당 60초 미만이면 실행 불가(null)', () => {
    expect(
      solveRoundDurationSec({
        startAtMs: T0,
        endAtMs: T0 + 3 * 60_000,
        totalRounds: 5,
        breakBetweenRoundsSec: 30,
      })
    ).toBeNull()
    expect(
      solveRoundDurationSec({
        startAtMs: T0,
        endAtMs: T0 - 1000,
        totalRounds: 2,
        breakBetweenRoundsSec: 0,
      })
    ).toBeNull()
  })
})

describe('isLongBreakAfterRound (휴식 중 화면 상태 판정)', () => {
  it('규칙 라운드 배수에서만 true', () => {
    const rule = { everyNRounds: 3, breakMin: 10 }
    expect(isLongBreakAfterRound(3, rule)).toBe(true)
    expect(isLongBreakAfterRound(6, rule)).toBe(true)
    expect(isLongBreakAfterRound(2, rule)).toBe(false)
    expect(isLongBreakAfterRound(null, rule)).toBe(false)
    expect(isLongBreakAfterRound(3, null)).toBe(false)
    expect(isLongBreakAfterRound(3, { everyNRounds: 0, breakMin: 10 })).toBe(false)
  })
})

describe('formatters', () => {
  it('formatDurationKo', () => {
    expect(formatDurationKo(45)).toBe('45초')
    expect(formatDurationKo(300)).toBe('5분')
    expect(formatDurationKo(330)).toBe('5분 30초')
  })

  it('endTimeFromHHmm — 시작보다 이르면 익일로 해석', () => {
    const start = new Date(2026, 5, 11, 20, 0, 0).getTime()
    const sameDay = endTimeFromHHmm(start, '22:30')
    expect(sameDay).toBe(new Date(2026, 5, 11, 22, 30, 0).getTime())
    const nextDay = endTimeFromHHmm(start, '01:00')
    expect(nextDay).toBe(new Date(2026, 5, 12, 1, 0, 0).getTime())
    expect(endTimeFromHHmm(start, 'bad')).toBeNull()
  })
})
