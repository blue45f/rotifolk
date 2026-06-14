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

  if (isLoading) return <Loading />

  const items = data ?? []
  const recommendations =
    me && openParties && items.length === 0
      ? recommendParties(openParties.items, userToContext(me), 6)
      : []

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>저장한 모임</h1>
        <p className={styles.muted}>
          나중에 다시 보려고 저장한 모임 <strong>{items.length}</strong>개
        </p>
      </header>

      {items.length === 0 ? (
        <>
          <div className={styles.empty}>
            <div className={styles.emptyEmoji} aria-hidden="true">
              ☆
            </div>
            <h2>아직 저장한 모임이 없어요</h2>
            <p>파티 페이지에서 ☆를 누르면 여기로 모여요. 추천부터 둘러볼까요?</p>
          </div>

          {recommendations.length > 0 && (
            <section className={styles.recSection}>
              <h3>관심사 기반 추천</h3>
              <div className={styles.grid}>
                {recommendations.map((p) => (
                  <PartyCard key={p.id} party={p} />
                ))}
              </div>
            </section>
          )}

          <div className={styles.emptyCta}>
            <Link to="/discover">
              <Button variant="primary" size="lg">
                모임 둘러보기
              </Button>
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className={styles.sortRow}>
            <Chip selected={sort === 'saved'} onClick={() => setSort('saved')}>
              저장한 순
            </Chip>
            <Chip
              selected={sort === 'soonest'}
              onClick={() => setSort('soonest')}
              leadingEmoji="⏰"
            >
              곧 시작순
            </Chip>
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
