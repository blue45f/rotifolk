// 오늘의 인기남/인기녀 — 받은 호감(라운드 좋아요 + 최종 투표) 누적 집계.
// 프라이버시: 성별별 최다 1인만 축하형으로 공개. 개인별 카운트는 노출하지 않음(0표 보호).

import type { Gender } from '../domain/user'

/** 받은 호감 한 건 (방향성 투표의 수신측). */
export interface PopularityVote {
  toUserId: string
}

export interface PopularityCandidate {
  userId: string
  gender?: Gender | null
}

export interface PopularEntry {
  userId: string
  likes: number
}

export interface PopularityResult {
  /** 오늘의 인기남 (남성 중 최다 호감, 1표 이상). */
  popularMale: PopularEntry | null
  /** 오늘의 인기녀 (여성 중 최다 호감, 1표 이상). */
  popularFemale: PopularEntry | null
}

/**
 * 받은 호감을 집계해 성별별 최다 득표 1인을 선정.
 * 동률이면 candidates 배열 순서가 앞선 사람이 우선(결정적).
 */
export function computePopularity(
  votes: readonly PopularityVote[],
  candidates: readonly PopularityCandidate[],
): PopularityResult {
  const likes = new Map<string, number>()
  for (const v of votes) {
    likes.set(v.toUserId, (likes.get(v.toUserId) ?? 0) + 1)
  }

  let popularMale: PopularEntry | null = null
  let popularFemale: PopularEntry | null = null

  for (const c of candidates) {
    const count = likes.get(c.userId) ?? 0
    if (count <= 0) continue
    if (c.gender === 'male') {
      if (!popularMale || count > popularMale.likes) {
        popularMale = { userId: c.userId, likes: count }
      }
    } else if (c.gender === 'female') {
      if (!popularFemale || count > popularFemale.likes) {
        popularFemale = { userId: c.userId, likes: count }
      }
    }
  }

  return { popularMale, popularFemale }
}
