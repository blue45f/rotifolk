import { PARTY_FORMAT_LABEL, type PartyCategory, type PartyFormat } from './domain/party'

/**
 * 한국어 자연어 검색 입력을 rotifolk의 정형 필터로 파싱한다.
 * - LLM 없이 사전 기반 substring 매칭. 의존성 없음·순수 함수.
 * - 매핑되지 않은 잔여 토큰은 q(자유 검색어)로 폴백 → 기존 검색과 호환.
 *
 * rotifolk 실제 도메인에만 매핑한다:
 * - category: PartyCategory (wine·natural-wine·coffee·tea·whisky·cocktail·beer·sake·dessert)
 * - area: 서울 동네 (한남동·연남동·북촌·강남·성수·망원·이태원·홍대) = venueArea/area
 * - format: PartyFormat (rotation·note-ting·mixer)
 * - capacity: "N명"/"N인"
 * - timeOfDay: morning·afternoon·evening·night / weekend·weekday (startAt 보조 필터)
 *
 * 주의: 성비(5:5 등)는 정형 필터로 인식하지 않는다 — 목록 페이로드(PartySummary)에
 * genderRatio 필드가 없어 적용 가능한 필터 절이 없기 때문. '5:5' 같은 표기는 무시하고
 * 잔여 자유 검색어(q)로도 만들지 않는다(2자 미만 폴백 규칙으로 자연 제외).
 */

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export type DayPreference = 'weekday' | 'weekend'

export interface SmartSearchParse {
  category?: PartyCategory
  area?: string
  format?: PartyFormat
  capacity?: number
  timeOfDay?: TimeOfDay
  dayPreference?: DayPreference
  /** 자연어 입력에서 매칭되지 않은 잔여 키워드 (= q 검색어로 폴백) */
  q?: string
}

/**
 * 카테고리 키워드. CATEGORY_META 라벨/별칭과 호환.
 * custom은 자유 테마라 자연어 매칭 대상에서 제외(오탐 방지).
 */
const CATEGORY_KEYWORDS: Record<Exclude<PartyCategory, 'custom'>, string[]> = {
  wine: ['와인', 'wine'],
  'natural-wine': ['내추럴', '내추럴와인', '내추럴 와인', '내츄럴', 'natural'],
  coffee: ['커피', '카페', '스페셜티', 'coffee'],
  tea: ['다실', '찻집', '티타임', 'tea'],
  whisky: ['위스키', '싱글몰트', '몰트', 'whisky', 'whiskey'],
  cocktail: ['칵테일', '시그니처', 'cocktail'],
  beer: ['비어', '맥주', '크래프트', 'ipa', '라거', 'beer'],
  sake: ['사케', '청주', 'sake'],
  dessert: ['디저트', '케이크', '베이킹', 'dessert'],
}

/**
 * 카테고리 매칭 우선순위. "내추럴 와인"이 "와인"보다 먼저 잡혀야 하므로
 * 더 구체적인(긴) 키워드를 가진 카테고리를 앞에 둔다.
 */
const CATEGORY_ORDER: Array<Exclude<PartyCategory, 'custom'>> = [
  'natural-wine',
  'wine',
  'coffee',
  'tea',
  'whisky',
  'cocktail',
  'beer',
  'sake',
  'dessert',
]

/** 서울 동네 — geo.SEOUL_AREAS 키와 동일. 별칭(짧은 표기)도 같은 area 값으로. */
const AREA_KEYWORDS: Record<string, string[]> = {
  한남동: ['한남동', '한남'],
  연남동: ['연남동', '연남'],
  북촌: ['북촌'],
  강남: ['강남'],
  성수: ['성수동', '성수'],
  망원: ['망원동', '망원'],
  이태원: ['이태원'],
  홍대: ['홍대', '홍익'],
}

/** 파티 포맷 — PARTY_FORMAT_LABEL과 호환. */
const FORMAT_KEYWORDS: Record<PartyFormat, string[]> = {
  rotation: ['로테이션', '회전', 'rotation'],
  'note-ting': ['쪽지팅', '쪽지', 'note'],
  mixer: ['믹서', '믹싱', '밍글', 'mixer'],
}

