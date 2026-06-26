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
import { useCallback, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { buildHomePulse } from './home-pulse'
import styles from './HomePage.module.css'

import type { PartySummary } from '@rotifolk/shared'

import { ALL_CATEGORIES, CATEGORY_META } from '@/domains/categories/meta'
import { Testimonials } from '@/domains/deskcloud/Testimonials'
import { PartyCard } from '@/domains/parties/PartyCard'
import { useParties } from '@/domains/parties/queries'
import { useRecents } from '@/domains/recents/useRecents'
import { ShareButton } from '@/domains/share/ShareButton'
import { buildInviteUrl } from '@/domains/share/useShare'
import { api } from '@/infrastructure/api'

export default function HomePage() {
  usePageMeta({
    title: 'Rotifolk · 로테이션 파티 매칭',
    withBrand: false,
    description: '와인·커피·차·위스키 로테이션 모임. 모르는 사람들이 진짜 친해지는 5분 라운드.',
  })
  const location = useLocation()
  const navigate = useNavigate()
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
  const greeting = me
    ? (() => {
        const hour = new Date().getHours()
        if (hour < 6) return `${me.nickname}님, 안 좋은 하루는 이미 지나갔어요.`
        if (hour < 12) return `${me.nickname}님, 좋은 아침입니다.`
        if (hour < 18) return `${me.nickname}님, 한잔의 동선이 좋은 오후예요.`
        return `${me.nickname}님, 오늘 밤 좋은 만남을 찾아볼까요?`
      })()
    : '오늘은 어떤 잔으로 첫 시작할까요?'
  const homeIntents = [
    {
      to: '/discover?status=live',
      icon: 'live' as const,
      label: '지금 시작',
      body: '진행 중 파티로 바로 입장',
      stat: `${pulse.liveCount}개`,
    },
    {
      to: '/discover?status=open&sort=soonest',
      icon: 'moon' as const,
      label: '모집 중 먼저 보기',
      body: '곧 시작할 모임이 먼저 보여요',
      stat: `${pulse.openCount}개`,
    },
    {
      to: '/discover?sort=popular',
      icon: 'flame' as const,
      label: '요즘 인기',
      body: '참여율과 분위기가 뜨는 모임',
      stat: '핫',
    },
    {
      to: '/discover?sort=nearby',
      icon: 'pin' as const,
      label: '내 주변',
      body: '동네 기준으로 빠르게 정렬',
      stat: '거리 우선',
    },
    {
      to: '/discover?price=free',
      icon: 'sparkle' as const,
      label: '가성비',
      body: '참가비가 부담 없는 라운드',
      stat: '무료',
    },
  ]

  const liveParties = nowParties ?? []
  const hasLive = liveParties.length > 0

  // "랜덤 한 잔" — 어디로 갈지 모르겠다면 운에 맡긴다. 지금 흐르는 라운드(라이브
  // 우선, 없으면 모집 중)에서 무작위 한 곳으로 데려간다. 순수 클라이언트 동작이라
  // 추가 네트워크 비용 0, 빈 목록이면 둘러보기로 폴백한다.
  const shufflePool = useMemo(() => {
    const live = nowParties ?? []
    return live.length > 0 ? live : (parties?.items ?? [])
  }, [nowParties, parties?.items])
  const handleSurprise = useCallback(() => {
    if (shufflePool.length === 0) {
      navigate('/discover')
      return
    }
    const pick = shufflePool[Math.floor(Math.random() * shufflePool.length)]
    navigate(`/parties/${pick.id}`)
  }, [navigate, shufflePool])

  // 호스트 CTA에서 공유할 "다음 라운드" — 친구를 데려오면 첫 잔이 덜 어색하다.
  const featured = pulse.nextParty ?? parties?.items[0] ?? null

  return (
    <div>
      {/* ===== HERO — sunset aperitivo, one clear primary path ===== */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroSky} aria-hidden="true">
          <SunsetAtmosphere reduce={reduce} />
        </div>

        <div className={`container ${styles.heroInner}`}>
          <motion.div
            className={styles.heroCopy}
            initial={reduce ? false : 'hidden'}
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
            }}
          >
            <motion.span className={styles.kicker} variants={lineVariants}>
              <span className={styles.kickerDot} aria-hidden="true" />
              로테이션 파티 매칭 · 와인 · 커피 · 차
            </motion.span>
            <motion.p className={styles.heroGreeting} variants={lineVariants} aria-live="polite">
              {greeting}
            </motion.p>
            <motion.h1 id="hero-title" className={styles.heroTitle} variants={lineVariants}>
              한 모금이 끝나기 전,
              <br />
              <span className={styles.heroTitleAccent}>다음 자리로.</span>
            </motion.h1>
            <motion.p className={styles.heroLead} variants={lineVariants}>
              호스트가 짠 5분 라운드. 모르는 사람과 한 잔, 새로운 와인 한 모금. 마지막 라운드에
              서로를 고른 사람만 1:1로 이어집니다.
            </motion.p>
            <motion.div className={styles.heroCta} variants={lineVariants}>
              <Link to="/discover" className={styles.heroCtaLink}>
                <Button variant="primary" size="xl" className={styles.heroPrimary}>
                  오늘의 파티
                </Button>
              </Link>
              <Link to="/quick" className={styles.heroCtaLink}>
                <Button variant="outline" size="xl" leftIcon={<Icon name="bolt" />}>
                  즉석 모임
                </Button>
              </Link>
              <button type="button" className={styles.heroDice} onClick={handleSurprise}>
                <span className={styles.heroDiceFace} aria-hidden="true">
                  🎲
                </span>
                랜덤 한 잔
              </button>
            </motion.div>
            <motion.ul className={styles.heroProof} variants={lineVariants}>
              <li>
                <span>5</span>분 라운드
              </li>
              <li className={styles.proofDot} aria-hidden="true" />
              <li>
                <span>5:5</span> 이성 매칭
              </li>
              <li className={styles.proofDot} aria-hidden="true" />
              <li>
                <span>{pulse.averageFillRate}%</span> 평균 참여율
              </li>
              <li className={styles.proofDot} aria-hidden="true" />
              <li>실명 노출 없이 아바타 모드</li>
            </motion.ul>
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

      <section className={`container ${styles.section}`} aria-labelledby="quick-intent-title">
        <header className={styles.sectionHead}>
          <div>
            <h2 id="quick-intent-title" className={styles.sectionTitle}>
              1분 탐색
            </h2>
            <p className={styles.sectionSub}>원하는 상황으로 바로 이동해보세요.</p>
          </div>
        </header>
        <div className={styles.quickIntentGrid} role="list">
          {homeIntents.map((intent) => (
            <Link
              key={intent.label}
              to={intent.to}
              className={styles.quickIntentCard}
              role="listitem"
            >
              <span className={styles.quickIntentIcon} aria-hidden="true">
                <Icon name={intent.icon} />
              </span>
              <span className={styles.quickIntentBody}>
                <strong>{intent.label}</strong>
                <small>{intent.body}</small>
              </span>
              <span className={styles.quickIntentStat}>{intent.stat}</span>
            </Link>
          ))}
        </div>
      </section>

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
          {ALL_CATEGORIES.filter((c) => c.value !== 'custom').map((cat, i) => (
            <Link
              key={cat.value}
              to={`/discover?category=${cat.value}`}
              className={styles.catTile}
              style={
                {
                  ['--tile-bg' as never]: cat.bgGradient,
                  ['--i' as never]: i,
                } as never
              }
            >
              <span className={styles.tileSurface} aria-hidden="true" />
              <span className={styles.tileEmoji} aria-hidden="true">
                {cat.emoji}
              </span>
              <span className={styles.tileBody}>
                <strong>{cat.label}</strong>
                <small>{cat.description}</small>
              </span>
              <span className={styles.tileGo} aria-hidden="true">
                <Icon name="chevron-right" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {pulse.hotAreas.length > 0 && (
        <section className={`container ${styles.section}`} aria-labelledby="hot-areas-title">
          <header className={styles.sectionHead}>
            <div>
              <h2 id="hot-areas-title" className={styles.sectionTitle}>
                지금 동네 동향
              </h2>
              <p className={styles.sectionSub}>최근 오픈/진행 모임이 모인 구역 순입니다.</p>
            </div>
          </header>
          <div className={styles.hotAreaRail} role="list">
            {pulse.hotAreas.map((item) => (
              <Link
                key={item.area}
                to={`/discover?area=${encodeURIComponent(item.area)}`}
                className={styles.hotAreaChip}
                role="listitem"
                aria-label={`${item.area} 동네로 필터`}
              >
                <span>{item.area}</span>
                <strong>{item.count}개</strong>
              </Link>
            ))}
          </div>
        </section>
      )}

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

      {/* ===== How it works — a real ordered sequence, revealed in step ===== */}
      <section className={`container ${styles.section}`} aria-labelledby="how-title">
        <header className={styles.sectionHead}>
          <h2 id="how-title" className={styles.sectionTitle}>
            이렇게 흘러갑니다
          </h2>
        </header>
        <ol className={styles.steps}>
          <li style={{ ['--i' as never]: 0 } as never}>
            <span className={styles.stepIndex}>01</span>
            <h3>체크인 · 아바타</h3>
            <p>도착하면 좌석 안내. 닉네임과 아바타만으로 충분합니다.</p>
          </li>
          <li style={{ ['--i' as never]: 1 } as never}>
            <span className={styles.stepIndex}>02</span>
            <h3>라운드 회전</h3>
            <p>5분마다 자동으로 다음 자리. 한 잔에 한 사람.</p>
          </li>
          <li style={{ ['--i' as never]: 2 } as never}>
            <span className={styles.stepIndex}>03</span>
            <h3>질문 카드 · 라이브 퀴즈</h3>
            <p>4단계 깊이의 카드가 어색함을 녹입니다.</p>
          </li>
          <li style={{ ['--i' as never]: 3 } as never}>
            <span className={styles.stepIndex}>04</span>
            <h3>최종 매칭</h3>
            <p>서로를 고른 사람만 1:1 채팅이 열립니다.</p>
          </li>
        </ol>
      </section>

      {/* ===== 이용 후기(ReviewDesk) — VITE_REVIEWDESK_URL 설정 시에만 렌더(SDK pk_ 네이티브) ===== */}
      <Testimonials limit={3} />

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
          <span className={styles.ctaGlow} aria-hidden="true" />
          <Badge tone="gold" size="md">
            호스트가 되어볼래요?
          </Badge>
          <h2 id="host-cta">한 모임을 여는 데 5분이면 충분해요.</h2>
          <p>제휴 라운지 · 와인바 · 카페 디렉터리에서 장소를 고르고, 라운드 컨셉만 정하세요.</p>
          <div className={styles.ctaActions}>
            <Link to="/host/create">
              <Button variant="gold" size="lg">
                파티 개설 시작
              </Button>
            </Link>
            {featured ? (
              <ShareButton
                title={featured.title}
                category={featured.category}
                venueArea={featured.venueArea}
                startAtISO={featured.startAt}
                currentParticipants={featured.currentParticipants}
                maxParticipants={featured.maxParticipants}
                inviteUrl={buildInviteUrl(featured.id)}
                gradient={CATEGORY_META[featured.category]?.bgGradient}
                label="친구 초대"
                variant="ghost"
                size="lg"
                className={styles.ctaShare}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}

/** Staggered hero line entrance — gentle rise + fade, expo ease. */
const lineVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] as const } },
}

/**
 * SunsetAtmosphere — the golden-hour scene behind the hero copy. A soft sun-glow
 * that breathes and warm motes (aperitivo dust) drifting up, evoking the
 * "해 지기 직전 첫 잔" north star without depending on a background photo.
 * Purely ornamental (aria-hidden) and fully suppressed under reduced-motion.
 */
function SunsetAtmosphere({ reduce }: { reduce: boolean }) {
  const motes = [
    { left: '14%', delay: 0, dur: 9, size: 7, drift: -18 },
    { left: '24%', delay: 1.6, dur: 11, size: 5, drift: 14 },
    { left: '38%', delay: 0.8, dur: 10, size: 9, drift: -10 },
    { left: '52%', delay: 2.4, dur: 12, size: 6, drift: 20 },
    { left: '63%', delay: 0.4, dur: 9.5, size: 8, drift: -16 },
    { left: '74%', delay: 3, dur: 11.5, size: 5, drift: 12 },
    { left: '83%', delay: 1.2, dur: 10.5, size: 7, drift: -12 },
    { left: '92%', delay: 2, dur: 12.5, size: 9, drift: 18 },
  ]
  return (
    <div className={styles.atmos}>
      <span className={styles.sunGlow} />
      {!reduce && (
        <div className={styles.motes}>
          {motes.map((m, i) => (
            <span
              key={i}
              className={styles.mote}
              style={
                {
                  left: m.left,
                  width: m.size,
                  height: m.size,
                  ['--dur' as never]: `${m.dur}s`,
                  ['--delay' as never]: `${m.delay}s`,
                  ['--drift' as never]: `${m.drift}px`,
                } as never
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
