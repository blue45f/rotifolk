import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { normalizeTutorialStep } from '@features/tutorial/progress'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AVOID_REASON_LABEL,
  CHILDREN_POLICY_LABEL,
  CONTACT_EXCHANGE_POLICY_LABEL,
  CONNECTION_CHANNELS,
  ELIGIBILITY_REASON_LABEL,
  MARITAL_STATUS_LABEL,
  PARTY_FORMAT_LABEL,
  ROTATION_FORMAT_LABEL,
  VERIFICATION_FIELD_LABEL,
  ageFromBirthYear,
  channelsFromLegacyMode,
  checkEligibility,
  formatKRW,
  resolveParticipantPrice,
  type AvoidReason,
  type ContactExchangePolicy,
  type ConnectionChannel,
  type Party,
} from '@rotifolk/shared'
import { ShareButton } from '@features/share/ShareButton'
import { useGuestSession, useHostAddGuest } from '@features/guest/queries'
import { GuestConversionBanner } from '@features/guest/GuestConversionBanner'
import { useParty, useJoinParty, useCancelJoin } from '@features/parties/queries'
import { buildPartyEventJsonLd } from '@features/parties/partyEventJsonLd'
import { useVenue } from '@features/venues/queries'
import { useEnsurePartyRoom } from '@features/chat/queries'
import { CATEGORY_META } from '@features/categories/meta'
import { Button } from '@components/ui/Button/Button'
import { Badge } from '@components/ui/Badge/Badge'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Card } from '@components/ui/Card/Card'
import { Chip } from '@components/ui/Chip/Chip'
import { Input } from '@components/ui/Input/Input'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { AfterPartyManager } from '@features/parties/AfterPartyManager'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/useToast'
import { useAuthStore } from '@store/authStore'
import { useMyParties } from '@features/parties/queries'
import { useRecents } from '@features/recents/useRecents'
import { downloadIcs } from '@features/ics/buildIcs'
import { SITE_ORIGIN, usePageMeta } from '@hooks/usePageMeta'
import { api } from '@services/api'
import styles from './PartyDetailPage.module.css'

interface PartyReview {
  id: string
  rating: number
  body: string
  anonymous: boolean
  tags: string[]
  author: { nickname: string; avatarId: string | null }
  hostReply: string | null
  hostRepliedAt: string | null
  createdAt: string
}

interface PartyPhoto {
  id: string
  url: string
  caption: string | null
  createdAt: string
  userId: string
  uploader: { id: string; nickname: string; avatarId: string | null } | null
}

type PaymentMethod = 'card' | 'kakao' | 'toss' | 'mock'
interface PaymentRow {
  id: string
  partyId: string
  userId: string
  amountKRW: number
  status: 'pending' | 'paid' | 'refunded' | 'cancelled'
  method: PaymentMethod
  paidAt: string | null
  refundedAt: string | null
  createdAt: string
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; emoji: string }[] = [
  { value: 'card', label: '신용/체크카드', emoji: '💳' },
  { value: 'kakao', label: '카카오페이', emoji: '🟡' },
  { value: 'toss', label: '토스페이', emoji: '🔵' },
  { value: 'mock', label: '테스트 결제', emoji: '🧪' },
]

