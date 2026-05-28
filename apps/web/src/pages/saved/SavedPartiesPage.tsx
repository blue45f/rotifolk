import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { PartySummary } from '@rotifolk/shared'
import { api } from '@services/api'
import { PartyCard } from '@features/parties/PartyCard'
import { Button } from '@components/ui/Button/Button'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import styles from './SavedParties.module.css'

export default function SavedPartiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['saved', 'me'],
    queryFn: () => api.get<PartySummary[]>('saved'),
  })

  if (isLoading) return <Loading />

  const items = data ?? []

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>저장한 모임</h1>
        <p className={styles.muted}>
          나중에 다시 보려고 저장한 모임 <strong>{items.length}</strong>개
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          emoji="☆"
          title="아직 저장한 모임이 없어요"
          description="파티 페이지에서 ‘☆ 저장’을 누르면 여기로 모여요."
          action={
            <Link to="/discover">
              <Button variant="primary">모임 둘러보기</Button>
            </Link>
          }
        />
      ) : (
        <div className={styles.grid}>
          {items.map((p) => (
            <PartyCard key={p.id} party={p} />
          ))}
        </div>
      )}
    </div>
  )
}
