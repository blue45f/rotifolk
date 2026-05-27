import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParty, useJoinParty, useCancelJoin } from '@features/parties/queries'
import { CATEGORY_META } from '@features/categories/meta'
import { Button } from '@components/ui/Button/Button'
import { Badge } from '@components/ui/Badge/Badge'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Card } from '@components/ui/Card/Card'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { useAuthStore } from '@store/authStore'
import { api } from '@services/api'
import styles from './PartyDetailPage.module.css'

interface PartyReview {
  id: string
  rating: number
  body: string
  anonymous: boolean
  tags: string[]
  author: { nickname: string; avatarId: string | null }
  createdAt: string
}

export default function PartyDetailPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.user)
  const { data, isLoading } = useParty(partyId)
  const join = useJoinParty(partyId!)
  const cancel = useCancelJoin(partyId!)
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: saved } = useQuery({
    queryKey: ['saved', partyId],
    queryFn: () => api.get<Array<{ id: string }>>('saved'),
    enabled: !!me && !!partyId,
  })
  const isSaved = saved?.some((s) => s.id === partyId) ?? false
  const toggleSave = useMutation({
    mutationFn: () =>
      isSaved ? api.delete(`saved/${partyId}`) : api.post(`saved/${partyId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved', partyId] }),
  })

  const { data: reviews } = useQuery({
    queryKey: ['reviews', partyId],
    queryFn: () => api.get<PartyReview[]>(`parties/${partyId}/reviews`),
    enabled: !!partyId,
  })

  const [rating, setRating] = useState(5)
  const [reviewBody, setReviewBody] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const submitReview = useMutation({
    mutationFn: () =>
      api.post('reviews', {
        partyId,
        targetUserId: data?.party.hostId,
        rating,
        body: reviewBody.trim(),
        anonymous,
      }),
    onSuccess: () => {
      toast.show('후기가 등록됐어요 ✨', 'success')
      setReviewBody('')
      queryClient.invalidateQueries({ queryKey: ['reviews', partyId] })
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  const handleShare = async () => {
    const url = window.location.href
    const title = data?.party.title ?? 'Rotifolk 파티'
    try {
      if (navigator.share) {
        await navigator.share({ title, text: '같이 가실래요?', url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.show('링크를 복사했어요', 'success')
      }
    } catch {
      // user cancelled
    }
  }

  if (isLoading) return <Loading />
  if (!data) return <EmptyState emoji="🌙" title="파티를 찾을 수 없어요" />
  const { party, participants } = data
  const cat = CATEGORY_META[party.config.category]
  const start = new Date(party.startAt)
  const isHost = me?.id === party.hostId
  const joinedMe = participants.find((p) => p.userId === me?.id)
  const toneMap: Record<string, 'wine' | 'coffee' | 'tea' | 'whisky' | 'gold' | 'primary'> = {
    wine: 'wine',
    coffee: 'coffee',
    tea: 'tea',
    whisky: 'whisky',
    'natural-wine': 'gold',
  }
  const tone = toneMap[party.config.category] ?? 'primary'

  const isFull = party.currentParticipants >= party.maxParticipants
  const status = party.status

  return (
    <div className={styles.page}>
      <motion.section
        className={styles.hero}
        style={{ background: cat.bgGradient }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className={`container ${styles.heroInner}`}>
          {party.coverImageUrl && (
            <img className={styles.coverImg} src={party.coverImageUrl} alt="" />
          )}
          <div className={styles.heroBody}>
            <div className={styles.heroChips}>
              <Badge tone={tone} size="md">
                {cat.emoji} {cat.label}
              </Badge>
              {status === 'open' && !isFull && (
                <Badge tone="success" size="md">
                  모집 중
                </Badge>
              )}
              {isFull && status === 'open' && (
                <Badge tone="warning" size="md">
                  대기 가능
                </Badge>
              )}
              {status === 'live' && (
                <Badge tone="danger" size="md">
                  🔴 LIVE
                </Badge>
              )}
            </div>
            <h1 className={styles.heroTitle}>{party.title}</h1>
            <div className={styles.heroMeta}>
              <span>
                {start.toLocaleString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <div className={styles.heroActions}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={handleShare}
                  aria-label="공유"
                >
                  ↗ 공유
                </button>
                {me && (
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${isSaved ? styles.iconBtnActive : ''}`}
                    onClick={() => toggleSave.mutate()}
                    aria-pressed={isSaved}
                    aria-label="북마크"
                  >
                    {isSaved ? '★ 저장됨' : '☆ 저장'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <div className={`container ${styles.body}`}>
        <div className={styles.main}>
          <Card padding="lg">
            <h2 className={styles.h2}>이 파티는요</h2>
            <p className={styles.desc}>{party.description}</p>

            <div className={styles.specs}>
              <div className={styles.spec}>
                <span>라운드</span>
                <strong>{party.config.totalRounds}라운드</strong>
              </div>
              <div className={styles.spec}>
                <span>한 라운드</span>
                <strong>{Math.round(party.config.roundDurationSec / 60)}분</strong>
              </div>
              <div className={styles.spec}>
                <span>매칭 방식</span>
                <strong>{ROTATION_LABEL[party.config.rotationMode]}</strong>
              </div>
              <div className={styles.spec}>
                <span>정원</span>
                <strong>
                  {party.minParticipants} ~ {party.maxParticipants}명
                </strong>
              </div>
            </div>

            <div className={styles.featChips}>
              {party.config.enableQuiz && <Badge tone="primary">🎯 라이브 퀴즈</Badge>}
              {party.config.enableQuestionCards && <Badge tone="primary">🃏 질문 카드</Badge>}
              {party.config.enableMidMatching && <Badge tone="primary">💖 라운드 호감 표시</Badge>}
              {party.config.enableFinalMatching && <Badge tone="gold">💌 최종 매칭</Badge>}
              {party.config.enableLiveOrders && <Badge tone="primary">🍷 라이브 주문</Badge>}
              {party.config.enableAvatarOnly && <Badge tone="primary">🎭 아바타 모드</Badge>}
            </div>
          </Card>

          <Card padding="lg">
            <h2 className={styles.h2}>참가자 ({participants.length})</h2>
            {participants.length === 0 ? (
              <p className={styles.muted}>아직 첫 참가자를 기다리고 있어요.</p>
            ) : (
              <div className={styles.partList}>
                {participants.map((p) => (
                  <div key={p.id} className={styles.part}>
                    <Avatar
                      size="lg"
                      hue="#7A1F3D"
                      pattern="gradient"
                      emoji={p.user?.nickname?.[0]}
                      ring="soft"
                    />
                    <div>
                      <div className={styles.partName}>{p.user?.nickname ?? '익명'}</div>
                      <div className={styles.partMeta}>
                        {p.user?.mbti && <span>{p.user.mbti}</span>}
                        {p.status === 'checked-in' && (
                          <Badge tone="success" size="sm">
                            체크인
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {(reviews && reviews.length > 0) || (status === 'ended' && joinedMe) ? (
            <Card padding="lg">
              <h2 className={styles.h2}>후기</h2>
              {status === 'ended' && joinedMe && (
                <div className={styles.reviewForm}>
                  <p className={styles.muted}>이번 모임은 어땠어요?</p>
                  <div className={styles.starRow} role="radiogroup" aria-label="별점">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        className={`${styles.star} ${n <= rating ? styles.starOn : ''}`}
                        onClick={() => setRating(n)}
                        role="radio"
                        aria-checked={n === rating}
                        aria-label={`${n}점`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    className={styles.textarea}
                    placeholder="어떤 점이 좋았나요?"
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    rows={3}
                  />
                  <label className={styles.anonRow}>
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                    />
                    익명으로 작성
                  </label>
                  <Button
                    variant="primary"
                    onClick={() => submitReview.mutate()}
                    isLoading={submitReview.isPending}
                    disabled={!reviewBody.trim()}
                  >
                    후기 등록
                  </Button>
                </div>
              )}
              {reviews && reviews.length > 0 && (
                <ul className={styles.reviewList}>
                  {reviews.map((r) => (
                    <li key={r.id}>
                      <div className={styles.reviewHead}>
                        <strong>{r.author.nickname}</strong>
                        <span className={styles.reviewStars} aria-label={`${r.rating}점`}>
                          {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                        </span>
                        <time className={styles.muted}>
                          {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                        </time>
                      </div>
                      <p>{r.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}
        </div>

        <aside className={styles.aside}>
          <Card padding="lg" variant="glass" className={styles.bookCard}>
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>참가비</span>
              <strong className={styles.priceVal}>
                {party.pricing.basePriceKRW.toLocaleString()}원
              </strong>
            </div>
            <ul className={styles.included}>
              <li>🍷 {DRINK_PACKAGE_LABEL[party.pricing.drinkPackage]}</li>
              <li>🍴 {SNACK_PACKAGE_LABEL[party.pricing.snackPackage]}</li>
              <li>🔄 환불: {party.pricing.refundDeadlineHours}시간 전까지</li>
            </ul>

            {isHost ? (
              <Link to={`/host/parties/${party.id}`}>
                <Button variant="primary" size="lg" fullWidth>
                  호스트 콘솔로 가기
                </Button>
              </Link>
            ) : joinedMe ? (
              <div className={styles.stack}>
                <Badge tone="success">✅ 신청 완료 — {joinedMe.status === 'waitlist' ? '대기' : '확정'}</Badge>
                {status === 'live' && (
                  <Link to={`/live/${party.id}`}>
                    <Button variant="gold" size="lg" fullWidth>
                      🔴 라이브 입장
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={() => cancel.mutate(undefined, {
                    onSuccess: () => toast.show('신청을 취소했어요', 'info'),
                  })}
                >
                  신청 취소
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                isLoading={join.isPending}
                onClick={() => {
                  if (!me) {
                    toast.show('로그인이 필요해요', 'warning')
                    navigate('/login', { state: { from: `/parties/${party.id}` } })
                    return
                  }
                  join.mutate(undefined, {
                    onSuccess: () => toast.show('신청 완료! 곧 만나요 ✨', 'success'),
                    onError: (e) => toast.show((e as Error).message, 'error'),
                  })
                }}
              >
                {status === 'open' ? '참가 신청' : status === 'full' ? '대기 신청' : '신청 마감'}
              </Button>
            )}
          </Card>

          <Card padding="lg">
            <h3 className={styles.h3}>호스트</h3>
            <Link to={`/hosts/${party.hostId}`} className={styles.hostBlock}>
              <Avatar
                size="lg"
                hue="#7A1F3D"
                pattern="gradient"
                emoji={party.host?.nickname?.[0]}
                ring="glow"
              />
              <div>
                <div className={styles.partName}>
                  {party.host?.nickname ?? '호스트'}
                  {party.host?.isVerified && <Badge tone="info">✓ 인증</Badge>}
                </div>
                {party.host?.bio && <p className={styles.muted}>{party.host.bio}</p>}
                <p className={styles.hostLink}>프로필 보기 →</p>
              </div>
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  )
}

const ROTATION_LABEL: Record<string, string> = {
  'round-robin-pair': '1:1 라운드 로빈',
  'round-robin-trio': '3인 1조 로테이션',
  'speed-circle': '스피드 서클',
  'random-shuffle': '랜덤 셔플',
  'host-curated': '호스트 큐레이션',
}

const DRINK_PACKAGE_LABEL: Record<string, string> = {
  none: '음료 제공 없음',
  'per-glass': '잔당 결제 — 메뉴에서 추가 주문',
  unlimited: '무제한 음료 (시간 내 리필 자유)',
  paired: '라운드별 페어링 음료 코스',
}
const SNACK_PACKAGE_LABEL: Record<string, string> = {
  none: '안주 별도 주문 (또는 외부)',
  'per-plate': '접시당 결제 — 메뉴에서 추가 주문',
  course: '셰프 코스 (정해진 시점)',
  'pairing-bites': '음료 페어링 바이트 포함',
}
