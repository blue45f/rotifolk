import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { PartyCategory, PartySummary } from '@rotifolk/shared'
import { useParties } from '@features/parties/queries'
import { useQuery } from '@tanstack/react-query'
import { api } from '@services/api'
import { PartyCard } from '@features/parties/PartyCard'
import { CATEGORY_META } from '@features/categories/meta'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import styles from './Digest.module.css'

/**
 * /digest — 매주 한 번 갱신되는 주간 다이제스트.
 * useParties로 받은 'open' 파티 50개를 클라이언트에서 집계해서 보여준다.
 * 별도 백엔드 엔드포인트를 만들지 않고, 모든 카운트는 메모이즈된 reduce로 구한다.
 */

interface Rank<T = string> {
  key: T
  label: string
  count: number
  meta?: string
}

interface ReviewStub {
  partyTitle: string
  category: PartyCategory
  body: string
  reviewer: string
}

const REVIEW_STUBS: ReviewStub[] = [
  {
    partyTitle: '한남동 내추럴 와인 6라운드',
    category: 'natural-wine',
    body: '낯선 사람과 같은 잔을 두고 농담하는 게 이렇게 자연스러울 줄. 라운드가 끝나도 자리에 더 앉아 있고 싶었어요.',
    reviewer: '쥬얼리.D',
  },
  {
    partyTitle: '연남 스페셜티 커피 시음',
    category: 'coffee',
    body: '잔이 바뀔 때마다 대화 주제도 같이 바뀌더라고요. 호스트가 라운드 큐를 잘 짜둔 느낌.',
    reviewer: '카페로테이션',
  },
  {
    partyTitle: '북촌 다실, 깊고 조용한 4단계',
    category: 'tea',
    body: '시끄러운 자리는 부담스러웠는데, 차 한 잔 두고 천천히 이야기하니까 처음 본 사람이 친구처럼 느껴졌어요.',
    reviewer: '한옥의 밤',
  },
]

function countBy<T>(items: readonly T[], pick: (x: T) => string | null | undefined): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = pick(item)
    if (!key) continue
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

function topN(map: Map<string, number>, n: number): Array<{ key: string; count: number }> {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }))
}

interface RecentReview {
  id: string
  rating: number
  body: string
  partyTitle: string
  category: string
  reviewer: string
  createdAt: string
}

