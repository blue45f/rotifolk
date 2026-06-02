import { describe, expect, it } from 'vitest'
import { groupByN, shuffle } from './shuffle'

const sorted = (a: number[]) => [...a].sort((x, y) => x - y)

describe('shuffle', () => {
  it('원소 보존(순열) — 길이·구성 동일', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const out = shuffle(input, 7)
    expect(out).toHaveLength(input.length)
    expect(sorted(out)).toEqual(sorted(input))
  })
  it('입력 배열을 변형하지 않음', () => {
    const input = [1, 2, 3]
    const copy = [...input]
    shuffle(input, 1)
    expect(input).toEqual(copy)
  })
  it('같은 시드 → 같은 결과(결정적)', () => {
    expect(shuffle([1, 2, 3, 4, 5], 42)).toEqual(shuffle([1, 2, 3, 4, 5], 42))
  })
  it('빈 배열·단일 원소 안전', () => {
    expect(shuffle([], 1)).toEqual([])
    expect(shuffle([9], 1)).toEqual([9])
  })
})

describe('groupByN', () => {
  it('모든 원소를 정확히 한 번씩 포함', () => {
    const input = [1, 2, 3, 4, 5, 6, 7]
    const groups = groupByN(input, 2, 3)
    expect(sorted(groups.flat())).toEqual(sorted(input))
  })
  it('그룹이 둘 이상이면 groupSize 미만 그룹을 남기지 않음(고아 방지)', () => {
    // 7명 2인조 → 마지막 1명이 직전 그룹에 합쳐짐
    const groups = groupByN([1, 2, 3, 4, 5, 6, 7], 2, 3)
    expect(groups.length).toBeGreaterThan(1)
    for (const g of groups) expect(g.length).toBeGreaterThanOrEqual(2)
  })
  it('groupSize가 인원 이상이면 단일 그룹', () => {
    const groups = groupByN([1, 2, 3], 5, 1)
    expect(groups).toHaveLength(1)
    expect(sorted(groups[0])).toEqual([1, 2, 3])
  })
  it('딱 나누어떨어지면 균등 분할', () => {
    const groups = groupByN([1, 2, 3, 4], 2, 1)
    expect(groups).toHaveLength(2)
    expect(groups.every((g) => g.length === 2)).toBe(true)
  })
  it('같은 시드 → 같은 그룹(결정적)', () => {
    expect(groupByN([1, 2, 3, 4, 5], 2, 9)).toEqual(groupByN([1, 2, 3, 4, 5], 2, 9))
  })
})
