import { describe, expect, it } from 'vitest'

import {
  describeParse,
  hourToTimeOfDay,
  parseSmartQuery,
  toSearchParams,
  weekdayToDayPreference,
} from './smartSearch'

/**
 * 한국어 자연어 검색 파서(LLM 없는 사전 기반) 회귀 방지.
 * rotifolk 실제 도메인(카테고리·서울 동네·포맷·성비·인원·시간대)으로의 매핑을 잠근다.
 */
describe('parseSmartQuery', () => {
  it('복합 질의 — 카테고리·지역·인원·시간대 추출 + 잔여는 q 폴백', () => {
    const r = parseSmartQuery('한남 와인 6명 주말 저녁 조용한')
    expect(r.category).toBe('wine')
    expect(r.area).toBe('한남동')
    expect(r.capacity).toBe(6)
    expect(r.dayPreference).toBe('weekend')
    expect(r.timeOfDay).toBe('evening')
    expect(r.q).toBe('조용한')
  })

  it('"내추럴 와인"은 wine이 아니라 natural-wine으로 (구체 키워드 우선)', () => {
    const r = parseSmartQuery('성수 내추럴 와인 모임')
    expect(r.category).toBe('natural-wine')
    expect(r.area).toBe('성수')
    expect(r.q).toBe('모임')
  })

  it('카테고리 별칭 — 카페→coffee, 맥주→beer, 다실→tea', () => {
    expect(parseSmartQuery('연남 카페').category).toBe('coffee')
    expect(parseSmartQuery('홍대 크래프트 맥주').category).toBe('beer')
    expect(parseSmartQuery('북촌 한옥 다실').category).toBe('tea')
  })

  it.each([
    ['8인', 8],
    ['20 people', 20],
    ['15ppl', 15],
    ['최대 12명', 12],
  ])('인원 표기 "%s" → %i', (text, expected) => {
    expect(parseSmartQuery(text).capacity).toBe(expected)
  })

  it('포맷 추출 — 쪽지팅 / 로테이션 / 믹서', () => {
    expect(parseSmartQuery('쪽지팅').format).toBe('note-ting')
    expect(parseSmartQuery('위스키 로테이션 파티').format).toBe('rotation')
    expect(parseSmartQuery('칵테일 믹서').format).toBe('mixer')
  })

  it('성비(5:5 등)는 정형 필터로 인식하지 않는다 — PartySummary에 적용할 절이 없음', () => {
    // genderRatio 필드는 surface하지 않는다.
    const r = parseSmartQuery('와인 5:5')
    expect('genderRatio' in r).toBe(false)
    expect(r.category).toBe('wine')
    // '5:5'는 잔여 q로도 만들지 않는다(잘못된 자유 검색어 방지).
    expect(r.q).toBeUndefined()

    // 다른 성비 표기도 동일 — 칩/검색어로 새지 않는다.
    const r2 = parseSmartQuery('반반 성비 모임')
    expect('genderRatio' in r2).toBe(false)
    expect(r2.q).toBe('모임')

    // describeParse / toSearchParams 어디에도 genderRatio 칩/파라미터가 없다.
    expect(describeParse(r).some((c) => c.key === 'genderRatio')).toBe(false)
    expect(toSearchParams(r).genderRatio).toBeUndefined()
  })

  it('주말 저녁 — dayPreference + timeOfDay 동시 추출', () => {
    const r = parseSmartQuery('주말 저녁 칵테일')
    expect(r.dayPreference).toBe('weekend')
    expect(r.timeOfDay).toBe('evening')
    expect(r.category).toBe('cocktail')
    expect(r.q).toBeUndefined()
  })

  it('평일 낮 — afternoon', () => {
    const r = parseSmartQuery('평일 낮 커피')
    expect(r.dayPreference).toBe('weekday')
    expect(r.timeOfDay).toBe('afternoon')
    expect(r.category).toBe('coffee')
  })

  it('지역만 — 카테고리 없이 area + q 폴백', () => {
    const r = parseSmartQuery('강남 분위기 좋은')
    expect(r.area).toBe('강남')
    expect(r.category).toBeUndefined()
    expect(r.q).toBe('분위기 좋은')
  })

  it('빈 입력·공백은 빈 결과', () => {
    expect(parseSmartQuery('')).toEqual({})
    expect(parseSmartQuery('   ')).toEqual({})
  })

  it('잔여 키워드가 2자 미만이면 q 로 만들지 않는다', () => {
    expect(parseSmartQuery('와인 x').q).toBeUndefined()
  })

  it('custom은 자연어로 매칭하지 않는다 (오탐 방지)', () => {
    expect(parseSmartQuery('커스텀 테마 파티').category).toBeUndefined()
  })
})

describe('toSearchParams', () => {
  it('파싱 결과를 PartyQuery 스키마(category·area) + 보조 필터로 직렬화', () => {
    const sp = toSearchParams({
      category: 'wine',
      area: '한남동',
      format: 'rotation',
      capacity: 6,
      dayPreference: 'weekend',
      timeOfDay: 'evening',
      q: '조용한',
    })
    expect(sp).toEqual({
      category: 'wine',
      area: '한남동',
      format: 'rotation',
      capacity: '6',
      day: 'weekend',
      time: 'evening',
      q: '조용한',
    })
  })

  it('빈 결과는 빈 맵', () => {
    expect(toSearchParams({})).toEqual({})
  })
})

describe('hourToTimeOfDay / weekdayToDayPreference', () => {
  it.each([
    [7, 'morning'],
    [13, 'afternoon'],
    [19, 'evening'],
    [23, 'night'],
    [2, 'night'],
  ])('%i시 → %s', (hour, expected) => {
    expect(hourToTimeOfDay(hour)).toBe(expected)
  })

  it('토·일만 주말, 나머지는 평일', () => {
    expect(weekdayToDayPreference(0)).toBe('weekend')
    expect(weekdayToDayPreference(6)).toBe('weekend')
    expect(weekdayToDayPreference(3)).toBe('weekday')
  })
})

describe('describeParse', () => {
  it('파싱 결과를 사람이 읽는 칩으로 변환 (카테고리 라벨 주입)', () => {
    const chips = describeParse(parseSmartQuery('한남 와인 6명 주말 저녁'), (c) =>
      c === 'wine' ? '와인 로테이션' : c,
    )
    expect(chips.find((c) => c.key === 'category')?.label).toBe('와인 로테이션')
    expect(chips.find((c) => c.key === 'area')?.label).toBe('한남동')
    expect(chips.find((c) => c.key === 'capacity')?.label).toBe('6명')
    expect(chips.find((c) => c.key === 'dayPreference')?.label).toBe('주말')
    expect(chips.find((c) => c.key === 'timeOfDay')?.label).toBe('저녁')
  })

  it('카테고리 라벨 콜백이 없으면 키를 그대로 쓴다', () => {
    const chips = describeParse({ category: 'sake' })
    expect(chips.find((c) => c.key === 'category')?.label).toBe('sake')
  })
})
