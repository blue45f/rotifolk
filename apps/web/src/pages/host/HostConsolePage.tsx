import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useHostedParties } from '@features/parties/queries'
import { useAuthStore } from '@store/authStore'
import { PartyCard } from '@features/parties/PartyCard'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Chip } from '@components/ui/Chip/Chip'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { api } from '@services/api'
import styles from './HostConsole.module.css'

type StatusFilter = 'all' | 'live' | 'open' | 'ended'

interface HostRevenueSummary {
  totalKRW: number
  paidCount: number
  refundedKRW: number
  recent: Array<{
    partyId: string
    partyTitle: string
    totalKRW: number
    paidCount: number
  }>
}

export default function HostConsolePage() {
  const user = useAuthStore((s) => s.user)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const { data, isLoading } = useHostedParties()
  const { data: revenue } = useQuery({
    queryKey: ['payments', 'host', 'summary'],
    queryFn: () => api.get<HostRevenueSummary>('payments/host/summary'),
  })

  if (isLoading) return <Loading />

  const total = data?.length ?? 0
  const live = data?.filter((p) => p.status === 'live').length ?? 0
  const open = data?.filter((p) => p.status === 'open').length ?? 0

  const filteredParties =
    statusFilter === 'all'
      ? (data ?? [])
      : (data ?? []).filter((p) => {
          if (statusFilter === 'ended') return p.status !== 'live' && p.status !== 'open'
          return p.status === statusFilter
        })

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <div>
          <h1 className={styles.title}>
            안녕하세요, <span className={styles.accent}>{user?.nickname}</span> 호스트님 🎙️
          </h1>
          <p className={styles.lead}>오늘의 라운드를 준비해 볼까요?</p>
        </div>
        <Link to="/host/create">
          <Button variant="primary" size="lg">
            + 새 파티 열기
          </Button>
        </Link>
      </header>

      <section
        className="container"
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}
      >
        <Link to="/host/sourcing">
          <Button variant="gold" size="lg">
            📍 공간 섭외 스튜디오
          </Button>
        </Link>
        <Link to="/host/space">
          <Button variant="outline" size="lg">
            🏠 내 가게로 호스팅
          </Button>
        </Link>
      </section>

      <section className={`container ${styles.stats}`}>
        <StatCard label="진행 중인 파티" value={live} emoji="🔴" />
        <StatCard label="모집 중인 파티" value={open} emoji="🌙" />
        <StatCard label="총 호스팅 횟수" value={total} emoji="🏆" />
      </section>

      <section className="container">
        <Card padding="lg" variant="gradient" className={styles.revenueCard}>
          <div className={styles.revenueHead}>
            <span className={styles.revenueTitle}>호스트 매출 ✨</span>
            <span className={styles.revenueBadge}>최근 12개 파티 기준</span>
          </div>

          <div className={styles.revenueStats}>
            <div className={`${styles.revenueStat} ${styles.revenueStatHero}`}>
              <span className={styles.revenueLabel}>누적 매출</span>
              <strong className={styles.revenueValue}>
                {(revenue?.totalKRW ?? 0).toLocaleString()}원
              </strong>
            </div>
            <div className={styles.revenueStat}>
              <span className={styles.revenueLabel}>결제 건수</span>
              <strong className={styles.revenueValue}>
                {(revenue?.paidCount ?? 0).toLocaleString()}건
              </strong>
            </div>
            <div className={styles.revenueStat}>
              <span className={styles.revenueLabel}>환불 금액</span>
              <strong className={styles.revenueValue}>
                {(revenue?.refundedKRW ?? 0).toLocaleString()}원
              </strong>
            </div>
          </div>

          <div className={styles.revenueDivider} />

          {(revenue?.totalKRW ?? 0) === 0 ? (
            <p className={styles.revenueEmpty}>첫 모임이 결제되면 여기에 표시돼요</p>
          ) : (
            <ul className={styles.revenueList}>
              {revenue?.recent
                .filter((r) => r.totalKRW > 0)
                .map((r) => (
                  <li key={r.partyId} className={styles.revenueListItem}>
                    <span className={styles.revenueListTitle} title={r.partyTitle}>
                      {r.partyTitle}
                    </span>
                    <span className={styles.revenueListMeta}>
                      ₩{r.totalKRW.toLocaleString()}
                      <span className={styles.revenueListCount}>· {r.paidCount}건</span>
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </section>

      <section className={`container ${styles.list}`}>
        <h2 className={styles.h2}>내 파티</h2>
        {!data || data.length === 0 ? (
          <EmptyState
            emoji="✨"
            title="첫 파티를 열어볼 시간이에요"
            description="장소를 고르고 라운드 컨셉을 정하면 끝. 5분이면 충분해요."
            action={
              <Link to="/host/create">
                <Button variant="primary" size="lg">
                  파티 만들기
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className={styles.filterRow} role="group" aria-label="파티 상태 필터">
              <Chip selected={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                전체
              </Chip>
              <Chip
                selected={statusFilter === 'live'}
                onClick={() => setStatusFilter('live')}
                leadingEmoji="🔴"
              >
                진행 중
              </Chip>
              <Chip
                selected={statusFilter === 'open'}
                onClick={() => setStatusFilter('open')}
                leadingEmoji="🌙"
              >
                모집 중
              </Chip>
              <Chip
                selected={statusFilter === 'ended'}
                onClick={() => setStatusFilter('ended')}
                leadingEmoji="🏁"
              >
                지난 파티
              </Chip>
            </div>
            {filteredParties.length === 0 ? (
              <p className={styles.filterEmpty}>이 상태의 파티가 없어요.</p>
            ) : (
              <div className={styles.grid}>
                {filteredParties.map((p) => (
                  <Link key={p.id} to={`/host/parties/${p.id}`} className={styles.cardLink}>
                    <PartyCard party={p} />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <Card padding="md" variant="soft">
      <div className={styles.stat}>
        <span className={styles.statEmoji} aria-hidden="true">
          {emoji}
        </span>
        <div>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      </div>
    </Card>
  )
}
