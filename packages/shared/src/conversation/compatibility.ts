// 서로 간의 궁합 운세 — MBTI · 공통 관심사 + 결정적 시드로 재미있게(과학 아님).

export interface CompatInput {
  mbti?: string | null
  interests?: readonly string[]
  birthYear?: number | null
}

export interface CompatResult {
  /** 0~100 궁합 점수 */
  score: number
  title: string
  blurb: string
  /** 점수에 기여한 요소 설명 */
  factors: string[]
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/** 문자열 → 결정적 해시 (Date/random 없이 일관된 지터용). */
function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/** 띠(12지) 일치/삼합 같은 가벼운 보너스. */
function zodiacBonus(a?: number | null, b?: number | null): number {
  if (!a || !b) return 0
  const za = ((a % 12) + 12) % 12
  const zb = ((b % 12) + 12) % 12
  if (za === zb) return 4 // 같은 띠
  if ((za - zb + 12) % 4 === 0) return 6 // 삼합(4칸 간격)
  return 0
}

/**
 * 두 사람의 궁합 점수 + 한 줄 운세. 결정적(같은 입력=같은 결과).
 * seed로 쌍마다 미세한 변주를 주되 항상 동일하게 재현된다.
 */
export function computeCompatibility(a: CompatInput, b: CompatInput, seed = ''): CompatResult {
  const factors: string[] = []
  let score = 55

  const A = (a.mbti ?? '').toUpperCase()
  const B = (b.mbti ?? '').toUpperCase()
  if (A.length === 4 && B.length === 4) {
    if (A[1] === B[1]) {
      score += 8
      factors.push('세상을 보는 결이 비슷해요')
    }
    if (A[0] !== B[0]) {
      score += 7
      factors.push('에너지가 서로를 채워줘요')
    }
    if (A[2] === B[2]) score += 5
    if (A[3] === B[3]) score += 5
    factors.push(`${A} × ${B}`)
  }

  const shared = (a.interests ?? []).filter((i) => (b.interests ?? []).includes(i))
  if (shared.length > 0) {
    score += Math.min(15, shared.length * 6)
    factors.push(
      `공통 관심사 ${shared.length}개${shared.length ? ` (${shared.slice(0, 3).join(', ')})` : ''}`,
    )
  }

  const zb = zodiacBonus(a.birthYear, b.birthYear)
  if (zb > 0) {
    score += zb
    factors.push('띠 궁합이 좋아요')
  }

  // 쌍마다 결정적 변주 (-5 ~ +5)
  score += (hashSeed(seed) % 11) - 5
  score = clamp(Math.round(score), 30, 99)

  const { title, blurb } = readingFor(score)
  return { score, title, blurb, factors }
}

function readingFor(score: number): { title: string; blurb: string } {
  if (score >= 85) {
    return {
      title: '천생연분 ✨',
      blurb: '오늘 같은 흐름, 흔치 않아요. 마음 가는 대로 한 걸음 더.',
    }
  }
  if (score >= 70) {
    return { title: '좋은 흐름 💞', blurb: '편안하게 통하는 사이. 다음 라운드가 더 기대돼요.' }
  }
  if (score >= 55) {
    return {
      title: '천천히 알아가요 🌱',
      blurb: '서두르지 않아도 좋아요. 질문 한 스푼이면 가까워져요.',
    }
  }
  return { title: '색다른 끌림 🎲', blurb: '다른 듯 끌리는 케미. 의외의 공통점을 찾아보세요.' }
}
