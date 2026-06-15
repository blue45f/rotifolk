import { useConfirm } from '@components/feedback/Confirm/useConfirm'
import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/useToast'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { HostLevelBadge } from '@components/ui/HostLevelBadge/HostLevelBadge'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { computeHostLevel } from '@rotifolk/shared'
import { useAuthStore } from '@store/authStore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation, useParams, Link } from 'react-router-dom'

import styles from './HostProfile.module.css'

import type { PartySummary } from '@rotifolk/shared'

import { PartyCard } from '@/domains/parties/PartyCard'
import { api } from '@/infrastructure/api'

interface ReviewUser {
  id: string
  nickname: string
  avatarId: string | null
}

interface HostReview {
  id: string
  rating: number
  body: string
  anonymous: boolean
  tagsJson: string
  hostReply: string | null
  createdAt: string
  fromUser: ReviewUser | null
}

interface HostProfile {
  user: {
    id: string
    nickname: string
    avatarId: string | null
    avatarImage?: string | null
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
  reviews: HostReview[]
  recentParties: PartySummary[]
}

export default function HostProfilePage() {
  const { hostId } = useParams<{ hostId: string }>()
  const me = useAuthStore((s) => s.user)
  const location = useLocation()
  const currentPath = `${location.pathname}${location.search}${location.hash}`
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
      isFollowing ? api.delete(`follows/${hostId}`) : api.post(`follows/${hostId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['host-profile', hostId] })
    },
  })

  if (isLoading) return <Loading />
  if (!data) return <EmptyState emoji="🌙" title="호스트를 찾을 수 없어요" />
  const { user, stats, reviews, recentParties } = data
  const isSelf = me?.id === user.id
  const hostLevel = computeHostLevel({
    hostedCount: user.hostedCount,
    averageRating: stats.averageRating,
  })

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.identity}>
          <Avatar
            size="xl"
            hue="var(--color-primary)"
            pattern="gradient"
            emoji={user.nickname[0]}
            imageSrc={user.avatarImage ?? null}
            ring="glow"
            label={`${user.nickname}님의 프로필 사진`}
          />
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
          <div className={styles.headActions}>
            <Button
              variant={isFollowing ? 'soft' : 'primary'}
              size="lg"
              onClick={() => toggleFollow.mutate()}
              isLoading={toggleFollow.isPending}
            >
              {isFollowing ? '✓ 팔로잉' : '+ 팔로우'}
            </Button>
            <SafetyMenu targetUserId={user.id} targetNickname={user.nickname} />
          </div>
        )}
      </header>

      <HostIntroSlot hostId={user.id} isSelf={isSelf} />

      {(reviews ?? []).length > 0 && (
        <section className={styles.section} aria-label="호스트 리뷰">
          <h2 className={styles.h2}>
            리뷰 <span className={styles.reviewCount}>{stats.reviewCount}개</span>
            {stats.averageRating > 0 && (
              <span className={styles.avgRating}>★ {stats.averageRating}</span>
            )}
          </h2>
          <div className={styles.reviewList}>
            {(reviews ?? []).map((r) => (
              <div key={r.id} className={styles.reviewCard}>
                <div className={styles.reviewHead}>
                  <span className={styles.reviewRating}>
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </span>
                  <time className={styles.reviewDate}>
                    {new Date(r.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                </div>
                <p className={styles.reviewBody}>{r.body}</p>
                {r.fromUser && !r.anonymous && (
                  <p className={styles.reviewFrom}>— {r.fromUser.nickname}</p>
                )}
                {r.anonymous && <p className={styles.reviewFrom}>— 익명</p>}
                {r.hostReply && (
                  <div className={styles.hostReply}>
                    <span className={styles.hostReplyLabel}>호스트 답글</span>
                    <p>{r.hostReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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
          <Link to={`/login?from=${encodeURIComponent(currentPath || '/')}`}>
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
  return <HostIntroSlotContent key={hostId} hostId={hostId} isSelf={isSelf} />
}

function readHostIntro(hostId: string): string {
  try {
    return localStorage.getItem(INTRO_KEY(hostId)) ?? ''
  } catch {
    return ''
  }
}

function HostIntroSlotContent({ hostId, isSelf }: { hostId: string; isSelf: boolean }) {
  const [intro, setIntro] = useState(() => readHostIntro(hostId))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (!intro && !isSelf) return null

  const start = () => {
    setDraft(intro)
    setEditing(true)
  }
  const save = () => {
    const next = draft.trim().slice(0, INTRO_MAX)
    setIntro(next)
    try {
      localStorage.setItem(INTRO_KEY(hostId), next)
    } catch {}
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
              <span className={styles.introCount}>
                {draft.length} / {INTRO_MAX}
              </span>
              <div className={styles.introActions}>
                <Button variant="ghost" size="sm" onClick={cancel}>
                  취소
                </Button>
                <Button variant="primary" size="sm" onClick={save}>
                  저장
                </Button>
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
            <Button variant="gold" size="sm" onClick={start}>
              ✨ 인사말 작성
            </Button>
          </div>
        )}
      </Card>
    </section>
  )
}

type ReportKind = 'harassment' | 'spam' | 'inappropriate' | 'other'
const REPORT_KINDS: { value: ReportKind; label: string }[] = [
  { value: 'harassment', label: '괴롭힘 · 불쾌한 언동' },
  { value: 'spam', label: '스팸 · 홍보' },
  { value: 'inappropriate', label: '부적절한 콘텐츠' },
  { value: 'other', label: '기타' },
]

function SafetyMenu({
  targetUserId,
  targetNickname,
}: {
  targetUserId: string
  targetNickname: string
}) {
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'menu' | 'report'>('menu')
  const [kind, setKind] = useState<ReportKind>('harassment')
  const [reason, setReason] = useState('')

  const { data: blocks } = useQuery({
    queryKey: ['blocks', 'me'],
    queryFn: () => api.get<Array<{ id: string }>>('blocks'),
  })
  const isBlocked = blocks?.some((b) => b.id === targetUserId) ?? false

  const block = useMutation({
    mutationFn: () => api.post(`blocks/${targetUserId}`, {}),
    onSuccess: () => {
      toast.show(`${targetNickname}님을 차단했어요`, 'success')
      qc.invalidateQueries({ queryKey: ['blocks'] })
      setOpen(false)
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  const unblock = useMutation({
    mutationFn: () => api.delete(`blocks/${targetUserId}`),
    onSuccess: () => {
      toast.show(`차단을 해제했어요`, 'success')
      qc.invalidateQueries({ queryKey: ['blocks'] })
      setOpen(false)
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  const report = useMutation({
    mutationFn: () =>
      api.post('reports', {
        targetUserId,
        kind,
        body: reason.trim(),
      }),
    onSuccess: () => {
      toast.show('신고가 접수됐어요. 검토 후 처리할게요.', 'success')
      setReason('')
      setMode('menu')
      setOpen(false)
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  const close = () => {
    setOpen(false)
    setMode('menu')
    setReason('')
  }

  return (
    <>
      <button
        type="button"
        className={styles.moreBtn}
        onClick={() => setOpen(true)}
        aria-label="더보기"
        title="더보기"
      >
        ⋯
      </button>
      <Sheet
        open={open}
        onClose={close}
        title={mode === 'menu' ? '안전 옵션' : '신고하기'}
        description={
          mode === 'menu'
            ? `${targetNickname}님에 대해`
            : '관리자가 검토할 수 있도록 자세히 적어 주세요'
        }
        size="sm"
        variant={mode === 'menu' ? 'sheet' : 'modal'}
      >
        {mode === 'menu' ? (
          <div className={styles.safetyList}>
            {isBlocked ? (
              <button
                type="button"
                className={styles.safetyAction}
                onClick={() => unblock.mutate()}
                disabled={unblock.isPending}
              >
                <span>✅</span>
                <span className={styles.safetyBody}>
                  <strong>차단 해제</strong>
                  <small>다시 모임에서 만날 수 있게 돼요</small>
                </span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.safetyAction}
                onClick={async () => {
                  const ok = await confirm({
                    title: `${targetNickname}님을 차단할까요?`,
                    description: '같은 모임에서 만나지 않게 됩니다.',
                    confirmLabel: '차단',
                    danger: true,
                  })
                  if (ok) block.mutate()
                }}
                disabled={block.isPending}
              >
                <span>🚫</span>
                <span className={styles.safetyBody}>
                  <strong>차단하기</strong>
                  <small>같은 모임에서 만나지 않도록 양방향 회피</small>
                </span>
              </button>
            )}
            <button type="button" className={styles.safetyAction} onClick={() => setMode('report')}>
              <span>🚨</span>
              <span className={styles.safetyBody}>
                <strong>신고하기</strong>
                <small>괴롭힘 · 스팸 · 부적절한 콘텐츠</small>
              </span>
            </button>
          </div>
        ) : (
          <div className={styles.safetyForm}>
            <fieldset className={styles.kindRow}>
              <legend className={styles.kindLegend}>신고 유형</legend>
              {REPORT_KINDS.map((k) => (
                <label
                  key={k.value}
                  className={`${styles.kindChip} ${kind === k.value ? styles.kindChipActive : ''}`}
                >
                  <input
                    type="radio"
                    name="report-kind"
                    value={k.value}
                    checked={kind === k.value}
                    onChange={() => setKind(k.value)}
                  />
                  {k.label}
                </label>
              ))}
            </fieldset>
            <label className={styles.reasonField}>
              <span>자세한 내용</span>
              <textarea
                className={styles.reasonTextarea}
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 1000))}
                placeholder="어떤 일이 있었는지 적어 주세요 (최대 1000자)"
                rows={5}
              />
              <small>{reason.length} / 1000</small>
            </label>
            <div className={styles.safetyFormActions}>
              <Button variant="ghost" onClick={() => setMode('menu')}>
                뒤로
              </Button>
              <Button
                variant="primary"
                onClick={() => report.mutate()}
                isLoading={report.isPending}
                disabled={reason.trim().length < 5}
              >
                신고 접수
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}
