import EmptyState from '@components/feedback/EmptyState'
import PartyCardSkeletonGrid from '@components/feedback/PartyCardSkeleton'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Icon } from '@components/ui/Icon/Icon'
import { usePageMeta } from '@hooks/usePageMeta'
import { recommendParties, userToContext } from '@rotifolk/shared'
import { useAuthStore } from '@store/authStore'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'motion/react'
import { Link, useLocation } from 'react-router-dom'

import { buildHomePulse } from './home-pulse'
import styles from './HomePage.module.css'

import type { PartySummary } from '@rotifolk/shared'

import { ALL_CATEGORIES, CATEGORY_META } from '@/domains/categories/meta'
import { PartyCard } from '@/domains/parties/PartyCard'
import { useParties } from '@/domains/parties/queries'
import { useRecents } from '@/domains/recents/useRecents'
import { api } from '@/infrastructure/api'

export default function HomePage() {
  usePageMeta({
    title: 'Rotifolk · 로테이션 파티 매칭',
    withBrand: false,
    description: '와인·커피·차·위스키 로테이션 모임. 모르는 사람들이 진짜 친해지는 5분 라운드.',
  })
  const location = useLocation()
  const me = useAuthStore((s) => s.user)
  const { data: parties, isLoading } = useParties({ status: 'open', pageSize: 6 })
  const { data: nowParties } = useQuery({
    queryKey: ['happening-now'],
    queryFn: () => api.get<PartySummary[]>('parties/happening-now'),
    refetchInterval: 30_000,
  })
  const currentPath = `${location.pathname}${location.search}${location.hash}` || '/'
  const encodedCurrentPath = encodeURIComponent(currentPath)
  const tutorialHref = `/tutorial?from=${encodedCurrentPath}`
  const communityHref = `/community?guide=1&from=${encodedCurrentPath}`
  const reduce = useReducedMotion() ?? false
  const recommended = me && parties ? recommendParties(parties.items, userToContext(me), 3) : []
  const { items: recents } = useRecents()
  const recentTop = recents.slice(0, 6)
  const pulse = buildHomePulse({
    openParties: parties?.items ?? [],
    liveParties: nowParties ?? [],
  })
  const demoLoginHref = `/login?demo=1&auto=1&from=${encodedCurrentPath}`
  const nextPartyTime = pulse.nextParty
    ? new Date(pulse.nextParty.startAt).toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '새 라운드 준비 중'

  const liveParties = nowParties ?? []
  const hasLive = liveParties.length > 0

  return (
    <div>
      {/* ===== HERO — sunset aperitivo, one clear primary path ===== */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroSky} aria-hidden="true">
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
              <Link to="/discover" className={styles.heroCtaLink}>
                <Button variant="primary" size="xl">
                  오늘의 파티
                </Button>
              </Link>
              <Link to="/quick" className={styles.heroCtaLink}>
                <Button variant="outline" size="xl" leftIcon={<Icon name="bolt" />}>
                  즉석 모임
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

      {/* ===== Onboarding — demoted to a slim assistive strip under the hero ===== */}
      <nav className={`container ${styles.onboard}`} aria-label="처음이라면 이렇게 시작해요">
        <Link to={tutorialHref} className={styles.onboardLink}>
          <span className={styles.onboardIcon} aria-hidden="true">
            <Icon name="compass" />
          </span>
          <span className={styles.onboardBody}>
            <strong>튜토리얼 다시 보기</strong>
            <small>8단계로 핵심 흐름 확인</small>
          </span>
          <Icon name="chevron-right" className={styles.onboardArrow} aria-hidden="true" />
        </Link>
        <Link to={communityHref} className={styles.onboardLink}>
          <span className={styles.onboardIcon} aria-hidden="true">
            <Icon name="chat" />
          </span>
          <span className={styles.onboardBody}>
            <strong>커뮤니티 첫 질문</strong>
            <small>템플릿으로 1분 작성</small>
          </span>
          <Icon name="chevron-right" className={styles.onboardArrow} aria-hidden="true" />
        </Link>
        <Link to={demoLoginHref} className={styles.onboardLink}>
          <span className={styles.onboardIcon} aria-hidden="true">
            <Icon name="sparkle" />
          </span>
          <span className={styles.onboardBody}>
            <strong>데모로 즉시 체험</strong>
            <small>가입 없이 핵심 플로우</small>
          </span>
          <Icon name="chevron-right" className={styles.onboardArrow} aria-hidden="true" />
        </Link>
      </nav>

      {/* ===== Live signal — pulse data folded into ONE calm strip + cards ===== */}
      {hasLive ? (
        <section className={`container ${styles.section}`} aria-labelledby="now-title">
          <div className={styles.liveStrip} role="status" aria-label="지금 흐르는 라운드 신호">
            <span className={styles.liveTag}>
              <span className={styles.liveDot} aria-hidden="true" />
              LIVE
            </span>
            <span className={styles.liveFact}>
              <Icon name="live" aria-hidden="true" />
              {pulse.liveCount}개 진행 중
            </span>
            <span className={styles.liveFact}>
              <Icon name="moon" aria-hidden="true" />
              {pulse.openCount}개 모집
            </span>
            <span className={styles.liveFact}>
              <Icon name="clock" aria-hidden="true" />
              다음 {nextPartyTime}
            </span>
            {pulse.leadingCategory ? (
              <span className={styles.liveFact}>
                <Icon name="flame" aria-hidden="true" />
                {pulse.leadingCategory.label} {pulse.leadingCategory.count}개
              </span>
            ) : null}
          </div>

          <header className={styles.sectionHead}>
            <h2 id="now-title" className={styles.sectionTitle}>
              <span className={styles.liveDot} aria-hidden="true" />
              지금 진행 중
            </h2>
            <Link to="/discover?status=live" className={styles.sectionAction}>
              전체 보기
              <Icon name="chevron-right" aria-hidden="true" />
            </Link>
          </header>
          <div className={styles.partyGrid}>
            {liveParties.slice(0, 3).map((p) => (
              <PartyCard key={p.id} party={p} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ===== Categories — brand identity, emoji kept ===== */}
      <section className={`container ${styles.section}`} aria-labelledby="cats-title">
        <header className={styles.sectionHead}>
          <div>
            <h2 id="cats-title" className={styles.sectionTitle}>
              오늘은 어떤 잔으로
            </h2>
            <p className={styles.sectionSub}>카테고리마다 라운드 컨셉과 분위기가 달라요.</p>
          </div>
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

      {/* ===== For-you recommendations ===== */}
      {recommended.length > 0 && (
        <section className={`container ${styles.section}`} aria-labelledby="rec-title">
          <header className={styles.sectionHead}>
            <div>
              <h2 id="rec-title" className={styles.sectionTitle}>
                <Badge tone="gold" size="sm">
                  FOR YOU
                </Badge>
                {me?.nickname}님께 어울리는 모임
              </h2>
              <p className={styles.sectionSub}>관심사 · MBTI · 카테고리 기반 추천</p>
            </div>
          </header>
          <div className={styles.partyGrid}>
            {recommended.map((p) => (
              <PartyCard key={p.id} party={p} />
            ))}
          </div>
        </section>
      )}

      {/* ===== Open for sign-up ===== */}
      <section className={`container ${styles.section}`} aria-labelledby="open-title">
        <header className={styles.sectionHead}>
          <div>
            <h2 id="open-title" className={styles.sectionTitle}>
              지금 모집 중
            </h2>
            <p className={styles.sectionSub}>첫 잔을 함께 열 사람을 찾는 라운드</p>
          </div>
          <Link to="/discover" className={styles.sectionAction}>
            전체 보기
            <Icon name="chevron-right" aria-hidden="true" />
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
                  즉석 모임
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

      {/* ===== How it works — explanatory, demoted below the listings ===== */}
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

      {/* ===== Recently viewed — slim personal rail ===== */}
      {recentTop.length > 0 && (
        <section className={`container ${styles.section}`} aria-labelledby="recent-title">
          <header className={styles.sectionHead}>
            <div>
              <h2 id="recent-title" className={styles.sectionTitle}>
                최근 본 모임
              </h2>
              <p className={styles.sectionSub}>이 기기에만 저장되는 방문 기록</p>
            </div>
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
                  style={
                    {
                      ['--chip-accent' as never]: cat?.accentHex ?? 'var(--color-primary)',
                    } as never
                  }
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

      {/* ===== Host CTA ===== */}
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

/**
 * SunsetGlasses — decorative aperitivo glasses catching the sunset behind the
 * hero copy. Purely ornamental (aria-hidden), hidden on narrow widths.
 */
function CellarBottles({ reduce }: { reduce: boolean }) {
  const glasses = [
    { left: '12%', delay: 0, height: 150 },
    { left: '26%', delay: 0.5, height: 190 },
    { left: '40%', delay: 0.9, height: 140 },
    { left: '66%', delay: 0.7, height: 176 },
    { left: '80%', delay: 0.3, height: 158 },
    { left: '92%', delay: 1, height: 184 },
  ]
  return (
    <div className={styles.glasses}>
      {glasses.map((g, i) => (
        <motion.span
          key={i}
          className={styles.glass}
          style={{ left: g.left, height: g.height }}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: g.delay, duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
        >
          <span className={styles.glassBowl} />
          <span className={styles.glassStem} />
        </motion.span>
      ))}
    </div>
  )
}
