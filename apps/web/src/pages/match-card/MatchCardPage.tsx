import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/useToast'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Icon } from '@components/ui/Icon/Icon'
import { useAuthStore } from '@store/authStore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useParams, Link } from 'react-router-dom'

import styles from './MatchCard.module.css'

import { api } from '@/infrastructure/api'

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
    const url = globalThis.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: `${data.user.nickname}의 명함`, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.show('링크를 복사했어요', 'success')
      }
    } catch {}
  }

  const canConnect = !!me && me.id !== userId
  const rating = data.stats.averageRating || null

  return (
    <main className={styles.page}>
      <motion.article
        className={styles.card}
        aria-labelledby="match-name"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className={styles.kicker}>오늘 라운드에서 만난 사람</p>

        <header className={styles.identity}>
          <Avatar
            size="xl"
            hue="var(--color-primary)"
            pattern="gradient"
            emoji={data.user.nickname[0]}
            imageSrc={data.user.avatarImage ?? null}
            ring="gold"
            label={`${data.user.nickname}님의 프로필 사진`}
          />
          <h1 id="match-name" className={styles.name}>
            {data.user.nickname}
          </h1>
          {data.user.mbti && (
            <Badge tone="gold" size="md">
              {data.user.mbti}
            </Badge>
          )}
          {data.user.bio && <p className={styles.bio}>{data.user.bio}</p>}
        </header>

        {interests.length > 0 && (
          <section className={styles.section} aria-labelledby="match-interests">
            <h2 id="match-interests" className={styles.sectionTitle}>
              관심사
            </h2>
            <ul className={styles.tags}>
              {interests.slice(0, 6).map((t) => (
                <li key={t} className={styles.tag}>
                  #{t}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.stats} aria-label="활동 요약">
          <div className={styles.stat}>
            <strong>{data.stats.hostedCount}</strong>
            <span>호스팅</span>
          </div>
          <div className={styles.stat}>
            <strong>{data.stats.followerCount}</strong>
            <span>팔로워</span>
          </div>
          <div className={styles.stat}>
            <strong>{rating ?? <span aria-label="평점 없음">–</span>}</strong>
            <span>평점</span>
          </div>
        </section>

        <div className={styles.actions}>
          {canConnect ? (
            <>
              <Link to="/chats" className={styles.primaryLink}>
                <Button variant="primary" size="lg" fullWidth leftIcon={<Icon name="mail" />}>
                  메시지 보내기
                </Button>
              </Link>
              <div className={styles.secondaryRow}>
                <Button
                  variant={isFollowing ? 'soft' : 'outline'}
                  size="lg"
                  fullWidth
                  isLoading={followMutation.isPending}
                  leftIcon={<Icon name={isFollowing ? 'check' : 'plus'} />}
                  onClick={() => followMutation.mutate()}
                >
                  {isFollowing ? '팔로잉' : '팔로우'}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  fullWidth
                  leftIcon={<Icon name="bookmark" />}
                  onClick={handleShare}
                >
                  공유
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<Icon name="bookmark" />}
              onClick={handleShare}
            >
              명함 공유
            </Button>
          )}
        </div>
      </motion.article>

      <p className={styles.footnote}>오늘 같은 라운드에서 만난 인연을 기념하는 명함입니다.</p>
    </main>
  )
}
