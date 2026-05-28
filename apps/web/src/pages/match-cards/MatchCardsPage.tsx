import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@services/api'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import styles from './MatchCards.module.css'

interface MatchCardItem {
  id: string
  partnerUserId: string
  partnerNickname: string
  partnerAvatarId: string | null
  partyId: string
  partyTitle: string
  matchedAt: string
}

export default function MatchCardsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-match-cards'],
    queryFn: () => api.get<MatchCardItem[]>('parties/me/match-cards'),
  })

  if (isLoading) return <Loading />

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <Badge tone="gold" size="md">내 명함</Badge>
        <h1 className={styles.title}>오늘까지 만난 인연</h1>
        <p className={styles.muted}>총 {data?.length ?? 0}장</p>
      </header>

      {!data || data.length === 0 ? (
        <EmptyState
          emoji="💌"
          title="아직 명함이 없어요"
          description="다음 모임에서 만나봐요."
          action={
            <Link to="/discover">
              <Button variant="primary">모임 탐색</Button>
            </Link>
          }
        />
      ) : (
        <div className={styles.grid}>
          {data.map((c, i) => (
            <Link
              key={c.id}
              to={`/match-card/${c.partnerUserId}`}
              className={styles.card}
              style={{ ['--tilt' as never]: `${i % 2 === 0 ? -1 : 1}deg` } as never}
            >
              <Avatar
                size="lg"
                hue="#7A1F3D"
                pattern="gradient"
                emoji={c.partnerNickname[0]}
                ring="gold"
              />
              <div className={styles.cardName}>{c.partnerNickname}</div>
              <div className={styles.cardParty}>{c.partyTitle}</div>
              <time className={styles.cardDate}>
                {new Date(c.matchedAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