const TIME_OF_DAY_KEYWORDS: Record<TimeOfDay, string[]> = {
  morning: ['아침', '오전', '모닝', 'morning'],
  afternoon: ['오후', '점심', '낮', 'brunch', '브런치', 'afternoon'],
  evening: ['저녁', '이브닝', '해질녘', 'evening'],
  night: ['밤', '야간', '심야', '나이트', 'night'],
}

const DAY_PREFERENCE_KEYWORDS: Record<DayPreference, string[]> = {
  weekend: ['주말', '토요일', '일요일', '토', '주말저녁', 'weekend'],
  weekday: ['평일', '주중', 'weekday'],
}

function takeFirstMatch<K extends string>(
  lower: string,
  groups: Array<[K, string[]]>
): { key: K; matched: string[] } | undefined {
  for (const [key, kws] of groups) {
    const hit = kws.find((kw) => lower.includes(kw.toLowerCase()))
    if (hit) {
      const matched = kws.filter((kw) => lower.includes(kw.toLowerCase()))
      return { key, matched }
    }
  }
  return undefined
}

function stripAll(text: string, tokens: string[]): string {
  let out = text
  // 긴 토큰부터 제거: "내추럴 와인"이 "내추럴"보다 먼저 지워져야 "와인"이 잔여로 남지 않는다.
  const ordered = [...tokens].sort((a, b) => b.length - a.length)
  for (const t of ordered) {
    out = out.split(new RegExp(escapeRegExp(t), 'gi')).join(' ')
  }
  return out
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 자유 텍스트를 정형 필터로 파싱. 다중 매칭 차원(카테고리/지역/포맷 등)은 첫 매칭 우선.
 * 매칭된 토큰은 잔여 q에서 제거한다.
 */
export function parseSmartQuery(text: string): SmartSearchParse {
  const original = text.trim()
  if (!original) return {}
  const lower = original.toLowerCase()
  const result: SmartSearchParse = {}
  let remaining = original

  // 카테고리 (구체 키워드 우선)
  const catHit = takeFirstMatch(
    lower,
    CATEGORY_ORDER.map(
      (c) => [c, CATEGORY_KEYWORDS[c]] as [Exclude<PartyCategory, 'custom'>, string[]]
    )
  )
  if (catHit) {
    result.category = catHit.key
    remaining = stripAll(remaining, catHit.matched)
  }

  // 지역 (서울 동네)
  const areaHit = takeFirstMatch(lower, Object.entries(AREA_KEYWORDS) as Array<[string, string[]]>)
  if (areaHit) {
    result.area = areaHit.key
    remaining = stripAll(remaining, areaHit.matched)
  }

  // 포맷
  const formatHit = takeFirstMatch(
    lower,
    Object.entries(FORMAT_KEYWORDS) as Array<[PartyFormat, string[]]>
  )
  if (formatHit) {
    result.format = formatHit.key
    remaining = stripAll(remaining, formatHit.matched)
  }

  // 성비(5:5 등)는 정형 필터로 인식하지 않는다 — PartySummary에 genderRatio가 없어
  // 적용할 필터 절이 없기 때문. 다만 표기 토큰은 잔여 q를 오염시키지 않도록 제거만 한다.
  // (필터로 surface하지 않으며 칩/검색어로도 만들지 않는다.)
  if (/5\s*:\s*5|5대5|반반|성비/.test(lower)) {
    remaining = stripAll(remaining, ['5:5', '5 : 5', '5대5', '반반', '성비'])
  }

  // 인원: "20명" / "8인" / "30 people"
  const capMatch = original.match(/(\d{1,3})\s*(?:명|인|people|ppl)/i)
  if (capMatch) {
    result.capacity = Number(capMatch[1])
    remaining = remaining.replace(capMatch[0], ' ')
  }

  // 요일 선호 (주말/평일) — timeOfDay보다 먼저 처리(주말저녁 같은 합성어 대비)
  const dayHit = takeFirstMatch(
    lower,
    Object.entries(DAY_PREFERENCE_KEYWORDS) as Array<[DayPreference, string[]]>
  )
  if (dayHit) {
    result.dayPreference = dayHit.key
    remaining = stripAll(remaining, dayHit.matched)
  }

  // 시간대
  const timeHit = takeFirstMatch(
    stripAll(lower, dayHit?.matched ?? []),
    Object.entries(TIME_OF_DAY_KEYWORDS) as Array<[TimeOfDay, string[]]>
  )
  if (timeHit) {
    result.timeOfDay = timeHit.key
    remaining = stripAll(remaining, timeHit.matched)
  }

  // 남은 키워드는 q 로 폴백 (>=2자)
  const rest = remaining.replace(/\s+/g, ' ').trim()
  if (rest.length >= 2) {
    result.q = rest
  }

  return result
}

/** 로컬 시(hour, 0~23)를 시간대 버킷으로. 아침5-11 / 낮11-17 / 저녁17-22 / 그 외 밤. */
export function hourToTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

/** JS Date의 요일(0=일~6=토)을 평일/주말로. 토·일만 주말. */
export function weekdayToDayPreference(weekday: number): DayPreference {
  return weekday === 0 || weekday === 6 ? 'weekend' : 'weekday'
}

export const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  morning: '아침',
  afternoon: '낮',
  evening: '저녁',
  night: '밤',
}

