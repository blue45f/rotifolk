import type { ConnectionChannel, ContactExchangeChannelState, MatchScope } from '../domain/party'
import type { ContactExchangePolicy } from '../domain/party'
import { CONNECTION_CHANNEL_ORDER } from '../domain/party'
import { findMutualMatches, type RawVote } from './final-match'

export type ConnectionResult = 'mutual' | 'top-pick' | 'all'

export interface Connection {
  userAId: string
  userBId: string
  result: ConnectionResult
}

export interface ComputeConnectionsInput {
  scope: MatchScope
  /** 방향성 투표/호감 (mid·final). 같은 쌍이 여러 번 = 누적 호감. */
  votes: readonly RawVote[]
  /** all-participants 범위에서 사용할 전체 참가자 */
  allUserIds?: readonly string[]
  /** top-n 범위에서 1인당 최대 연결 수 */
  maxPerPerson?: number
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function uniqueUserIds(votes: readonly RawVote[]): string[] {
  const set = new Set<string>()
  for (const v of votes) {
    set.add(v.fromUserId)
    set.add(v.toUserId)
  }
  return [...set]
}

/**
 * 매칭 범위 정책에 따라 최종 연결을 계산.
 * - mutual-only: 서로 지목한 상호 매칭만
 * - top-n: 각자 누적 호감 상위 N명까지 연결 (상호 아니어도)
 * - all-participants: 참가자 전원을 서로 연결
 */
export function computeConnections(input: ComputeConnectionsInput): Connection[] {
  const { scope, votes } = input

  if (scope === 'mutual-only') {
    return findMutualMatches(votes).map((m) => ({ ...m, result: 'mutual' as const }))
  }

  if (scope === 'all-participants') {
    const ids = [...(input.allUserIds ?? uniqueUserIds(votes))]
    const out: Connection[] = []
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        out.push({ userAId: ids[i], userBId: ids[j], result: 'all' })
      }
    }
    return out
  }

  if (scope === 'mutual-plus-top-n') {
    const mutual = computeMutualConnections(votes)
    const top = computeTopN(input)
    const seen = new Set<string>(mutual.map((c) => pairKey(c.userAId, c.userBId)))
    return [...mutual, ...top.filter((c) => !seen.has(pairKey(c.userAId, c.userBId)))]
  }

  // top-n: 각 사용자의 호감 상위 N명 (아래 함수와 분리)
  return computeTopN(input)
}

function computeTopN(input: ComputeConnectionsInput): Connection[] {
  const { votes } = input
  const max = Math.max(1, input.maxPerPerson ?? 3)
  const byFrom = new Map<string, Map<string, number>>()
  for (const v of votes) {
    if (!byFrom.has(v.fromUserId)) byFrom.set(v.fromUserId, new Map())
    const m = byFrom.get(v.fromUserId)!
    m.set(v.toUserId, (m.get(v.toUserId) ?? 0) + 1)
  }
  const seen = new Set<string>()
  const out: Connection[] = []
  for (const [from, targets] of byFrom) {
    const top = [...targets.entries()].sort((a, b) => b[1] - a[1]).slice(0, max)
    for (const [to] of top) {
      const key = pairKey(from, to)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        userAId: from < to ? from : to,
        userBId: from < to ? to : from,
        result: 'top-pick',
      })
    }
  }
  return out
}

function computeMutualConnections(votes: readonly RawVote[]): Connection[] {
  return findMutualMatches(votes).map((m) => ({ ...m, result: 'mutual' as const }))
}

// ──────────────────────── 연결 채널 공개 (상호 동의) ────────────────────────

/** 한 사용자의 채널별 공개 동의 + 핸들 값. */
export interface UserContact {
  shareKakao?: boolean
  kakaoId?: string | null
  shareInstagram?: boolean
  instagram?: string | null
  shareContact?: boolean
  phone?: string | null
}

