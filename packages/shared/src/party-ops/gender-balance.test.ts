import { describe, expect, it } from 'vitest'
import {
  canAcceptGender,
  evaluateGenderBalance,
  minorityFloor,
  parseGenderRatio,
} from './gender-balance'

describe('parseGenderRatio / minorityFloor', () => {
  it('parses ratios and "any"', () => {
    expect(parseGenderRatio('any')).toBeNull()
    expect(parseGenderRatio('5:3')).toEqual({ a: 5, b: 3 })
    expect(minorityFloor('1:1')).toBe(1)
    expect(minorityFloor('5:3')).toBeCloseTo(0.6)
  })
})

describe('evaluateGenderBalance — 비례 성비', () => {
  it('남 5 → 여 최소 3 이면 성립', () => {
    expect(evaluateGenderBalance({ male: 5, female: 3 }, '5:3').balanced).toBe(true)
  })
  it('남 10 → 여 6 이어야 성립 (3은 부족)', () => {
    const short = evaluateGenderBalance({ male: 10, female: 3 }, '5:3')
    expect(short.balanced).toBe(false)
    expect(short.neededFemale).toBe(3)
    expect(evaluateGenderBalance({ male: 10, female: 6 }, '5:3').balanced).toBe(true)
  })
  it('any 는 항상 성립', () => {
    expect(evaluateGenderBalance({ male: 9, female: 0 }, 'any').balanced).toBe(true)
  })
})

describe('canAcceptGender — 비례 한도로 대기열 판단', () => {
  it('여 3명일 때 6번째 남자는 대기열로 (5:3)', () => {
    expect(canAcceptGender('male', { male: 5, female: 3 }, '5:3')).toBe(false)
    expect(canAcceptGender('female', { male: 5, female: 3 }, '5:3')).toBe(true)
  })
  it('여 6명이면 남자는 10명까지 수용 (5:3)', () => {
    expect(canAcceptGender('male', { male: 9, female: 6 }, '5:3')).toBe(true)
    expect(canAcceptGender('male', { male: 10, female: 6 }, '5:3')).toBe(false)
  })
  it('성별 상한(cap)을 넘으면 거부', () => {
    expect(canAcceptGender('female', { male: 4, female: 4 }, '1:1', { caps: { female: 4 } })).toBe(
      false,
    )
  })
})