export const DAY_PREFERENCE_LABEL: Record<DayPreference, string> = {
  weekday: '평일',
  weekend: '주말',
}

export interface SmartChip {
  key: string
  label: string
  emoji?: string
}

/**
 * 파싱 결과를 사람이 읽는 칩으로 변환.
 * 카테고리 라벨은 web의 CATEGORY_META에 있으므로 옵션 콜백으로 주입(없으면 키 그대로).
 */
export function describeParse(
  parsed: SmartSearchParse,
  categoryLabel?: (c: PartyCategory) => string
): SmartChip[] {
  const chips: SmartChip[] = []
  if (parsed.category)
    chips.push({
      key: 'category',
      label: categoryLabel ? categoryLabel(parsed.category) : parsed.category,
      emoji: '🏷️',
    })
  if (parsed.area) chips.push({ key: 'area', label: parsed.area, emoji: '📍' })
  if (parsed.format)
    chips.push({ key: 'format', label: PARTY_FORMAT_LABEL[parsed.format], emoji: '🎲' })
  if (parsed.capacity != null)
    chips.push({ key: 'capacity', label: `${parsed.capacity}명`, emoji: '👥' })
  if (parsed.dayPreference)
    chips.push({
      key: 'dayPreference',
      label: DAY_PREFERENCE_LABEL[parsed.dayPreference],
      emoji: '📅',
    })
  if (parsed.timeOfDay)
    chips.push({ key: 'timeOfDay', label: TIME_OF_DAY_LABEL[parsed.timeOfDay], emoji: '🕒' })
  if (parsed.q) chips.push({ key: 'q', label: `"${parsed.q}"`, emoji: '🔍' })
  return chips
}

/**
 * 파싱 결과를 URL 쿼리 파라미터 맵으로 직렬화 (순수·DOM 비의존).
 * PartyQuerySchema(category·area)와 호환되며, 나머지는 클라이언트 보조 필터/검색어로 사용한다.
 * 소비 측에서 `new URLSearchParams(toSearchParams(parsed))`로 바로 쓸 수 있다.
 */
export function toSearchParams(parsed: SmartSearchParse): Record<string, string> {
  const sp: Record<string, string> = {}
  if (parsed.category) sp.category = parsed.category
  if (parsed.area) sp.area = parsed.area
  if (parsed.format) sp.format = parsed.format
  if (parsed.capacity != null) sp.capacity = String(parsed.capacity)
  if (parsed.dayPreference) sp.day = parsed.dayPreference
  if (parsed.timeOfDay) sp.time = parsed.timeOfDay
  if (parsed.q) sp.q = parsed.q
  return sp
}
