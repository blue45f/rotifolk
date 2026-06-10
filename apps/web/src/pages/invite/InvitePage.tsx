import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { GUEST_AVATAR_PRESETS, pickGuestAvatar, type PartyCategory } from '@rotifolk/shared'
import { api } from '@services/api'
import { CATEGORY_META } from '@features/categories/meta'
import { useGuestJoin, useGuestSession } from '@features/guest/queries'
import { GuestConversionBanner } from '@features/guest/GuestConversionBanner'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { Input } from '@components/ui/Input/Input'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { useAuthStore } from '@store/authStore'
import styles from './Invite.module.css'

interface InvitePreview {
  id: string
  title: string
  startAt: string
  venueArea: string
  category: PartyCategory
  quickCode: string
  status?: string
  currentParticipants?: number
  maxParticipants?: number
}

export default function InvitePage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const me = useAuthStore((s) => s.user)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['invite', code],
    queryFn: () => api.get<InvitePreview>(`parties/by-code/${code}`),
    enabled: !!code,
    retry: 0,
  })

  // 게스트 재방문 식별 — 이 파티에 이미 게스트로 참여 중인지
  const { data: guestSession } = useGuestSession(data?.id)
  const guestJoin = useGuestJoin(data?.id)

  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [presetIdx, setPresetIdx] = useState<number | null>(null)

  if (isLoading) return <Loading label="초대장을 여는 중" />
  if (isError || !data) {
    return (
      <div className={styles.page}>
        <div className={`container ${styles.empty}`}>
          <EmptyState
            emoji="🌙"
            title="만료됐거나 잘못된 초대 코드예요"
            description="호스트에게 새 링크를 받아보세요."
          />
        </div>
      </div>
    )
  }

  const cat = CATEGORY_META[data.category]
  const start = new Date(data.startAt)
  const startLabel = start.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  const nowMs = Date.now()
  const diffMs = start.getTime() - nowMs
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const countdownLabel =
    diffMs < 0
      ? '진행 중'
      : diffMs < 2 * 60 * 60 * 1000
        ? '곧 시작'
        : diffDays === 0
          ? '오늘 시작'
          : `D-${diffDays}`

  const guestParticipation = guestJoin.data?.participation ?? guestSession?.participation ?? null
  const guestAvatarPreview =
    presetIdx != null
      ? GUEST_AVATAR_PRESETS[presetIdx]
      : pickGuestAvatar(guestName.trim() || 'guest')

  const handleJoin = () => {
    if (!me) {
      toast.show('로그인하고 합류해요', 'info')
      navigate('/login', { state: { from: `/parties/${data.id}` } })
      return
    }
    navigate(`/parties/${data.id}`)
  }

  const handleGuestJoin = async () => {
    const nickname = guestName.trim()
    if (!nickname) {
      toast.show('닉네임을 입력해 주세요', 'warning')
      return
    }
    try {
      await guestJoin.mutateAsync({ nickname, avatar: guestAvatarPreview })
      toast.show('게스트로 합류했어요 🎟', 'success')
      setShowGuestForm(false)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(data.quickCode)
      toast.show('초대 코드를 복사했어요', 'success')
    } catch {
      toast.show('복사에 실패했어요', 'error')
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    const shareText = `${data.title}\n${startLabel} · ${data.venueArea}\n초대 코드: ${data.quickCode}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: data.title,
          text: shareText,
          url,
        })
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${url}`)
        toast.show('초대 링크를 복사했어요', 'success')
      }
    } catch {
      // user cancelled
    }
  }

  return (
    <div className={styles.page}>
      <div className={`container ${styles.wrap}`}>
        {!me && guestParticipation && <GuestConversionBanner from={`/invite/${code}`} />}

        <Card padding="none" className={styles.card}>
          <div className={styles.banner} style={{ background: cat.bgGradient }}>
            <div className={styles.bannerInner}>
              <div className={styles.emoji} aria-hidden="true">
                {cat.emoji}
              </div>
              <div className={styles.kickerRow}>
                <p className={styles.kicker}>친구가 모임에 초대했어요</p>
                <span className={styles.countdown}>{countdownLabel}</span>
              </div>
              <h1 className={styles.title}>{data.title}</h1>
              <div className={styles.metaRow}>
                <span className={styles.metaItem}>
                  <span className={styles.metaIcon} aria-hidden="true">
                    🗓
                  </span>
                  {startLabel}
                </span>
                <span className={styles.metaItem}>
                  <span className={styles.metaIcon} aria-hidden="true">
                    📍
                  </span>
                  {data.venueArea}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.body}>
            <button
              type="button"
              className={styles.codeBlock}
              onClick={handleCopyCode}
              aria-label={`초대 코드 ${data.quickCode} 복사`}
            >
              <span className={styles.codeLabel}>초대 코드</span>
              <span className={styles.codeValue}>{data.quickCode}</span>
              <span className={styles.codeHint}>탭하면 복사돼요</span>
            </button>

            {guestParticipation && !me ? (
              <div className={styles.guestJoined} role="status">
                <Avatar
                  size="md"
                  hue={guestParticipation.guestAvatar?.hue ?? '#7A1F3D'}
                  pattern="gradient"
                  emoji={guestParticipation.guestAvatar?.emoji ?? '🎟'}
                  ring="gold"
                />
                <div className={styles.guestJoinedBody}>
                  <strong>
                    {guestParticipation.guestName}님, 게스트로 참여 중이에요{' '}
                    <Badge tone="gold" size="sm">
                      게스트
                    </Badge>
                  </strong>
                  <span>당일 현장에서 호스트에게 닉네임을 알려주면 바로 체크인할 수 있어요.</span>
                </div>
              </div>
            ) : (
              <>
                <Button variant="gold" size="xl" fullWidth onClick={handleJoin}>
                  ✨ 참여하기
                </Button>
                {!me && (
                  <Button variant="soft" size="md" fullWidth onClick={() => setShowGuestForm(true)}>
                    🎟 가입 없이 게스트로 참여
                  </Button>
                )}
              </>
            )}

            <Button variant="ghost" size="md" fullWidth onClick={handleShare}>
              ↗ 친구에게 공유
            </Button>

            {!me && !guestParticipation && (
              <p className={styles.notice}>
                지금은 미리보기예요. 로그인 없이도 닉네임만으로 게스트 참여가 가능해요.
              </p>
            )}
          </div>
        </Card>

        {!me && guestParticipation && (
          <p className={styles.notice}>
            게스트 참여는 이 기기에서만 기억돼요.{' '}
            <Link to="/signup" className={styles.noticeLink}>
              계정을 만들면
            </Link>{' '}
            기록이 안전하게 저장돼요.
          </p>
        )}
      </div>

      <Sheet
        open={showGuestForm}
        onClose={() => setShowGuestForm(false)}
        title="🎟 게스트로 참여"
        description="가입 없이 닉네임과 아바타만으로 합류해요"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowGuestForm(false)}>
              취소
            </Button>
            <Button
              variant="gold"
              onClick={handleGuestJoin}
              isLoading={guestJoin.isPending}
              disabled={!guestName.trim()}
            >
              게스트로 합류
            </Button>
          </>
        }
      >
        <div className={styles.guestForm}>
          <Input
            label="닉네임"
            placeholder="모임에서 부를 이름 (최대 16자)"
            maxLength={16}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            hint="실명이 아니어도 괜찮아요"
            autoFocus
          />
          <fieldset className={styles.presetField}>
            <legend className={styles.presetLegend}>아바타 고르기</legend>
            <div className={styles.presetRow} role="group" aria-label="아바타 프리셋">
              {GUEST_AVATAR_PRESETS.map((preset, i) => (
                <button
                  key={`${preset.emoji}-${preset.hue}`}
                  type="button"
                  className={`${styles.presetBtn} ${presetIdx === i ? styles.presetBtnOn : ''}`}
                  aria-pressed={presetIdx === i}
                  aria-label={`아바타 ${preset.emoji}`}
                  onClick={() => setPresetIdx(i)}
                >
                  <Avatar size="md" hue={preset.hue} pattern="gradient" emoji={preset.emoji} />
                </button>
              ))}
            </div>
            <p className={styles.presetHint}>
              고르지 않으면 닉네임에 어울리는 아바타가 자동 배정돼요
            </p>
          </fieldset>
        </div>
      </Sheet>
    </div>
  )
}
