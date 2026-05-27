import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PartySummary } from '@rotifolk/shared'
import { computeHostLevel } from '@rotifolk/shared'
import { api } from '@services/api'
import { useAuthStore } from '@store/authStore'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import { Badge } from '@components/ui/Badge/Badge'
import { HostLevelBadge } from '@components/ui/HostLevelBadge/HostLevelBadge'
import { Card } from '@components/ui/Card/Card'
import { PartyCard } from '@features/parties/PartyCard'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import styles from './HostProfile.module.css'

interface HostProfile {
  user: {
    id: string
    nickname: string
    avatarId: string | null
    bio: string | null
    mbti: string | null
    interestsJson: string
    trustScore: number
    hostedCount: number
    isVerified: boolean
    role: string
  }
  stats: {
    followerCount: number
    hostedCount: number
    averageRating: number
    reviewCount: number
  }
  recentParties: PartySummary[]
}

export default function HostProfilePage() {
  const { hostId } = useParams<{ hostId: string }>()
  const me = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['host-profile', hostId],
    queryFn: () => api.get<HostProfile>(`hosts/${hostId}`),
    enabled: !!hostId,
  })

  const { data: following } = useQuery({
    queryKey: ['follows', 'me'],
    queryFn: () => api.get<Array<{ id: string }>>('follows/me'),
    enabled: !!me,
  })

  const isFollowing = following?.some((f) => f.id === hostId) ?? false

  const toggleFollow = useMutation({
    mutationFn: () =>
      isFollowing
        ? api.delete(`follows/${hostId}`)
        : api.post(`follows/${hostId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['host-profile', hostId] })
    },
  })

  if (isLoading) return <Loading />
  if (!data) return <EmptyState emoji="🌙" title="호스트를 찾을 수 없어요" />
  const { user, stats, recentParties } = data
  const isSelf = me?.id === user.id
  const hostLevel = computeHostLevel({
    hostedCount: user.hostedCount,
    averageRating: stats.averageRating,
  })

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.identity}>
          <Avatar size="xl" hue="#7A1F3D" pattern="gradient" emoji={user.nickname[0]} ring="glow" />
          <div className={styles.identityBody}>
            <div className={styles.nameRow}>
              <h1>{user.nickname}</h1>
              {user.isVerified && <Badge tone="info">✓ 인증</Badge>}
              {user.role === 'host' ? (
                <HostLevelBadge level={hostLevel.level} size="md" />
              ) : (
                <Badge tone="primary">{user.role}</Badge>
              )}
            </div>
            {user.bio && <p className={styles.bio}>{user.bio}</p>}
            <div className={styles.stats}>
              <div>
                <strong>{stats.followerCount}</strong>
                <span>팔로워</span>
              </div>
              <div>
                <strong>{stats.hostedCount}</strong>
                <span>호스팅</span>
              </div>
              <div>
                <strong>{stats.averageRating || '–'}</strong>
                <span>평점 ({stats.reviewCount})</span>
              </div>
            </div>
          </div>
        </div>
        {!isSelf && me && (
          <Button
            variant={isFollowing ? 'soft' : 'primary'}
            size="lg"
            onClick={() => toggleFollow.mutate()}
            isLoading={toggleFollow.isPending}
          >
            {isFollowing ? '✓ 팔로잉' : '+ 팔로우'}
          </Button>
        )}
      </header>

      <section className={styles.section}>
        <h2 className={styles.h2}>최근 모임</h2>
        {recentParties.length === 0 ? (
          <Card padding="lg">
            <p className={styles.muted}>아직 호스팅한 모임이 없어요.</p>
          </Card>
        ) : (
          <div className={styles.grid}>
            {recentParties.map((p) => (
              <PartyCard key={p.id} party={p} />
            ))}
          </div>
        )}
      </section>

      {!me && (
        <Card padding="lg" variant="soft">
          <p className={styles.muted}>로그인하면 이 호스트를 팔로우할 수 있어요.</p>
          <Link to="/login">
            <Button variant="primary">로그인</Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