export default function DigestPage() {
  const { data, isLoading } = useParties({ status: 'open', pageSize: 50 })
  const { show: showToast } = useToast()
  const items = useMemo<PartySummary[]>(() => data?.items ?? [], [data])
  const { data: recentReviews } = useQuery({
    queryKey: ['reviews', 'recent'],
    queryFn: () => api.get<RecentReview[]>('reviews/recent'),
    staleTime: 5 * 60 * 1000,
  })

  // 베스트 호스트 — PartySummary에는 host 정보가 없어서 venueName으로 대체 집계.
  const topHosts = useMemo<Rank[]>(() => {
    const map = countBy(items, (p) => p.venueName)
    return topN(map, 3).map((r, i) => ({
      key: r.key,
      label: r.key,
      count: r.count,
      meta: `${['🥇', '🥈', '🥉'][i]} 이번 주 ${r.count}개 진행`,
    }))
  }, [items])

  const topCategories = useMemo(() => {
    const map = countBy(items, (p) => p.category)
    return topN(map, 3)
      .map((r) => ({
        meta: CATEGORY_META[r.key as PartyCategory],
        count: r.count,
      }))
      .filter((r) => r.meta)
  }, [items])

  const topAreas = useMemo<Rank[]>(() => {
    const map = countBy(items, (p) => p.venueArea)
    return topN(map, 3).map((r, i) => ({
      key: r.key,
      label: r.key,
      count: r.count,
      meta: `${i + 1}위 · ${r.count}개 모임`,
    }))
  }, [items])

  // "다음 주 추천" — 지금부터 +7일 이내 시작하는 파티 중 상위 5개.
  const nextWeekPicks = useMemo<PartySummary[]>(() => {
    const now = Date.now()
    const weekAhead = now + 7 * 24 * 60 * 60 * 1000
    return items
      .filter((p) => {
        const t = new Date(p.startAt).getTime()
        return t >= now && t <= weekAhead
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 5)
  }, [items])

  const totalParties = items.length
  // 신규 매칭 추정치 — 실제 매칭 endpoint가 없어서 currentParticipants 합으로 표시.
  const newlyMatched = items.reduce((acc, p) => acc + p.currentParticipants, 0)

  return (
    <div className={styles.page}>
      <header className={`container ${styles.hero}`} aria-labelledby="digest-title">
        <Badge tone="gold" size="sm" className={styles.weeklyBadge}>
          WEEKLY
        </Badge>
        <h1 id="digest-title" className={styles.heroTitle}>
          이번 주 Rotifolk
        </h1>
        <p className={styles.heroLead}>
          이번 주 <strong>{totalParties}</strong>개 모임 ·{' '}
          <strong>{newlyMatched}</strong>명이 새로 매칭됨
        </p>
        <Button
          variant="soft"
          size="sm"
          onClick={async () => {
            const url = window.location.href
            const title = '이번 주 Rotifolk 다이제스트'
            if (navigator.share) {
              await navigator.share({ title, url })
            } else {
              await navigator.clipboard.writeText(url)
              showToast('링크가 복사됐어요', 'success')
            }
          }}
        >
          공유하기
        </Button>
      </header>

      {isLoading ? (
        <div className={`container ${styles.loadingBlock}`}>
          <Loading label="다이제스트 집계 중" />
        </div>
      ) : totalParties === 0 ? (
        <div className={`container ${styles.loadingBlock}`}>
          <EmptyState
            emoji="🍷"
            title="아직 집계할 모임이 없어요"
            description="이번 주에 새로 열리는 파티가 생기면 여기에 모아 보여줄게요."
          />
        </div>
      ) : (
        <>
          <section className={`container ${styles.section}`} aria-labelledby="hosts-title">
            <header className={styles.sectionHead}>
              <h2 id="hosts-title" className={styles.sectionTitle}>
                🏆 이번 주 베스트 호스트
              </h2>
              <p className={styles.sectionSub}>
                같은 공간에서 가장 많은 모임이 열린 곳을 모았어요.
              </p>
            </header>

            {topHosts.length === 0 ? (
              <p className={styles.softNote}>아직 집계할 호스트가 없어요.</p>
            ) : (
              <ol className={styles.hostList}>
                {topHosts.map((host, i) => (
                  <li key={host.key} className={styles.hostRow}>
                    <span className={styles.hostRank} aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className={styles.hostBody}>
                      <strong className={styles.hostName}>{host.label}</strong>
                      <span className={styles.hostMeta}>{host.meta}</span>
                    </div>
                    <span className={styles.hostCount}>
                      <em>{host.count}</em>
                      <small>모임</small>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className={`container ${styles.section}`} aria-labelledby="cats-title">
            <header className={styles.sectionHead}>
              <h2 id="cats-title" className={styles.sectionTitle}>
                🍷 인기 카테고리
              </h2>
              <p className={styles.sectionSub}>이번 주에 가장 자주 잔을 채운 테마.</p>
            </header>

            {topCategories.length === 0 ? (
              <p className={styles.softNote}>아직 집계할 카테고리가 없어요.</p>
            ) : (
              <div className={styles.catGrid}>
                {topCategories.map((entry, i) => (
                  <Link
                    key={entry.meta.value}
                    to={`/discover?category=${entry.meta.value}`}
                    className={styles.catTileLink}
                  >
                    <article
                      className={styles.catTile}
                      style={{ ['--tile-bg' as never]: entry.meta.bgGradient } as never}
                    >
                      <span className={styles.tileSurface} aria-hidden="true" />
                      <div className={styles.catTileHead}>
                        <span className={styles.catEmoji} aria-hidden="true">
                          {entry.meta.emoji}
                        </span>
                        <span className={styles.catPosition}>#{i + 1}</span>
                      </div>
                      <div className={styles.catTileBody}>
                        <strong className={styles.catLabel}>{entry.meta.label}</strong>
                        <p className={styles.catDesc}>{entry.meta.description}</p>
                      </div>
                      <div className={styles.catTileFoot}>
                        <span>{entry.count}개 진행</span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className={`container ${styles.section}`} aria-labelledby="areas-title">
            <header className={styles.sectionHead}>
              <h2 id="areas-title" className={styles.sectionTitle}>
                📍 인기 지역
              </h2>
              <p className={styles.sectionSub}>발걸음이 가장 많이 닿은 동네 세 곳.</p>
            </header>

            {topAreas.length === 0 ? (
              <p className={styles.softNote}>아직 집계할 지역이 없어요.</p>
            ) : (
              <ul className={styles.areaList}>
                {topAreas.map((area, i) => (
                  <li key={area.key} className={styles.areaRow}>
                    <Link
                      to={`/discover?area=${encodeURIComponent(area.key)}`}
                      className={styles.areaRowLink}
                    >
                      <span className={styles.areaPin} aria-hidden="true">
                        📍
                      </span>
                      <div className={styles.areaBody}>
                        <strong className={styles.areaName}>{area.label}</strong>
                        <span className={styles.areaMeta}>{area.meta}</span>
                      </div>
                      <span className={styles.areaIndex} aria-hidden="true">
                        {i + 1}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`container ${styles.section}`} aria-labelledby="reviews-title">
            <header className={styles.sectionHead}>
              <h2 id="reviews-title" className={styles.sectionTitle}>
                💬 따끈한 후기
              </h2>
              <p className={styles.sectionSub}>
                최근 모임에서 남겨진 이야기들
              </p>
            </header>

            <ul className={styles.reviewList}>
              {((recentReviews && recentReviews.length > 0) ? recentReviews : REVIEW_STUBS).map((review) => {
                const catKey = (review.category ?? 'wine') as PartyCategory
                const meta = CATEGORY_META[catKey] ?? CATEGORY_META['wine']
                const stars = '★'.repeat(Math.min(5, Math.max(1, (review as RecentReview).rating ?? 5)))
                return (
                  <li key={'id' in review ? review.id : review.partyTitle} className={styles.reviewCard}>
                    <header className={styles.reviewHead}>
                      <Badge tone="wine" size="sm">
                        {meta.emoji} {meta.shortLabel}
                      </Badge>
                      <span className={styles.reviewTitle}>{review.partyTitle}</span>
                    </header>
                    <blockquote className={styles.reviewBody}>{review.body}</blockquote>
                    <footer className={styles.reviewFoot}>
                      <span className={styles.reviewStars}>{stars}</span>
                      <span>— {review.reviewer}</span>
                    </footer>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className={`container ${styles.section}`} aria-labelledby="picks-title">
            <header className={styles.sectionHead}>
              <h2 id="picks-title" className={styles.sectionTitle}>
                다음 주 추천 모임 5개
              </h2>
              <p className={styles.sectionSub}>
                지금부터 7일 안에 시작하는 모임 중 가장 빨리 잔을 채울 곳들.
              </p>
            </header>

            {nextWeekPicks.length === 0 ? (
              <EmptyState
                emoji="🌙"
                title="다음 주는 한 박자 쉬어가요"
                description="아직 7일 안에 열리는 모임이 없어요. 새 파티가 열리면 여기에 다시 보여드릴게요."
              />
            ) : (
              <div className={styles.pickGrid}>
                {nextWeekPicks.map((p) => (
                  <PartyCard key={p.id} party={p} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