export interface RevealedChannel {
  channel: ConnectionChannel
  /** chat은 앱 내에서 바로 열리므로 null. 그 외는 상대 핸들(양쪽 동의 시에만). */
  handle: string | null
  /** 요청 승인형 정책에서 UI가 표시할 채널 상태. 기존 정책은 생략 가능. */
  state?: ContactExchangeChannelState
  requestId?: string | null
  requestedBy?: 'me' | 'them' | null
  canRequest?: boolean
}

function handleFor(channel: ConnectionChannel, them: UserContact): string | null {
  if (channel === 'kakao') return them.kakaoId ?? null
  if (channel === 'instagram') return them.instagram ?? null
  if (channel === 'phone') return them.phone ?? null
  return null
}

function bothConsent(channel: ConnectionChannel, me: UserContact, them: UserContact): boolean {
  if (channel === 'chat') return true // 인앱 채팅은 항상 안전 — 동의 불필요
  if (channel === 'kakao') return !!me.shareKakao && !!them.shareKakao
  if (channel === 'instagram') return !!me.shareInstagram && !!them.shareInstagram
  if (channel === 'phone') return !!me.shareContact && !!them.shareContact
  return false
}

/**
 * 매칭된 상대에게 실제로 열리는 연결 채널을 계산.
 * 호스트가 제공한 채널(offered) 중, 양쪽이 공개 동의한 채널만 (double opt-in).
 * 핸들이 필요한 채널(kakao/instagram/phone)은 상대 핸들이 있을 때만 노출.
 */
export function resolveSharedChannels(
  offered: readonly ConnectionChannel[],
  me: UserContact,
  them: UserContact,
): RevealedChannel[] {
  const offeredSet = new Set(offered)
  const out: RevealedChannel[] = []
  for (const channel of CONNECTION_CHANNEL_ORDER) {
    if (!offeredSet.has(channel)) continue
    if (!bothConsent(channel, me, them)) continue
    const handle = handleFor(channel, them)
    if (channel !== 'chat' && !handle) continue // 핸들 없으면 노출 불가
    out.push({ channel, handle })
  }
  return out
}

export function resolveChannelsByPolicy(
  policy: ContactExchangePolicy,
  offered: readonly ConnectionChannel[],
  me: UserContact,
  them: UserContact,
): RevealedChannel[] {
  switch (policy) {
    case 'chat-only': {
      return offered.includes('chat') ? [{ channel: 'chat', handle: null }] : []
    }
    case 'open-after-match': {
      const out: RevealedChannel[] = []
      for (const channel of CONNECTION_CHANNEL_ORDER) {
        if (!offered.includes(channel)) continue
        if (channel === 'chat') {
          out.push({ channel, handle: null })
          continue
        }
        const handle = handleFor(channel, them)
        if (!handle) continue
        out.push({ channel, handle })
      }
      return out
    }
    case 'request-approval': {
      // 연락처 요청·승인 방식은 매칭 직후 바로 노출하지 않고, 별도 승인 플로우에서 처리.
      // 기본 채널은 앱 내 채팅만 공개 상태를 유지.
      return offered.includes('chat') ? [{ channel: 'chat', handle: null }] : []
    }
    case 'mutual-consent':
    default:
      return resolveSharedChannels(offered, me, them)
  }
}

// ──────────────────────── 회피 제외 ────────────────────────

function pairKeyOf(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** 마주치면 안 되는 쌍(forbidden pairs)을 최종 연결에서 제거 — 회피 하드 보장. */
export function filterConnectionsExcluding(
  connections: readonly Connection[],
  forbiddenPairs: readonly (readonly [string, string])[],
): Connection[] {
  if (forbiddenPairs.length === 0) return [...connections]
  const blocked = new Set(forbiddenPairs.map(([a, b]) => pairKeyOf(a, b)))
  return connections.filter((c) => !blocked.has(pairKeyOf(c.userAId, c.userBId)))
}