export default function PartyDetailPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const me = useAuthStore((s) => s.user)
  const { data, isLoading } = useParty(partyId)
  const join = useJoinParty(partyId!)
  const cancel = useCancelJoin(partyId!)
  const toast = useToast()
  const queryClient = useQueryClient()

  const { items: recentItems, track } = useRecents()
  const { data: myParties } = useMyParties()
  void recentItems

  // 게스트(비로그인) 방문 — 이 파티에 게스트로 참여 중이면 전환 배너를 띄운다
  const { data: guestSession } = useGuestSession(me ? undefined : partyId)
  const addGuest = useHostAddGuest(partyId)
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [newGuestName, setNewGuestName] = useState('')
  const [nowMs] = useState(() => Date.now())

  const metaParty = data?.party
  // Event JSON-LD의 location(Place)용 — 상세 응답엔 venueId만 있어 공개 단건 조회로 보강.
  const { data: metaVenue } = useVenue(metaParty?.venueId)
  usePageMeta({
    title: metaParty?.title,
    description: metaParty
      ? `${CATEGORY_META[metaParty.config.category].label} · ${metaParty.config.totalRounds}라운드 · ${metaParty.currentParticipants}/${metaParty.maxParticipants}명 — Rotifolk 로테이션 파티`
      : undefined,
    jsonLd: metaParty
      ? buildPartyEventJsonLd(
          metaParty,
          // canonical(usePageMeta)과 같은 프로덕션 정식 URL — dev 출처가 구조화 데이터에 새지 않게.
          `${SITE_ORIGIN}/parties/${metaParty.id}`,
          metaVenue?.venue,
        )
      : undefined,
  })

  const { data: saved } = useQuery({
    queryKey: ['saved', partyId],
    queryFn: () => api.get<Array<{ id: string }>>('saved'),
    enabled: !!me && !!partyId,
  })
  const isSaved = saved?.some((s) => s.id === partyId) ?? false
  const currentPath = `${location.pathname}${location.search}${location.hash}` || '/'
  const tutorialStep = normalizeTutorialStep(searchParams.get('fromTutorial'))
  const policyFromTutorial =
    tutorialStep === 'policies'
      ? '&fromTutorial=policies'
      : tutorialStep === 'policies-sync'
        ? '&fromTutorial=policies-sync'
        : ''
  const policyHref = `/policies?from=${encodeURIComponent(currentPath)}${policyFromTutorial}`

  // 지인 회피 — 같은 모임에 차단/회피/같은 회사 대상이 있으면 사전 경고 (해시 대조, 이름 비노출)
  const { data: avoidOverlaps } = useQuery({
    queryKey: ['avoid-check', partyId],
    queryFn: () =>
      api.get<Array<{ userId: string; nickname?: string; reasons: AvoidReason[] }>>(
        `me/avoid-check?partyId=${partyId}`,
      ),
    enabled: !!me && !!partyId,
  })
  const toggleSave = useMutation({
    mutationFn: () => (isSaved ? api.delete(`saved/${partyId}`) : api.post(`saved/${partyId}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved', partyId] }),
  })

  const { data: reviews } = useQuery({
    queryKey: ['reviews', partyId],
    queryFn: () => api.get<PartyReview[]>(`parties/${partyId}/reviews`),
    enabled: !!partyId,
  })

  const { data: photos } = useQuery({
    queryKey: ['party-photos', partyId],
    queryFn: () => api.get<PartyPhoto[]>(`parties/${partyId}/photos`),
    enabled: !!partyId,
  })
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoCaption, setPhotoCaption] = useState('')
  const addPhoto = useMutation({
    mutationFn: () =>
      api.post(`parties/${partyId}/photos`, {
        url: photoUrl.trim(),
        caption: photoCaption.trim() || undefined,
      }),
    onSuccess: () => {
      toast.show('사진이 추가됐어요 📸', 'success')
      setPhotoUrl('')
      setPhotoCaption('')
      queryClient.invalidateQueries({ queryKey: ['party-photos', partyId] })
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  const { data: myPayments } = useQuery({
    queryKey: ['payments', 'me', partyId],
    queryFn: () => api.get<PaymentRow[]>(`payments/me?partyId=${partyId}`),
    enabled: !!me && !!partyId,
  })
  const paidPayment = myPayments?.find((p) => p.status === 'paid') ?? null

  const [payOpen, setPayOpen] = useState(false)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('card')
  const payMutation = useMutation({
    mutationFn: (method: PaymentMethod) =>
      api.post<PaymentRow>(`payments/${partyId}/pay`, { method }),
    onSuccess: () => {
      toast.show('결제가 완료됐어요 💳', 'success')
      setPayOpen(false)
      queryClient.invalidateQueries({ queryKey: ['payments', 'me', partyId] })
      queryClient.invalidateQueries({ queryKey: ['parties', 'detail', partyId] })
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })
  const refundMutation = useMutation({
    mutationFn: (paymentId: string) => api.post<PaymentRow>(`payments/${paymentId}/refund`),
    onSuccess: () => {
      toast.show('환불이 완료됐어요', 'info')
      queryClient.invalidateQueries({ queryKey: ['payments', 'me', partyId] })
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  const [rating, setRating] = useState(5)
  const [reviewBody, setReviewBody] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const PRESET_FEEDBACK_TAGS = [
    '🎙️ 진행이 매끄러워요',
    '🏛️ 장소가 멋져요',
    '🍷 음료/페어링이 최고예요',
    '⏱️ 시간 약속이 정확해요',
    '🧡 매너가 좋고 친절해요',
    '💬 대화가 잘 통해요',
  ]

  const submitReview = useMutation({
    mutationFn: () =>
      api.post('reviews', {
        partyId,
        targetUserId: data?.party.hostId,
        rating,
        body: reviewBody.trim(),
        anonymous,
        tags: selectedTags,
      }),
    onSuccess: () => {
      toast.show('후기가 등록됐어요 ✨', 'success')
      setReviewBody('')
      setSelectedTags([])
      queryClient.invalidateQueries({ queryKey: ['reviews', partyId] })
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  const [replyOpenId, setReplyOpenId] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const submitReply = useMutation({
    mutationFn: (reviewId: string) =>
      api.patch(`reviews/${reviewId}/reply`, { body: replyBody.trim() }),
    onSuccess: () => {
      toast.show('답글이 등록됐어요 🎙️', 'success')
      setReplyBody('')
      setReplyOpenId(null)
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

  const ensureRoom = useEnsurePartyRoom()

  const handleOpenGroupChat = async () => {
    if (!partyId) return
    try {
      const room = await ensureRoom.mutateAsync(partyId)
      navigate(`/chats/${room.id}`)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleAddToCalendar = () => {
    if (!data) return
    const p = data.party
    const safe =
      p.title
        .replace(/[^\w가-힣\- ]/g, '')
        .slice(0, 40)
        .trim() || 'rotifolk-party'
    downloadIcs(
      {
        uid: `rotifolk-${p.id}@rotifolk.app`,
        title: p.title,
        description: `${p.config.category} · ${p.config.totalRounds}라운드 · ${p.currentParticipants}/${p.maxParticipants}명\n${window.location.href}`,
        startAt: p.startAt,
        endAt: p.endAt,
        url: window.location.href,
      },
      safe,
    )
    toast.show('캘린더 파일을 받았어요', 'success')
  }

  if (isLoading) return <Loading />
  if (!data) return <EmptyState emoji="🌙" title="파티를 찾을 수 없어요" />
  const { party, participants } = data
  const cat = CATEGORY_META[party.config.category]
  const start = new Date(party.startAt)
  const end = new Date(party.endAt)
  const isHost = me?.id === party.hostId
  const joinedMe = participants.find((p) => p.userId === me?.id)

  const conflict =
    me && myParties
      ? myParties
          .filter(
            (m) =>
              m.party.id !== party.id &&
              ['confirmed', 'checked-in', 'waitlist'].includes(m.participation.status),
          )
          .find((m) => {
            const s = new Date(m.party.startAt).getTime()
            // 일단 시작 시각만 비교 (endAt 없음)
            const myStart = start.getTime()
            const myEnd = end.getTime()
            // 다른 모임 시작이 내 모임 [start-2h, end+2h] 범위면 충돌
            return s >= myStart - 7200_000 && s <= myEnd + 7200_000
          })
      : undefined
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
  const isFree = party.pricing.basePriceKRW === 0
  const hoursUntilStart = (start.getTime() - nowMs) / 3_600_000
  const canRefund = !!paidPayment && hoursUntilStart >= 24

  // track recent visit (one-shot per detail page mount)
  if (party.id) {
    queueMicrotask(() => {
      try {
        track({ id: party.id, title: party.title, category: party.config.category })
      } catch {}
    })
  }

  const guestMe = !me ? (guestSession?.participation ?? null) : null

  return (
    <div className={styles.page}>
      {guestMe && (
        <div className={`container ${styles.guestBannerWrap}`}>
          <GuestConversionBanner from={`/parties/${party.id}`} />
        </div>
      )}
      {conflict && !joinedMe && (
        <div className={styles.clashBar} role="alert">
          ⚠️ 같은 시간대에 이미 신청한 모임이 있어요 — <strong>{conflict.party.title}</strong>
        </div>
      )}
      {avoidOverlaps && avoidOverlaps.length > 0 && !isHost && !joinedMe && (
        <div className={styles.avoidBar} role="alert">
          🛡️ <strong>{avoidOverlaps.length}명</strong>이 회피·차단 목록과 일치해요 (
          {[...new Set(avoidOverlaps.flatMap((o) => o.reasons))]
            .map((r) => AVOID_REASON_LABEL[r])
            .join(' · ')}
          ). 신중히 결정하세요.
        </div>
      )}
      {avoidOverlaps && avoidOverlaps.length === 0 && !isHost && (
        <div className={styles.safeBar} role="status">
          🛡️ <strong>지인 회피 안심 모임</strong> (등록된 회피 연락처/회원이 이 모임에 없습니다.)
        </div>
      )}
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
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={handleAddToCalendar}
                  aria-label="내 캘린더에 추가"
                >
                  📅 캘린더
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

            {party.tags && party.tags.length > 0 && (
              <div className={styles.tagRow}>
                {party.tags.map((t) => (
                  <Link
                    key={t}
                    to={`/discover?tag=${encodeURIComponent(t)}`}
                    className={styles.tagChip}
                  >
                    #{t.startsWith('#') ? t.slice(1) : t}
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card padding="lg">
            <h2 className={styles.h2}>참가 전에 확인해요</h2>
            <div className={styles.signalGrid}>
              <div className={styles.signal}>
                <span className={styles.signalLabel}>모임 포맷</span>
                <strong>{PARTY_FORMAT_LABEL[party.config.format]}</strong>
                <span className={styles.signalSub}>
                  {ROTATION_FORMAT_LABEL[party.config.rotationFormat]}
                  {party.config.rotationFormat !== 'one-on-one' && ` · ${party.config.groupSize}인`}
                </span>
              </div>
              <div className={styles.signal}>
                <span className={styles.signalLabel}>매칭 방식</span>
                <strong>{MATCH_SCOPE_LABEL[party.config.matchScope]}</strong>
                <span className={styles.signalSub}>
                  {MATCH_SCOPE_HELP[party.config.matchScope ?? 'mutual-only']}
                </span>
              </div>
              <div className={styles.signal}>
                <span className={styles.signalLabel}>연락처 공개 방식</span>
                <strong>
                  {
                    CONTACT_EXCHANGE_POLICY_LABEL[
                      (party.config.contactExchangePolicy as ContactExchangePolicy) ??
                        'mutual-consent'
                    ]
                  }
                </strong>
                <span className={styles.signalSub}>
                  {
                    CONTACT_EXCHANGE_HELP[
                      (party.config.contactExchangePolicy as ContactExchangePolicy) ??
                        'mutual-consent'
                    ]
                  }
                </span>
                {(party.config.groupAfterParty || false) && (
                  <span className={styles.signalSub}>종료 후 그룹채팅 개설</span>
                )}
              </div>
              <div className={styles.signal}>
                <span className={styles.signalLabel}>연결 채널</span>
                <span className={styles.signalSub}>
                  {(party.config.connectionChannels?.length
                    ? party.config.connectionChannels
                    : channelsFromLegacyMode(party.config.connectionMode)
                  )
                    .map(
                      (c: ConnectionChannel) =>
                        `${CONNECTION_CHANNELS[c].icon} ${CONNECTION_CHANNELS[c].short}`,
                    )
                    .join(' · ')}
                  {!((party.config.connectionChannels?.length || 0) > 0) && '채널 정보 없음'}
                </span>
              </div>
            </div>

            <div className={styles.recruit}>
              <div className={styles.recruitHead}>
                <span className={styles.signalLabel}>모집 현황</span>
                {party.recruitment.genderRatioTarget !== 'any' && (
                  <Badge tone="gold" size="sm" outlined>
                    목표 성비 {party.recruitment.genderRatioTarget}
                  </Badge>
                )}
              </div>
              <div className={styles.fillBar} aria-hidden="true">
                <div
                  className={styles.fillBarOn}
                  style={{
                    width: `${Math.min(100, Math.round((party.currentParticipants / Math.max(1, party.maxParticipants)) * 100))}%`,
                  }}
                />
              </div>
              <p className={styles.recruitMeta}>
                현재 <strong>{party.currentParticipants}</strong> / 최대 {party.maxParticipants}명 ·
                최소 {party.minParticipants}명
              </p>
              {party.recruitment.autoCancelAt && (
                <AutoCancelNote
                  deadlineISO={party.recruitment.autoCancelAt}
                  met={party.currentParticipants >= party.minParticipants}
                />
              )}
            </div>

            <div className={styles.shareRow}>
              <ShareButton
                title={party.title}
                category={party.config.category}
                venueArea=""
                startAtISO={party.startAt}
                currentParticipants={party.currentParticipants}
                maxParticipants={party.maxParticipants}
                inviteUrl={
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/parties/${party.id}`
                    : `/parties/${party.id}`
                }
                gradient={cat.bgGradient}
                label="이 모임 공유하기"
                variant="soft"
                fullWidth
              />
            </div>
          </Card>

          <EligibilityPriceCard party={party} />

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
                      hue={p.guestAvatar?.hue ?? 'var(--color-primary)'}
                      pattern="gradient"
                      emoji={p.guestAvatar?.emoji ?? (p.user?.nickname ?? p.guestName ?? '익')[0]}
                      imageSrc={
                        // 🎭 아바타 모드 파티는 실물 사진 대신 프리셋만 노출한다.
                        party.config.enableAvatarOnly
                          ? null
                          : (p.guestAvatar?.imageData ?? p.user?.avatarImage ?? null)
                      }
                      ring="soft"
                    />
                    <div>
                      <div className={styles.partName}>
                        {p.user?.nickname ?? p.guestName ?? '익명'}
                      </div>
                      <div className={styles.partMeta}>
                        {p.isGuest && (
                          <Badge tone="gold" size="sm">
                            🎟 게스트
                          </Badge>
                        )}
                        {p.user?.mbti && <span>{p.user.mbti}</span>}
                        {p.user?.verifiedFields?.includes('identity') && (
                          <Badge tone="info" size="sm">
                            ✓ 본인인증
                          </Badge>
                        )}
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

          {(() => {
            const canPostPhoto =
              !!me &&
              (status === 'live' || status === 'ended') &&
              (isHost || participants.some((p) => p.userId === me.id))
            const showPhotosSection = (photos && photos.length > 0) || canPostPhoto
            if (!showPhotosSection) return null
            return (
              <Card padding="lg">
                <h2 className={styles.h2}>사진 ({photos?.length ?? 0})</h2>
                {canPostPhoto && (
                  <form
                    className={styles.photoForm}
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!photoUrl.trim()) return
                      addPhoto.mutate()
                    }}
                  >
                    <input
                      type="url"
                      className={styles.photoInput}
                      placeholder="사진 URL (https://...)"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      className={styles.photoInput}
                      placeholder="설명 (선택)"
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      maxLength={120}
                    />
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={addPhoto.isPending}
                      disabled={!photoUrl.trim()}
                    >
                      추가
                    </Button>
                  </form>
                )}
                {photos && photos.length > 0 ? (
                  <ul className={styles.photoGrid}>
                    {photos
                      .filter((p) => /^https?:\/\//i.test(p.url))
                      .map((p) => (
                        <li key={p.id} className={styles.photoItem}>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className={styles.photoLink}
                            title={p.caption ?? p.uploader?.nickname ?? ''}
                          >
                            <img
                              className={styles.photoImg}
                              src={p.url}
                              alt={p.caption ?? `${p.uploader?.nickname ?? '참가자'}의 사진`}
                              loading="lazy"
                            />
                            {p.caption && <span className={styles.photoCaption}>{p.caption}</span>}
                          </a>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className={styles.muted}>아직 사진이 없어요. 참가자만 추가할 수 있어요.</p>
                )}
              </Card>
            )
          })()}

          {party.config.groupAfterParty && (status === 'live' || status === 'ended') && (
            <AfterPartyManager partyId={party.id} isHost={isHost} />
          )}

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

                  <div className={styles.feedbackTagContainer}>
                    <p className={styles.feedbackTitle}>
                      어떤 점이 가장 만족스러웠나요? (중복 선택)
                    </p>
                    <div className={styles.feedbackTagGrid}>
                      {PRESET_FEEDBACK_TAGS.map((tag) => {
                        const active = selectedTags.includes(tag)
                        return (
                          <button
                            type="button"
                            key={tag}
                            className={`${styles.feedbackTagChip} ${active ? styles.feedbackTagChipActive : ''}`}
                            onClick={() =>
                              setSelectedTags((prev) =>
                                prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                              )
                            }
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>

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
                          {'★'.repeat(r.rating)}
                          {'☆'.repeat(5 - r.rating)}
                        </span>
                        <time className={styles.muted}>
                          {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                        </time>
                      </div>
                      <p>{r.body}</p>
                      {r.tags && r.tags.length > 0 && (
                        <div className={styles.reviewTags}>
                          {r.tags.map((tag: string) => (
                            <span key={tag} className={styles.reviewTag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {r.hostReply ? (
                        <div className={styles.reply}>
                          <div className={styles.replyHead}>
                            <strong>🎙️ 호스트 답글</strong>
                            {r.hostRepliedAt && (
                              <time className={styles.muted}>
                                {new Date(r.hostRepliedAt).toLocaleDateString('ko-KR')}
                              </time>
                            )}
                          </div>
                          <p>{r.hostReply}</p>
                        </div>
                      ) : (
                        isHost && (
                          <div className={styles.reply}>
                            {replyOpenId === r.id ? (
                              <>
                                <textarea
                                  className={styles.textarea}
                                  placeholder="참가자에게 따뜻한 답글을 남겨주세요"
                                  value={replyBody}
                                  onChange={(e) => setReplyBody(e.target.value)}
                                  rows={3}
                                />
                                <div className={styles.replyActions}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setReplyOpenId(null)
                                      setReplyBody('')
                                    }}
                                  >
                                    취소
                                  </Button>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => submitReply.mutate(r.id)}
                                    isLoading={submitReply.isPending}
                                    disabled={!replyBody.trim()}
                                  >
                                    답글 등록
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <button
                                type="button"
                                className={styles.replyToggle}
                                onClick={() => {
                                  setReplyOpenId(r.id)
                                  setReplyBody('')
                                }}
                              >
                                🎙️ 답글 작성
                              </button>
                            )}
                          </div>
                        )
                      )}
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
              <li>🔄 환불: 시작 {party.pricing.refundDeadlineHours}시간 전까지 전액</li>
            </ul>
            <Link to={policyHref} className={styles.policyLink}>
              환불·취소·노쇼 정책 자세히 보기 →
            </Link>

            {isHost ? (
              <div className={styles.stack}>
                <Link to={`/host/parties/${party.id}`}>
                  <Button variant="primary" size="lg" fullWidth>
                    호스트 콘솔로 가기
                  </Button>
                </Link>
                <Button
                  variant="soft"
                  size="lg"
                  fullWidth
                  onClick={handleOpenGroupChat}
                  isLoading={ensureRoom.isPending}
                >
                  💬 단톡방 입장
                </Button>
                <Button variant="ghost" size="md" fullWidth onClick={() => setShowAddGuest(true)}>
                  🎟 게스트 추가 (현장 합류)
                </Button>
              </div>
            ) : joinedMe ? (
              <div className={styles.stack}>
                <div className={styles.joinedBadges}>
                  <Badge tone="success">
                    ✅ 신청 완료 — {joinedMe.status === 'waitlist' ? '대기' : '확정'}
                  </Badge>
                  {paidPayment && <Badge tone="gold">💳 결제 완료</Badge>}
                </div>
                <Button
                  variant="soft"
                  size="lg"
                  fullWidth
                  onClick={handleOpenGroupChat}
                  isLoading={ensureRoom.isPending}
                >
                  💬 단톡방 입장
                </Button>
                {status === 'live' && (
                  <Link to={`/live/${party.id}`}>
                    <Button variant="gold" size="lg" fullWidth>
                      🔴 라이브 입장
                    </Button>
                  </Link>
                )}
                {!isFree && !paidPayment && (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => {
                      setPayMethod('card')
                      setPayOpen(true)
                    }}
                  >
                    결제하기 ({party.pricing.basePriceKRW.toLocaleString()}원)
                  </Button>
                )}
                {paidPayment && canRefund && (
                  <Button
                    variant="ghost"
                    size="md"
                    fullWidth
                    isLoading={refundMutation.isPending}
                    onClick={() => refundMutation.mutate(paidPayment.id)}
                  >
                    환불 요청
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={() =>
                    cancel.mutate(undefined, {
                      onSuccess: () => toast.show('신청을 취소했어요', 'info'),
                    })
                  }
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
                hue="var(--color-primary)"
                pattern="gradient"
                emoji={party.host?.nickname?.[0]}
                imageSrc={party.host?.avatarImage ?? null}
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

            {(() => {
              const hostFeedbackCounts = (reviews ?? []).reduce<Record<string, number>>(
                (acc, rev) => {
                  if (rev.tags) {
                    rev.tags.forEach((tag: string) => {
                      acc[tag] = (acc[tag] || 0) + 1
                    })
                  }
                  return acc
                },
                {},
              )

              const sortedHostFeedbacks = Object.entries(hostFeedbackCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)

              if (sortedHostFeedbacks.length === 0) return null

              return (
                <div className={styles.hostFeedbackSummary}>
                  <div className={styles.hostFeedbackTitle}>참가자들이 꼽은 호스트 매력</div>
                  <div className={styles.hostFeedbackGrid}>
                    {sortedHostFeedbacks.map(([tag, count]) => (
                      <span key={tag} className={styles.hostFeedbackBadge}>
                        {tag} <span className={styles.hostFeedbackCount}>{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })()}
          </Card>
        </aside>
      </div>

      <Sheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="결제 수단 선택"
        description={`${party.pricing.basePriceKRW.toLocaleString()}원을 결제할 수단을 골라주세요`}
        variant="modal"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayOpen(false)}>
              취소
            </Button>
            <Button
              variant="primary"
              isLoading={payMutation.isPending}
              onClick={() => payMutation.mutate(payMethod)}
            >
              {party.pricing.basePriceKRW.toLocaleString()}원 결제하기
            </Button>
          </>
        }
      >
        <div className={styles.payMethodGrid}>
          {PAYMENT_METHODS.map((m) => (
            <Chip
              key={m.value}
              leadingEmoji={m.emoji}
              selected={payMethod === m.value}
              onClick={() => setPayMethod(m.value)}
            >
              {m.label}
            </Chip>
          ))}
        </div>
        <p className={styles.payNote}>※ 실제 결제는 발생하지 않는 시뮬레이션이에요.</p>
      </Sheet>

      <Sheet
        open={showAddGuest}
        onClose={() => setShowAddGuest(false)}
        title="🎟 게스트 추가"
        description="가입 없이 현장에서 합류한 분을 이름만으로 등록해요 (아바타 자동 배정)"
        variant="modal"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddGuest(false)}>
              취소
            </Button>
            <Button
              variant="primary"
              isLoading={addGuest.isPending}
              disabled={!newGuestName.trim()}
              onClick={async () => {
                try {
                  await addGuest.mutateAsync(newGuestName.trim())
                  toast.show(`${newGuestName.trim()}님을 게스트로 등록했어요`, 'success')
                  setNewGuestName('')
                  setShowAddGuest(false)
                } catch (e) {
                  toast.show((e as Error).message, 'error')
                }
              }}
            >
              등록하기
            </Button>
          </>
        }
      >
        <Input
          label="게스트 이름"
          placeholder="현장에서 부를 이름 (최대 16자)"
          maxLength={16}
          value={newGuestName}
          onChange={(e) => setNewGuestName(e.target.value)}
          hint="등록 즉시 체크인 상태로 로스터와 라운드 편성에 포함돼요"
          autoFocus
        />
      </Sheet>
    </div>
  )
}

const MATCH_SCOPE_LABEL: Record<string, string> = {
  'mutual-only': '상호 매칭만',
  'top-n': '상위 N명 연결',
  'all-participants': '참가자 전원 연결',
  'mutual-plus-top-n': '상호+상위 N명 연결',
}
const MATCH_SCOPE_HELP: Record<string, string> = {
  'mutual-only': '서로가 상대를 골랐을 때만 공개',
  'top-n': '누적 호감 상위 N명을 보완 연결',
  'all-participants': '전원과 연결로 사전 압박을 낮춤',
  'mutual-plus-top-n': '상호 먼저, 부족하면 상위 N명으로 보완',
}
const CONTACT_EXCHANGE_HELP: Record<ContactExchangePolicy, string> = {
  'mutual-consent': '양쪽이 모두 공개 동의해야 외부 채널이 보입니다.',
  'chat-only': '안전하게 앱 내 채팅만 우선 공개합니다.',
  'open-after-match': '매칭 성사 즉시 지정 채널을 공개합니다.',
  'request-approval': '채팅은 바로 열리고, 외부 연락처는 요청 후 상대 승인으로 공개됩니다.',
}

function EligibilityPriceCard({ party }: { party: Party }) {
  const me = useAuthStore((s) => s.user)
  const reqV = party.requiredVerifications ?? []
  const marital = party.maritalRequirement ?? []
  const childrenPolicy = party.childrenPolicy ?? 'any'
  const ageFields = {
    ageMin: party.ageMin,
    ageMax: party.ageMax,
    maleAgeMin: party.maleAgeMin,
    maleAgeMax: party.maleAgeMax,
    femaleAgeMin: party.femaleAgeMin,
    femaleAgeMax: party.femaleAgeMax,
  }
  const hasAge = Object.values(ageFields).some((x) => x != null)
  const rules = party.pricing.pricingRules ?? []
  const hasConditions = reqV.length > 0 || marital.length > 0 || childrenPolicy !== 'any' || hasAge

  const myAge = me ? ageFromBirthYear(me.birthYear ?? null, new Date().getFullYear()) : null
  const myPrice = me
    ? resolveParticipantPrice(party.pricing.basePriceKRW, rules, { gender: me.gender, age: myAge })
    : null
  const showMyPrice = !!me && rules.length > 0 && myPrice !== party.pricing.basePriceKRW

  const elig =
    me && hasConditions
      ? checkEligibility(
          {
            ...ageFields,
            requiredVerifications: reqV,
            maritalRequirement: marital,
            childrenPolicy,
          },
          {
            gender: me.gender,
            age: myAge,
            maritalStatus: me.maritalStatus,
            hasChildren: me.hasChildren,
            verifiedFields: me.verifiedFields,
          },
        )
      : null

  if (!hasConditions && !showMyPrice) return null

  const ageRange = (lo?: number | null, hi?: number | null) =>
    lo != null || hi != null ? `${lo ?? ''}~${hi ?? ''}세` : null
  const ageParts: string[] = []
  const m = ageRange(party.maleAgeMin, party.maleAgeMax)
  const f = ageRange(party.femaleAgeMin, party.femaleAgeMax)
  const common = ageRange(party.ageMin, party.ageMax)
  if (m) ageParts.push(`남 ${m}`)
  if (f) ageParts.push(`여 ${f}`)
  if (!m && !f && common) ageParts.push(common)

  return (
    <Card padding="lg">
      <h2 className={styles.h2}>참가 자격{showMyPrice ? ' · 내 참가비' : ''}</h2>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          margin: 'var(--space-3) 0',
        }}
      >
        {ageParts.length > 0 && (
          <Badge tone="wine" outlined>
            🎂 {ageParts.join(' · ')}
          </Badge>
        )}
        {marital.length > 0 && (
          <Badge tone="wine" outlined>
            💍 {marital.map((x) => MARITAL_STATUS_LABEL[x]).join('·')}
          </Badge>
        )}
        {childrenPolicy !== 'any' && (
          <Badge tone="wine" outlined>
            👶 {CHILDREN_POLICY_LABEL[childrenPolicy]}
          </Badge>
        )}
        {reqV.map((v) => (
          <Badge key={v} tone="gold" outlined>
            ✓ {VERIFICATION_FIELD_LABEL[v]} 인증
          </Badge>
        ))}
      </div>
      {showMyPrice && (
        <p className={styles.muted}>
          내 참가비{' '}
          <strong style={{ color: 'var(--color-primary)' }}>{formatKRW(myPrice ?? 0)}</strong> (기본{' '}
          {formatKRW(party.pricing.basePriceKRW)})
        </p>
      )}
      {elig && !elig.ok && (
        <p
          style={{
            marginTop: 'var(--space-2)',
            fontSize: 'var(--fs-sm)',
            color: 'var(--brand-burgundy-700)',
          }}
        >
          ⚠️ 지금은 참가 조건을 충족하지 않아요 (
          {elig.reasons.map((r) => ELIGIBILITY_REASON_LABEL[r]).join(', ')}). 프로필·인증을 채우면
          참가할 수 있어요.
        </p>
      )}
    </Card>
  )
}

function AutoCancelNote({ deadlineISO, met }: { deadlineISO: string; met: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const ms = new Date(deadlineISO).getTime() - now
  if (ms <= 0) return null
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  const fmt = h > 0 ? `${h}시간 ${m}분` : `${m}분 ${s}초`
  return (
    <p className={`${styles.autoCancel} ${met ? '' : styles.autoCancelRisk}`}>
      {met ? '⏳' : '⚠️'} 마감까지 {fmt} · 이때까지 인원·성비가 차지 않으면 자동 취소돼요
    </p>
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
