import { useMemo } from 'react'
import type { Participation } from '@rotifolk/shared'
import EmptyState from '@components/feedback/EmptyState'
import styles from './HostAnalytics.module.css'

interface Props {
  participants: Participation[]
}

// `Participation['user']` is `PublicUser` (id/nickname/avatarId/bio/mbti/...).
// The API mapper actually returns `toPublicSummary` which does not always include
// `gender` or `birthYear`, so we read them defensively at runtime.
interface ExtendedUser {
  gender?: 'male' | 'female' | 'other' | 'private' | null
  birthYear?: number | null
  mbti?: string | null
}

function readExtended(user: Participation['user']): ExtendedUser {
  if (!user) return {}
  const u = user as unknown as ExtendedUser
  return {
    gender: u.gender ?? null,
    birthYear: u.birthYear ?? null,
    mbti: u.mbti ?? null,
  }
}

function pct(num: number, denom: number) {
  if (denom <= 0) return 0
  return Math.round((num / denom) * 100)
}

export default function HostAnalyticsTab({ participants }: Props) {
  const stats = useMemo(() => {
    const total = participants.length
    const confirmed = participants.filter(
      (p) => p.status === 'confirmed' || p.status === 'checked-in',
    ).length
    const checkedIn = participants.filter((p) => p.status === 'checked-in').length

    let male = 0
    let female = 0
    const ages: number[] = []
    let mbtiE = 0
    let mbtiI = 0
    const nowYear = new Date().getFullYear()
    const interestMap = new Map<string, number>()

    for (const p of participants) {
      const ext = readExtended(p.user)
      if (ext.gender === 'male') male++
      else if (ext.gender === 'female') female++
      if (typeof ext.birthYear === 'number' && ext.birthYear > 1900) {
        ages.push(nowYear - ext.birthYear)
      }
      const mbti = ext.mbti?.trim().toUpperCase()
      if (mbti && mbti.length >= 4) {
        if (mbti[0] === 'E') mbtiE++
        else if (mbti[0] === 'I') mbtiI++
      }
      const interests: string[] = p.user?.interests ?? []
      for (const tag of interests) {
        interestMap.set(tag, (interestMap.get(tag) ?? 0) + 1)
      }
    }

    const topInterests = [...interestMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, count }))

    const genderKnown = male + female
    const malePct = genderKnown > 0 ? Math.round((male / genderKnown) * 100) : 0
    const femalePct = genderKnown > 0 ? 100 - malePct : 0
    // Balance: |male - female| / known <= 0.2 → considered "5:5"
    const isBalanced = genderKnown >= 4 && Math.abs(male - female) / genderKnown <= 0.2

    const avgAge =
      ages.length > 0 ? Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10 : null

    const mbtiKnown = mbtiE + mbtiI
    const ePct = mbtiKnown > 0 ? Math.round((mbtiE / mbtiKnown) * 100) : 0

    return {
      total,
      confirmed,
      checkedIn,
      checkInRate: pct(checkedIn, confirmed),
      male,
      female,
      malePct,
      femalePct,
      genderKnown,
      isBalanced,
      avgAge,
      ageSampleSize: ages.length,
      mbtiE,
      mbtiI,
      mbtiKnown,
      ePct,
      topInterests,
    }
  }, [participants])

  if (stats.total < 3) {
    return (
      <div className={styles.empty}>
        <EmptyState
          emoji="📊"
          title="데이터가 모이면 보여드릴게요"
          description="참가자가 3명 이상 모이면 분석을 보여드려요."
        />
      </div>
    )
  }

  return (
    <section className={styles.wrap} aria-labelledby="host-analytics-title">
      <header className={styles.intro}>
        <span className={styles.kicker}>호스트 분석</span>
        <h2 id="host-analytics-title" className={styles.title}>
          이번 파티는 이렇게 모였어요
        </h2>
        <p className={styles.lead}>
          지금까지 모인 참가자 {stats.total}명을 차분히 읽어볼 수 있게 정리했어요.
        </p>
      </header>

      {/* ── 참석 현황 ─────────────────────────── */}
      <section className={styles.section} aria-labelledby="host-analytics-attendance">
        <div className={styles.sectionHead}>
          <h3 id="host-analytics-attendance" className={styles.sectionTitle}>
            참석 현황
          </h3>
          <p className={styles.sectionNote}>모집부터 도착까지 한 줄로 흐름을 봐요.</p>
        </div>

        <dl className={styles.ledger}>
          <div className={styles.ledgerRow}>
            <dt className={styles.ledgerLabel}>참가자</dt>
            <dd className={styles.ledgerValue}>
              {stats.total}
              <span className={styles.unit}>명</span>
            </dd>
          </div>
          <div className={styles.ledgerRow}>
            <dt className={styles.ledgerLabel}>확정</dt>
            <dd className={styles.ledgerValue}>
              {stats.confirmed}
              <span className={styles.unit}>명</span>
            </dd>
          </div>
          <div className={styles.ledgerRow}>
            <dt className={styles.ledgerLabel}>도착(체크인)</dt>
            <dd className={styles.ledgerValue}>
              {stats.checkedIn}
              <span className={styles.unit}>명</span>
            </dd>
          </div>
        </dl>

        <div className={styles.meter}>
          <div className={styles.meterTop}>
            <span className={styles.meterLabel}>체크인율</span>
            <span className={styles.meterValue}>{stats.checkInRate}%</span>
          </div>
          <div
            className={styles.barTrack}
            role="progressbar"
            aria-label="체크인율"
            aria-valuenow={stats.checkInRate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${stats.checkInRate}%, ${stats.confirmed}명 중 ${stats.checkedIn}명 도착`}
          >
            <div className={styles.barFill} style={{ width: `${stats.checkInRate}%` }} />
          </div>
          <p className={styles.meterCaption}>
            확정 {stats.confirmed}명 중 {stats.checkedIn}명 도착
          </p>
        </div>
      </section>

      {/* ── 참가자 구성 ───────────────────────── */}
      <section className={styles.section} aria-labelledby="host-analytics-composition">
        <div className={styles.sectionHead}>
          <h3 id="host-analytics-composition" className={styles.sectionTitle}>
            참가자 구성
          </h3>
          <p className={styles.sectionNote}>성비·나이·성향으로 모임 무드를 그려봐요.</p>
        </div>

        {/* Gender */}
        <div className={styles.facet}>
          <div className={styles.facetHead}>
            <span className={styles.facetLabel}>성별 비율</span>
            {stats.isBalanced && (
              <span className={styles.balanceTag}>
                <span className={styles.catEmoji} aria-hidden="true">
                  ✨
                </span>
                5:5 황금밸런스
              </span>
            )}
          </div>
          {stats.genderKnown > 0 ? (
            <>
              <div
                className={styles.splitBar}
                role="img"
                aria-label={`남 ${stats.malePct}%, 여 ${stats.femalePct}%`}
              >
                <div className={styles.splitLeft} style={{ flexBasis: `${stats.malePct}%` }} />
                <div className={styles.splitRight} style={{ flexBasis: `${stats.femalePct}%` }} />
              </div>
              <div className={styles.splitLegend}>
                <span className={styles.legendItem}>
                  <span className={`${styles.dot} ${styles.dotApricot}`} aria-hidden="true" /> 남{' '}
                  <strong>{stats.male}</strong> · {stats.malePct}%
                </span>
                <span className={styles.legendItem}>
                  여 <strong>{stats.female}</strong> · {stats.femalePct}%{' '}
                  <span className={`${styles.dot} ${styles.dotAmber}`} aria-hidden="true" />
                </span>
              </div>
            </>
          ) : (
            <p className={styles.facetEmpty}>아직 성별 정보가 없어요.</p>
          )}
        </div>

        {/* Average age + MBTI as a quiet two-up ledger */}
        <dl className={styles.factGroup}>
          <div className={styles.fact}>
            <dt className={styles.factLabel}>평균 나이</dt>
            <dd className={styles.factValue}>
              {stats.avgAge ?? '–'}
              {stats.avgAge != null && <span className={styles.unit}>세</span>}
            </dd>
            <p className={styles.factCaption}>
              {stats.ageSampleSize > 0
                ? `출생연도 기준 ${stats.ageSampleSize}명 추정`
                : '출생연도 정보가 없어요'}
            </p>
          </div>

          <div className={styles.fact}>
            <dt className={styles.factLabel}>MBTI · E vs I</dt>
            {stats.mbtiKnown > 0 ? (
              <dd className={styles.factValue}>
                <span
                  className={styles.donut}
                  style={{ ['--pct' as never]: stats.ePct } as React.CSSProperties}
                  role="img"
                  aria-label={`외향 E ${stats.ePct}%, 내향 I ${100 - stats.ePct}%`}
                >
                  <span className={styles.donutCenter}>
                    {stats.ePct >= 50 ? 'E' : 'I'} {Math.max(stats.ePct, 100 - stats.ePct)}%
                  </span>
                </span>
                <span className={styles.donutLegend}>
                  <span className={styles.legendRow}>
                    <span className={`${styles.dot} ${styles.dotApricot}`} aria-hidden="true" />
                    외향 E <strong>{stats.mbtiE}</strong> · {stats.ePct}%
                  </span>
                  <span className={styles.legendRow}>
                    <span className={`${styles.dot} ${styles.dotTeal}`} aria-hidden="true" />
                    내향 I <strong>{stats.mbtiI}</strong> · {100 - stats.ePct}%
                  </span>
                </span>
              </dd>
            ) : (
              <dd className={styles.factValue}>
                <p className={styles.facetEmpty}>아직 MBTI 정보가 없어요.</p>
              </dd>
            )}
          </div>
        </dl>
      </section>

      {/* ── 관심사 ───────────────────────────── */}
      {stats.topInterests.length > 0 && (
        <section className={styles.section} aria-labelledby="host-analytics-interests">
          <div className={styles.sectionHead}>
            <h3 id="host-analytics-interests" className={styles.sectionTitle}>
              참가자 관심사 TOP {stats.topInterests.length}
            </h3>
            <p className={styles.sectionNote}>가장 많이 겹친 관심사예요.</p>
          </div>
          <ul className={styles.interestList}>
            {stats.topInterests.map(({ tag, count }) => (
              <li key={tag} className={styles.interestRow}>
                <span className={styles.interestTag}>{tag}</span>
                <span
                  className={styles.barTrack}
                  role="img"
                  aria-label={`${tag} ${count}명`}
                  style={{ flex: 1 }}
                >
                  <span
                    className={styles.barFill}
                    style={{ width: `${pct(count, stats.topInterests[0].count)}%` }}
                  />
                </span>
                <span className={styles.interestCount}>{count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}
