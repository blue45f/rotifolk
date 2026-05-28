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
    const isBalanced =
      genderKnown >= 4 && Math.abs(male - female) / genderKnown <= 0.2

    const avgAge =
      ages.length > 0
        ? Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10
        : null

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
    <section className={styles.wrap} aria-label="파티 분석">
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>파티 분석</h2>
          <p className={styles.subtitle}>
            지금까지 모인 참가자 데이터를 한눈에 살펴보세요.
          </p>
        </div>
      </header>

      <div className={styles.grid}>
        {/* Participants */}
        <article className={styles.card} aria-label="참가자 수">
          <span className={styles.label}>참가자</span>
          <div>
            <span className={styles.bigNumber}>{stats.total}</span>
            <span className={styles.unit}>명</span>
          </div>
          <div className={styles.subLabel}>확정 {stats.confirmed}명</div>
        </article>

        {/* Check-in rate */}
        <article className={styles.card} aria-label="체크인율">
          <span className={styles.label}>체크인율</span>
          <div>
            <span className={`${styles.bigNumber} ${styles.sage}`}>
              {stats.checkInRate}
            </span>
            <span className={styles.unit}>%</span>
          </div>
          <div className={styles.barTrack} role="progressbar" aria-valuenow={stats.checkInRate} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`${styles.barFill} ${styles.sage}`}
              style={{ width: `${stats.checkInRate}%` }}
            />
          </div>
          <div className={styles.subLabel}>
            {stats.checkedIn} / {stats.confirmed}명 도착
          </div>
        </article>

        {/* Gender ratio */}
        <article
          className={`${styles.card} ${stats.isBalanced ? styles.accent : ''}`}
          aria-label="성별 비율"
        >
          <span className={styles.label}>성별 비율</span>
          {stats.isBalanced && (
            <span className={styles.balanceBadge}>★ 5:5 황금밸런스</span>
          )}
          {stats.genderKnown > 0 ? (
            <>
              <div className={styles.splitBar} role="img" aria-label={`남 ${stats.malePct}%, 여 ${stats.femalePct}%`}>
                <div className={styles.splitLeft} style={{ flexBasis: `${stats.malePct}%` }} />
                <div className={styles.splitRight} style={{ flexBasis: `${stats.femalePct}%` }} />
              </div>
              <div className={styles.splitLegend}>
                <span>
                  <span className={`${styles.dot} ${styles.burgundy}`} aria-hidden="true" />{' '}
                  남 <strong>{stats.male}</strong> · {stats.malePct}%
                </span>
                <span>
                  여 <strong>{stats.female}</strong> · {stats.femalePct}%{' '}
                  <span className={`${styles.dot} ${styles.gold}`} aria-hidden="true" />
                </span>
              </div>
            </>
          ) : (
            <div className={styles.subLabel}>아직 성별 정보가 없어요</div>
          )}
        </article>

        {/* Average age */}
        <article className={styles.card} aria-label="평균 나이">
          <span className={styles.label}>평균 나이</span>
          <div>
            <span className={`${styles.bigNumber} ${styles.gold}`}>
              {stats.avgAge ?? '–'}
            </span>
            <span className={styles.unit}>{stats.avgAge != null ? '세' : ''}</span>
          </div>
          <div className={styles.subLabel}>
            {stats.ageSampleSize > 0
              ? `출생연도 기준 ${stats.ageSampleSize}명 추정`
              : '출생연도 정보가 없어요'}
          </div>
        </article>

        {/* MBTI E/I distribution */}
        <article className={styles.card} aria-label="MBTI E·I 분포">
          <span className={styles.label}>MBTI · E vs I</span>
          {stats.mbtiKnown > 0 ? (
            <div className={styles.donutRow}>
              <div
                className={styles.donut}
                style={{ ['--pct' as never]: stats.ePct } as React.CSSProperties}
                role="img"
                aria-label={`외향 ${stats.ePct}%, 내향 ${100 - stats.ePct}%`}
              >
                <div className={styles.donutCenter}>
                  {stats.ePct >= 50 ? 'E' : 'I'}
                  <span style={{ marginLeft: 2 }}>
                    {Math.max(stats.ePct, 100 - stats.ePct)}%
                  </span>
                </div>
              </div>
              <div className={styles.donutLegend}>
                <div className={styles.legendRow}>
                  <span className={`${styles.dot} ${styles.burgundy}`} aria-hidden="true" />
                  외향 E <strong>{stats.mbtiE}</strong> · {stats.ePct}%
                </div>
                <div className={styles.legendRow}>
                  <span className={`${styles.dot} ${styles.sage}`} aria-hidden="true" />
                  내향 I <strong>{stats.mbtiI}</strong> · {100 - stats.ePct}%
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.subLabel}>아직 MBTI 정보가 없어요</div>
          )}
        </article>
      </div>

      {stats.topInterests.length > 0 && (
        <article className={styles.interestsCard} aria-label="참가자 관심사">
          <span className={styles.label}>참가자 관심사 TOP {stats.topInterests.length}</span>
          <ul className={styles.interestList}>
            {stats.topInterests.map(({ tag, count }) => (
              <li key={tag} className={styles.interestRow}>
                <span className={styles.interestTag}>{tag}</span>
                <div className={styles.barTrack} style={{ flex: 1 }}>
                  <div
                    className={`${styles.barFill} ${styles.gold}`}
                    style={{ width: `${pct(count, stats.topInterests[0].count)}%` }}
                  />
                </div>
                <span className={styles.interestCount}>{count}</span>
              </li>
            ))}
          </ul>
        </article>
      )}
    </section>
  )
}
