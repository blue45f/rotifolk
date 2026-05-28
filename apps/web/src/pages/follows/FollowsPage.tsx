import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@services/api'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import styles from './Follows.module.css'

interface FollowedUser {
  id: string
  nickname: string
  avatarId: string | null
  role?: string
}

export default function FollowsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['follows', 'me'],
    queryFn: () => api.get<FollowedUser[]>('follows/me'),
  })

  if (isLoading) return <Loading />

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>팔로잉</h1>
        <p className={styles.muted}>내가 팔로우한 호스트 {data?.length ?? 0}명</p>
      </header>

      {!data || data.length === 0 ? (
        <EmptyState
          emoji="🌙"
          title="아직 팔로우한 호스트가 없어요"
          description="마음에 드는 호스트 페이지에서 팔로우해 보세요."
          action={
            <Link to="/discover">
              <Button variant="primary">파티 탐색</Button>
            </Link>
          }
        />
      ) : (
        <ul className={styles.list}>
          {data.map((u) => (
            <li key={u.id}>
              <Link to={`/hosts/${u.id}`} className={styles.row}>
                <Avatar
                  size="md"
                  hue="#7A1F3D"
                  pattern="gradient"
                  emoji={u.nickname[0]}
                />
                <div className={styles.body}>
                  <strong>{u.nickname}</strong>
                  {u.role === 'host' && <span>🎙️ 호스트</span>}
                </div>
                <span className={styles.cta}>프로필 →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
