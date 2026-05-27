import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { PartySummary } from '@rotifolk/shared'
import { api } from '@services/api'
import { PartyCard } from '@features/parties/PartyCard'
import { Chip } from '@components/ui/Chip/Chip'
import { Badge } from '@components/ui/Badge/Badge'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { Link } from 'react-router-dom'
import { Button } from '@components/ui/Button/Button'
import styles from './Neighborhood.module.css'

const AREAS = ['한남동', '연남동', '북촌', '강남', '성수', '망원', '이태원', '홍대']

export default function NeighborhoodPage() {
  const [area, setArea] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['neighborhood', area],
    queryFn: () =>
      api.get<{ area: string | null; items: PartySummary[] }>(
        `parties/neighborhood${area ? `?area=${encodeURIComponent(area)}` : ''}`,
      ),
  })

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true" />
      <header className={`container ${styles.head}`}>
        <Badge tone="info" size="md">
          📍 우리 동네
        </Badge>
        <h1 className={styles.title}>{data?.area ?? '내 주변'} 모임</h1>
        <p className={styles.lead}>걸어서 갈 만한 거리의 로테이션 모임만 모아봤어요.</p>
      </header>

      <section className={`container ${styles.chips}`}>
        <Chip selected={!area} onClick={() => setArea(null)}>
          🏠 내 동네
        </Chip>
        {AREAS.map((a) => (
          <Chip key={a} selected={area === a} onClick={() => setArea(area === a ? null : a)}>
            📍 {a}
          </Chip>
        ))}
      </section>

      <section className={`container ${styles.list}`}>
        {isLoading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            emoji="🌙"
            title="이 동네엔 아직 모임이 없어요"
            description="첫 모임을 즉석으로 열어보는 건 어때요?"
            action={
              <Link to="/quick">
                <Button variant="gold" size="lg">
                  ⚡ 즉석 모임 열기
                </Button>
              </Link>
            }
          />
        ) : (
          <div className={styles.grid}>
            {data.items.map((p) => (
              <PartyCard key={p.id} party={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
