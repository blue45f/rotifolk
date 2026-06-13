import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import type { PartySummary } from '@rotifolk/shared'
import { recommendParties, userToContext } from '@rotifolk/shared'
import { useParties } from '@features/parties/queries'
import { ALL_CATEGORIES, CATEGORY_META } from '@features/categories/meta'
import { PartyCard } from '@features/parties/PartyCard'
import { Button } from '@components/ui/Button/Button'
import { Badge } from '@components/ui/Badge/Badge'
import { Icon } from '@components/ui/Icon/Icon'
import PartyCardSkeletonGrid from '@components/feedback/PartyCardSkeleton'
import EmptyState from '@components/feedback/EmptyState'
import { useAuthStore } from '@store/authStore'
import { useRecents } from '@features/recents/useRecents'
import { usePageMeta } from '@hooks/usePageMeta'
import { api } from '@services/api'
import styles from './HomePage.module.css'

export default function HomePage() {
  usePageMeta({
    title: 'Rotifolk · 로테이션 파티 매칭',
    withBrand: false,
    description: '와인·커피·차·위스키 로테이션 모임. 모르는 사람들이 진짜 친해지는 5분 라운드.',
  })
  const me = useAuthStore((s) => s.user)
  const { data: parties, isLoading } = useParties({ status: 'open', pageSize: 6 })
  const { data: nowParties } = useQuery({
    queryKey: ['happening-now'],
    queryFn: () => api.get<PartySummary[]>('parties/happening-now'),
    refetchInterval: 30_000,
  })
  const reduce = useReducedMotion() ?? false
  const recommended = me && parties ? recommendParties(parties.items, userToContext(me), 3) : []
  const { items: recents } = useRecents()
  const recentTop = recents.slice(0, 6)

  return (
    <div>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.cellar} aria-hidden="true">
          <span className={styles.cellarVeil} />
          <CellarBottles reduce={reduce} />
        </div>

        <div className={`container ${styles.heroInner}`}>
          <motion.div
            className={styles.heroCopy}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
          >
            <span className={styles.kicker}>로테이션 파티 매칭 · 와인 · 커피 · 차</span>
            <h1 id="hero-title" className={styles.heroTitle}>
              한 모금이 끝나기 전,
              <br />
              다음 자리로.
            </h1>
            <p className={styles.heroLead}>
              호스트가 짠 5분 라운드. 모르는 사람과 한 잔, 새로운 와인 한 모금. 마지막 라운드에
              서로를 고른 사람만 1:1로 이어집니다.
            </p>
            <div className={styles.heroCta}>
              <Link to="/discover">
                <Button variant="primary" size="xl">
                  오늘의 파티 찾기
                </Button>
              </Link>
              <Link to="/quick">
                <Button variant="outline" size="xl" leftIcon={<Icon name="bolt" />}>
                  즉석 모임 열기
                </Button>
              </Link>
            </div>
            <ul className={styles.heroProof}>
              <li>
                <span>5</span>분 라운드
              </li>
              <li className={styles.proofDot} aria-hidden="true" />
              <li>
                <span>5:5</span> 이성 매칭
              </li>
              <li className={styles.proofDot} aria-hidden="true" />
              <li>실명 노출 없이 아바타 모드</li>
            </ul>
          </motion.div>
        </div>

        <div className={styles.heroEdge} aria-hidden="true" />
      </section>

      {nowParties && nowParties.length > 0 && (
        <>
          <div className={styles.tickerStrip} role="status" aria-label="지금 진행 중인 파티">
            <span className={styles.tickerLabel}>
              <span className={styles.liveDot} aria-hidden="true" />
              LIVE
            </span>
            <div className={styles.tickerTrack}>
              {[...nowParties, ...nowParties].map((p, i) => (
                <Link to={`/parties/${p.id}`} key={`${p.id}-${i}`} className={styles.tickerItem}>
                  <strong>{p.title}</strong>
                  <span>
                    · {p.venueArea} · {p.currentParticipants}/{p.maxParticipants}명
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <section className={`container ${styles.section}`} aria-labelledby="now-title">
            <header className={styles.sectionHead}>
              <h2 id="now-title" className={styles.sectionTitle}>
                <span className={styles.liveDot} aria-hidden="true" />
                지금 진행 중
              </h2>
              <Link to="/discover?status=live" className={styles.sectionAction}>
                전체 보기 →
              </Link>
            </header>
            <div className={styles.partyGrid}>
              {nowParties.slice(0, 3).map((p) => (
                <PartyCard key={p.id} party={p} />
              ))}
            </div>
          </section>
        </>
      )}

      <section className={`container ${styles.section}`} aria-labelledby="open-title">
        <header className={styles.sectionHead}>
          <h2 id="open-title" className={styles.sectionTitle}>
            지금 모집 중
          </h2>
          <Link to="/discover" className={styles.sectionAction}>
            전체 보기 →
          </Link>
        </header>
        {isLoading ? (
          <PartyCardSkeletonGrid />
        ) : !parties || parties.items.length === 0 ? (
          <EmptyState
            emoji="🌙"
            title="아직 모집 중인 모임이 없어요"
            description="가장 먼저 한 잔을 열어보는 건 어때요?"
            action={
              <Link to="/quick">
                <Button variant="primary" leftIcon={<Icon name="bolt" />}>
                  즉석 모임 열기
                </Button>
              </Link>
            }
          />
        ) : (
          <div className={styles.partyGrid}>
            {parties.items.map((p) => (
              <PartyCard key={p.id} party={p} />
            ))}
          </div>
        )}
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="cats-title">
        <header className={styles.sectionHead}>
          <h2 id="cats-title" className={styles.sectionTitle}>
            오늘은 어떤 잔으로
          </h2>
          <p className={styles.sectionSub}>카테고리마다 라운드 컨셉과 분위기가 달라요.</p>
        </header>
        <div className={styles.catRail}>
          {ALL_CATEGORIES.filter((c) => c.value !== 'custom').map((cat) => (
            <Link
              key={cat.value}
              to={`/discover?category=${cat.value}`}
              className={styles.catTile}
              style={{ ['--tile-bg' as never]: cat.bgGradient } as never}
            >
              <span className={styles.tileSurface} aria-hidden="true" />
              <span className={styles.tileEmoji} aria-hidden="true">
                {cat.emoji}
              </span>
              <span className={styles.tileBody}>
                <strong>{cat.label}</strong>
                <small>{cat.description}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {recommended.length > 0 && (
        <section className={`container ${styles.section}`} aria-labelledby="rec-title">
          <header className={styles.sectionHead}>
            <h2 id="rec-title" className={styles.sectionTitle}>
              <Badge tone="gold" size="sm">
                FOR YOU
              </Badge>
              {me?.nickname}님께 어울리는 모임
            </h2>
            <p className={styles.sectionSub}>관심사 · MBTI · 카테고리 기반 추천</p>
          </header>
          <div className={styles.partyGrid}>
            {recommended.map((p) => (
              <PartyCard key={p.id} party={p} />
            ))}
          </div>
        </section>
      )}

      {recentTop.length > 0 && (
        <section className={`container ${styles.section}`} aria-labelledby="recent-title">
          <header className={styles.sectionHead}>
            <h2 id="recent-title" className={styles.sectionTitle}>
              최근 본 모임
            </h2>
            <p className={styles.sectionSub}>이 기기에만 저장되는 방문 기록</p>
          </header>
          <div className={styles.recentRail} role="list">
            {recentTop.map((r) => {
              const cat = CATEGORY_META[r.category as keyof typeof CATEGORY_META]
              return (
                <Link
                  key={r.id}
                  to={`/parties/${r.id}`}
                  className={styles.recentChip}
                  role="listitem"
                  style={{ ['--chip-accent' as never]: cat?.accentHex ?? '#7A1F3D' } as never}
                >
                  <span className={styles.recentEmoji} aria-hidden="true">
                    {cat?.emoji ?? '🍷'}
                  </span>
                  <span className={styles.recentBody}>
                    <strong>{r.title}</strong>
                    <small>{cat?.shortLabel ?? r.category}</small>
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section className={`container ${styles.section}`} aria-labelledby="how-title">
        <header className={styles.sectionHead}>
          <h2 id="how-title" className={styles.sectionTitle}>
            이렇게 흘러갑니다
          </h2>
        </header>
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepIndex}>01</span>
            <h3>체크인 · 아바타</h3>
            <p>도착하면 좌석 안내. 닉네임과 아바타만으로 충분합니다.</p>
          </li>
          <li>
            <span className={styles.stepIndex}>02</span>
            <h3>라운드 회전</h3>
            <p>5분마다 자동으로 다음 자리. 한 잔에 한 사람.</p>
          </li>
          <li>
            <span className={styles.stepIndex}>03</span>
            <h3>질문 카드 · 라이브 퀴즈</h3>
            <p>4단계 깊이의 카드가 어색함을 녹입니다.</p>
          </li>
          <li>
            <span className={styles.stepIndex}>04</span>
            <h3>최종 매칭</h3>
            <p>서로를 고른 사람만 1:1 채팅이 열립니다.</p>
          </li>
        </ol>
      </section>

      <section className={`container ${styles.ctaSection}`} aria-labelledby="host-cta">
        <div className={styles.ctaCard}>
          <Badge tone="gold" size="md">
            호스트가 되어볼래요?
          </Badge>
          <h2 id="host-cta">한 모임을 여는 데 5분이면 충분해요.</h2>
          <p>제휴 라운지 · 와인바 · 카페 디렉터리에서 장소를 고르고, 라운드 컨셉만 정하세요.</p>
          <Link to="/host/create">
            <Button variant="gold" size="lg">
              파티 개설 시작
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

function CellarBottles({ reduce }: { reduce: boolean }) {
  const bottles = [
    { left: '8%', delay: 0, height: 220 },
    { left: '22%', delay: 0.4, height: 260 },
    { left: '36%', delay: 0.8, height: 200 },
    { left: '64%', delay: 0.6, height: 240 },
    { left: '78%', delay: 0.3, height: 220 },
    { left: '90%', delay: 0.9, height: 250 },
  ]
  return (
    <div className={styles.bottles}>
      {bottles.map((b, i) => (
        <motion.span
          key={i}
          className={styles.bottle}
          style={{ left: b.left, height: b.height }}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: b.delay, duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
        >
          <span className={styles.bottleNeck} />
          <span className={styles.bottleLabel} />
        </motion.span>
      ))}
    </div>
  )
}
