import { useEffect, useState } from 'react'
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

      <HostIntroSlot hostId={user.id} isSelf={isSelf} />

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

const INTRO_KEY = (hostId: string) => `rotifolk-host-intro-${hostId}`
const INTRO_MAX = 400

function HostIntroSlot({ hostId, isSelf }: { hostId: string; isSelf: boolean }) {
  const [intro, setIntro] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    try { setIntro(localStorage.getItem(INTRO_KEY(hostId)) ?? '') } catch {}
  }, [hostId])

  if (!intro && !isSelf) return null

  const start = () => {
    setDraft(intro)
    setEditing(true)
  }
  const save = () => {
    const next = draft.trim().slice(0, INTRO_MAX)
    setIntro(next)
    try { localStorage.setItem(INTRO_KEY(hostId), next) } catch {}
    setEditing(false)
  }
  const cancel = () => {
    setEditing(false)
    setDraft('')
  }

  return (
    <section className={styles.section} aria-label="호스트 인사말">
      <h2 className={styles.h2}>호스트 인사</h2>
      <Card padding="lg" variant="soft">
        {editing ? (
          <div className={styles.introEdit}>
            <textarea
              className={styles.introTextarea}
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, INTRO_MAX))}
              placeholder="모임을 여는 이유, 좋아하는 잔, 어떤 손님을 만나고 싶은지 — 첫인사처럼 한두 문단으로."
              rows={5}
              autoFocus
            />
            <div className={styles.introFoot}>
              <span className={styles.introCount}>{draft.length} / {INTRO_MAX}</span>
              <div className={styles.introActions}>
                <Button variant="ghost" size="sm" onClick={cancel}>취소</Button>
                <Button variant="primary" size="sm" onClick={save}>저장</Button>
              </div>
            </div>
            <p className={styles.introHint}>※ 이 기기에만 저장돼요 (브라우저 localStorage)</p>
          </div>
        ) : intro ? (
          <div className={styles.introBlock}>
            <p className={styles.introText}>{intro}</p>
            {isSelf && (
              <button type="button" className={styles.introEditBtn} onClick={start}>
                ✎ 수정
              </button>
            )}
          </div>
        ) : (
          <div className={styles.introEmpty}>
            <p className={styles.muted}>아직 인사말이 없어요. 첫인사로 손님 마음을 데워볼까요?</p>
            <Button variant="gold" size="sm" onClick={start}>✨ 인사말 작성</Button>
          </div>
        )}
      </Card>
    </section>
  )
}
