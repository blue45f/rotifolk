import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '@services/api'
import { useAuthStore } from '@store/authStore'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import styles from './MatchCard.module.css'

interface HostProfileLite {
  user: {
    id: string
    nickname: string
    bio: string | null
    mbti: string | null
    interestsJson: string
    avatarId: string | null
    avatarImage?: string | null
  }
  stats: { followerCount: number; hostedCount: number; averageRating: number }
}

interface FollowedUser {
  id: string
}

export default function MatchCardPage() {
  const { userId } = useParams<{ userId: string }>()
  const me = useAuthStore((s) => s.user)
  const toast = useToast()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['match-card', userId],
    queryFn: () => api.get<HostProfileLite>(`hosts/${userId}`),
    enabled: !!userId,
  })

  const { data: following } = useQuery({
    queryKey: ['follows', 'me'],
    queryFn: () => api.get<FollowedUser[]>('follows/me'),
    enabled: !!me,
  })
  const isFollowing = following?.some((f) => f.id === userId) ?? false

  const followMutation = useMutation({
    mutationFn: () =>
      isFollowing ? api.delete(`follows/${userId}`) : api.post(`follows/${userId}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follows', 'me'] })
      toast.show(isFollowing ? '팔로우를 해제했어요' : '팔로우했어요', 'success')
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  if (isLoading) return <Loading />
  if (!data) return <EmptyState emoji="🌙" title="명함을 찾을 수 없어요" />

  const interests: string[] = (() => {
    try {
      const v = JSON.parse(data.user.interestsJson)
      return Array.isArray(v) ? v : []
    } catch {
      return []
    }
  })()

  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: `${data.user.nickname}의 명함`, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.show('링크를 복사했어요', 'success')
      }
    } catch {}
  }

  return (
    <div className={styles.page}>
      <div className={styles.veil} aria-hidden="true" />
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 24, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
      >
        <div className={styles.stamp}>R O T I F O L K</div>
        <Avatar
          size="xl"
          hue="#7A1F3D"
          pattern="gradient"
          emoji={data.user.nickname[0]}
          imageSrc={data.user.avatarImage ?? null}
          ring="gold"
          label={`${data.user.nickname}님의 프로필 사진`}
        />
        <h1 className={styles.name}>{data.user.nickname}</h1>
        {data.user.mbti && (
          <Badge tone="gold" size="md">
            {data.user.mbti}
          </Badge>
        )}
        {data.user.bio && <p className={styles.bio}>{data.user.bio}</p>}

        {interests.length > 0 && (
          <ul className={styles.tags}>
            {interests.slice(0, 6).map((t) => (
              <li key={t}>#{t}</li>
            ))}
          </ul>
        )}

        <div className={styles.stats}>
          <div>
            <strong>{data.stats.hostedCount}</strong>
            <span>호스팅</span>
          </div>
          <div>
            <strong>{data.stats.followerCount}</strong>
            <span>팔로워</span>
          </div>
          <div>
            <strong>{data.stats.averageRating || '–'}</strong>
            <span>평점</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="primary" size="lg" onClick={handleShare}>
            ↗ 명함 공유
          </Button>
          {me && me.id !== userId && (
            <>
              <Button
                variant={isFollowing ? 'soft' : 'outline'}
                size="lg"
                isLoading={followMutation.isPending}
                onClick={() => followMutation.mutate()}
              >
                {isFollowing ? '✓ 팔로잉' : '+ 팔로우'}
              </Button>
              <Link to="/chats">
                <Button variant="ghost" size="lg">
                  💌 메시지
                </Button>
              </Link>
            </>
          )}
        </div>
      </motion.div>

      <p className={styles.footnote}>오늘 같은 라운드에서 만난 인연을 기념하는 명함입니다.</p>
    </div>
  )
}
