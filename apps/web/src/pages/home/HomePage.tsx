import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import type { PartySummary } from '@rotifolk/shared'
import { useParties } from '@features/parties/queries'
import { ALL_CATEGORIES } from '@features/categories/meta'
import { PartyCard } from '@features/parties/PartyCard'
import { Button } from '@components/ui/Button/Button'
import { Badge } from '@components/ui/Badge/Badge'
import { Avatar } from '@components/ui/Avatar/Avatar'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { api } from '@services/api'
import styles from './HomePage.module.css'

export default function HomePage() {
  const { data: parties, isLoading } = useParties({ status: 'open', pageSize: 6 })
  const { data: nowParties } = useQuery({
    queryKey: ['happening-now'],
    queryFn: () => api.get<PartySummary[]>('parties/happening-now'),
    refetchInterval: 30_000,
  })

  return (
    <div>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.blobs} aria-hidden="true">
          <span className={styles.blob1} />
          <span className={styles.blob2} />
          <span className={styles.blob3} />
        </div>
        <div className={`container ${styles.heroInner}`}>
          <motion.div
            className={styles.heroCopy}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <Badge tone="gold" size="md">
              ✨ 모르는 사람과의 5분 라운드
            </Badge>
            <h1 id="hero-title" className={styles.heroTitle}>
              한 모금이 끝나기 전,
              <br />
              <span className={styles.heroAccent}>다음 자리로</span>.
            </h1>
            <p className={styles.heroLead}>
              와인 · 커피 · 차 · 위스키 — 호스트가 짠 라운드로 모든 사람을 만나고,
              <br className={styles.brDesktop} />
              마지막엔 가장 마음 맞는 사람과 매칭되는 로테이션 파티.
            </p>
            <div className={styles.heroCta}>
              <Link to="/discover">
                <Button variant="primary" size="xl">
                  오늘의 파티 둘러보기
                </Button>
              </Link>
              <Link to="/host/create">
                <Button variant="outline" size="xl">
                  내 파티 열기
                </Button>
              </Link>
            </div>
            <div className={styles.heroProof}>
              <div className={styles.avatars}>
                {(['#7A1F3D', '#C9627F', '#D4A24C', '#6B8E5A', '#2F7884'] as const).map((hue, i) => (
                  <Avatar
                    key={hue}
                    size="sm"
                    hue={hue}
                    pattern={(['gradient', 'sparkle', 'wave', 'gradient', 'sparkle'] as const)[i]}
                    emoji={['🍷', '✨', '☕️', '🍵', '🥃'][i]}
                    ring="soft"
                  />
                ))}
              </div>
              <span>
                <strong>1,284명</strong>이 이번 달 로테이션 파티를 즐겼어요
              </span>
            </div>
          </motion.div>

          <motion.div
            className={styles.heroVisual}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            aria-hidden="true"
          >
            <RotationVisual />
          </motion.div>
        </div>
      </section>

      {nowParties && nowParties.length > 0 && (
        <section className={`container ${styles.section}`} aria-labelledby="now-title">
          <header className={styles.sectionHead}>
            <h2 id="now-title" className={styles.sectionTitle}>
              <span className={styles.liveDot} aria-hidden="true" />
              지금 진행 중인 모임
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
      )}

      <section className={`container ${styles.section}`} aria-labelledby="instant-title">
        <div className={styles.instantBanner}>
          <div className={styles.instantBody}>
            <Badge tone="gold" size="md">⚡ 즉석 모임</Badge>
            <h2 id="instant-title" className={styles.instantTitle}>
              지금 한 잔, 같이 할 사람?
            </h2>
            <p>
              30분 뒤, 1시간 뒤, 2시간 뒤. 카테고리·시간·장소만 고르면 1분 만에 개설.
              친구한테 공유 코드만 던지면 모여요.
            </p>
            <div className={styles.instantCta}>
              <Link to="/quick">
                <Button variant="gold" size="lg">⚡ 즉석 모임 열기</Button>
              </Link>
              <Link to="/neighborhood">
                <Button variant="ghost" size="lg">📍 내 동네 보기</Button>
              </Link>
            </div>
          </div>
          <div className={styles.instantVisual} aria-hidden="true">
            {['🍷','☕️','🍵','🥃','🍸'].map((e, i) => (
              <motion.span
                key={i}
                className={styles.float}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ left: `${15 + i * 18}%`, fontSize: `${2 + (i % 2) * 0.5}rem` }}
              >
                {e}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="cats-title">
        <header className={styles.sectionHead}>
          <h2 id="cats-title" className={styles.sectionTitle}>
            오늘은 어떤 잔으로 시작할까요?
          </h2>
          <p className={styles.sectionSub}>카테고리별 라운드 컨셉이 달라요.</p>
        </header>
        <div className={styles.catGrid}>
          {ALL_CATEGORIES.filter((c) => c.value !== 'custom').map((cat) => (
            <Link
              key={cat.value}
              to={`/discover?category=${cat.value}`}
              className={styles.catCard}
              style={{ background: cat.bgGradient }}
            >
              <div className={styles.catEmoji} aria-hidden="true">
                {cat.emoji}
              </div>
              <div className={styles.catBody}>
                <h3>{cat.label}</h3>
                <p>{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="how-title">
        <header className={styles.sectionHead}>
          <h2 id="how-title" className={styles.sectionTitle}>
            어떻게 진행되나요?
          </h2>
          <p className={styles.sectionSub}>호스트가 라운드를 짜고, 우리는 자리만 바꾸면 돼요.</p>
        </header>
        <div className={styles.steps}>
          {[
            {
              n: '01',
              t: '체크인 & 아바타',
              d: '도착 즉시 좌석 안내. 닉네임·아바타로만 시작해도 좋아요.',
              emoji: '🎟️',
            },
            { n: '02', t: '라운드 매칭', d: '5분마다 자동으로 다음 자리로. 한 잔, 한 사람씩.', emoji: '🔄' },
            { n: '03', t: '질문 카드 & 퀴즈', d: '4단계 깊이의 카드와 라이브 퀴즈가 어색함을 녹여요.', emoji: '🃏' },
            { n: '04', t: '최종 매칭', d: '마지막엔 “이 사람 또 보고 싶어요” 투표 → 상호 매칭만 공개.', emoji: '💌' },
          ].map((step) => (
            <div key={step.n} className={styles.step}>
              <div className={styles.stepNum}>{step.n}</div>
              <div className={styles.stepEmoji} aria-hidden="true">
                {step.emoji}
              </div>
              <h3>{step.t}</h3>
              <p>{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="open-title">
        <header className={styles.sectionHead}>
          <h2 id="open-title" className={styles.sectionTitle}>
            지금 모집 중인 파티
          </h2>
          <Link to="/discover" className={styles.sectionAction}>
            전체 보기 →
          </Link>
        </header>
        {isLoading ? (
          <Loading />
        ) : !parties || parties.items.length === 0 ? (
          <EmptyState
            emoji="🌙"
            title="아직 모집 중인 파티가 없어요"
            description="가장 먼저 파티를 열어볼래요?"
            action={
              <Link to="/host/create">
                <Button variant="primary">파티 열기</Button>
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

      <section className={`container ${styles.ctaSection}`}>
        <div className={styles.ctaCard}>
          <h2>호스트가 되어볼래요?</h2>
          <p>
            제휴 라운지·와인바·카페 디렉터리에서 장소를 고르고, 라운드 컨셉만 정하면 끝.
            <br />첫 파티 호스팅 시 무료 카메라 출장.
          </p>
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

function RotationVisual() {
  const items = [
    { emoji: '🍷', hue: '#7A1F3D' },
    { emoji: '✨', hue: '#C9627F' },
    { emoji: '🍵', hue: '#6B8E5A' },
    { emoji: '☕️', hue: '#6B4226' },
    { emoji: '🥃', hue: '#B47433' },
    { emoji: '🌹', hue: '#4A0E25' },
  ]
  return (
    <div className={styles.rotation}>
      <div className={styles.rotationRing} />
      <div className={styles.rotationCore}>
        <span>5분</span>
        <small>라운드</small>
      </div>
      {items.map((it, i) => {
        const angle = (360 / items.length) * i
        return (
          <div
            key={i}
            className={styles.rotationItem}
            style={{
              transform: `rotate(${angle}deg) translateY(-140px) rotate(${-angle}deg)`,
            }}
          >
            <Avatar size="md" hue={it.hue} pattern="gradient" emoji={it.emoji} ring="glow" />
          </div>
        )
      })}
    </div>
  )
}
