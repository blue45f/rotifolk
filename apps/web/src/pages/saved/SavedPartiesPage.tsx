import Loading from '@components/feedback/Loading'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import { recommendParties, userToContext } from '@rotifolk/shared'
import { useAuthStore } from '@store/authStore'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import styles from './SavedParties.module.css'

import type { PartySummary } from '@rotifolk/shared'

import { PartyCard } from '@/domains/parties/PartyCard'
import { useParties } from '@/domains/parties/queries'
import { api } from '@/infrastructure/api'

type SortKey = 'saved' | 'soonest'

export default function SavedPartiesPage() {
  const me = useAuthStore((s) => s.user)
  const [sort, setSort] = useState<SortKey>('saved')
  const { data, isLoading } = useQuery({
    queryKey: ['saved', 'me'],
    queryFn: () => api.get<PartySummary[]>('saved'),
  })
  const { data: openParties } = useParties({ status: 'open', pageSize: 12 })

  const sortedItems = useMemo(() => {
    const arr = [...(data ?? [])]
    if (sort === 'soonest')
      arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    return arr
  }, [data, sort])

  const items = data ?? []
  const recommendations =
    me && openParties && items.length === 0
      ? recommendParties(openParties.items, userToContext(me), 6)
      : []

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.kicker}>
          <Icon name="bookmark" aria-hidden />
          저장한 모임
        </p>
        <h1 className={styles.title}>북마크</h1>
        <p className={styles.muted}>
          {isLoading
            ? '저장한 모임을 불러오는 중이에요'
            : items.length > 0
              ? '나중에 다시 보려고 담아둔 모임이에요.'
              : '관심 가는 모임을 담아두면 여기에서 한눈에 볼 수 있어요.'}
        </p>
      </header>

      {isLoading ? (
        <PartyCardSkeletonGrid count={6} label="저장한 모임을 불러오는 중" />
      ) : items.length === 0 ? (
        <>
          <section className={styles.empty} aria-labelledby="saved-empty-title">
            <span className={styles.emptyMark} aria-hidden="true">
              <Icon name="bookmark" size={1.6} />
            </span>
            <h2 id="saved-empty-title" className={styles.emptyTitle}>
              아직 저장한 모임이 없어요
            </h2>
            <p className={styles.emptyText}>
              모임 카드의 저장 버튼을 누르면 여기로 모여요. 마음에 드는 모임부터 둘러볼까요?
            </p>
            <Link to="/discover" className={styles.emptyCtaLink}>
              <Button variant="primary" size="lg" leftIcon={<Icon name="compass" aria-hidden />}>
                모임 둘러보기
              </Button>
            </Link>
          </section>

          {recommendations.length > 0 && (
            <section className={styles.recSection} aria-labelledby="saved-rec-title">
              <h3 id="saved-rec-title" className={styles.recTitle}>
                관심사 기반 추천
              </h3>
              <div className={styles.grid}>
                {recommendations.map((p) => (
                  <PartyCard key={p.id} party={p} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <div className={styles.toolbar}>
            <span className={styles.count}>
              <strong>{items.length}</strong>개 저장됨
            </span>
            <div className={styles.sortRow} role="group" aria-label="정렬 기준">
              <Chip selected={sort === 'saved'} onClick={() => setSort('saved')}>
                저장한 순
              </Chip>
              <Chip
                selected={sort === 'soonest'}
                onClick={() => setSort('soonest')}
                leadingIcon={<Icon name="clock" aria-hidden />}
              >
                곧 시작순
              </Chip>
            </div>
          </div>
          <div className={styles.grid}>
            {sortedItems.map((p) => (
              <PartyCard key={p.id} party={p} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
