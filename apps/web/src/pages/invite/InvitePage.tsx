import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/useToast'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Icon } from '@components/ui/Icon/Icon'
import { Input } from '@components/ui/Input/Input'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { GUEST_AVATAR_PRESETS, pickGuestAvatar, type PartyCategory } from '@rotifolk/shared'
import { useAuthStore } from '@store/authStore'
import { useQuery } from '@tanstack/react-query'
import { useRef, useState, type ChangeEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

import styles from './Invite.module.css'

import { resizeAvatarImage } from '@/domains/avatar/imageUpload'
import { CATEGORY_META } from '@/domains/categories/meta'
import { GuestConversionBanner } from '@/domains/guest/GuestConversionBanner'
import { useGuestJoin, useGuestSession } from '@/domains/guest/queries'
import { api } from '@/infrastructure/api'

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
  // 직접 올린 아바타 사진(data URL) — null이면 프리셋으로 폴백.
  const [guestImage, setGuestImage] = useState<string | null>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const [nowMs] = useState(() => Date.now())
  // 스크린리더용 라이브 안내 ("복사했어요" 등) — 토스트와 함께 또렷이 읽어 준다.
  const [liveMessage, setLiveMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (isLoading) return <Loading label="초대장을 여는 중" />
  if (isError || !data) {
    return (
      <main className={styles.page}>
        <div className={`container ${styles.empty}`}>
          <EmptyState
            emoji="🌙"
            title="만료됐거나 잘못된 초대 코드예요"
            description="호스트에게 새 링크를 받아보세요."
          />
        </div>
      </main>
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
  const guestAvatarBase =
    presetIdx != null
      ? GUEST_AVATAR_PRESETS[presetIdx]
      : pickGuestAvatar(guestName.trim() || 'guest')
  // 사진을 올렸으면 프리셋 위에 imageData를 얹는다 — 지우면 프리셋으로 자연 폴백.
  const guestAvatarPreview = guestImage
    ? { ...guestAvatarBase, imageData: guestImage }
    : guestAvatarBase

  const handleJoin = () => {
    if (!me) {
      toast.show('로그인하고 합류해요', 'info')
      navigate('/login', { state: { from: `/parties/${data.id}` } })
      return
    }
    navigate(`/parties/${data.id}`)
  }

  const isEditingGuestAvatar = !!guestParticipation

  const handleGuestJoin = async () => {
    const nickname = guestName.trim()
    if (!nickname) {
      toast.show('닉네임을 입력해 주세요', 'warning')
      return
    }
    try {
      await guestJoin.mutateAsync({ nickname, avatar: guestAvatarPreview })
      toast.show(
        isEditingGuestAvatar ? '아바타를 업데이트했어요 ✨' : '게스트로 합류했어요 🎟',
        'success'
      )
      setShowGuestForm(false)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  /** 이미 합류한 게스트의 아바타 변경 — 현재 닉네임/사진/프리셋을 채워 폼을 다시 연다. */
  const openGuestAvatarEditor = () => {
    const current = guestParticipation?.guestAvatar
    setGuestName(guestParticipation?.guestName ?? guestName)
    setGuestImage(current?.imageData ?? null)
    // 기존 프리셋을 다시 선택해 두면 사진을 지웠을 때 원래 모습으로 돌아간다.
    const idx = current
      ? GUEST_AVATAR_PRESETS.findIndex((p) => p.emoji === current.emoji && p.hue === current.hue)
      : -1
    setPresetIdx(idx >= 0 ? idx : null)
    setShowGuestForm(true)
  }

  const onPickGuestFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일을 다시 골라도 onChange가 다시 뜨도록 초기화
    if (!file) return
    setImageBusy(true)
    try {
      setGuestImage(await resizeAvatarImage(file))
    } catch (err) {
      toast.show((err as Error).message, 'error')
    } finally {
      setImageBusy(false)
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(data.quickCode)
      toast.show('초대 코드를 복사했어요', 'success')
      setLiveMessage(`초대 코드 ${data.quickCode}를 복사했어요`)
    } catch {
      toast.show('복사에 실패했어요', 'error')
      setLiveMessage('복사에 실패했어요')
    }
  }

  const handleShare = async () => {
    const url = globalThis.location.href
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
        setLiveMessage('초대 링크를 복사했어요')
      }
    } catch {
      // user cancelled
    }
  }

  return (
    <main className={styles.page}>
      {/* 스크린리더 전용 라이브 안내 영역 */}
      <p className={styles.srOnly} role="status" aria-live="polite">
        {liveMessage}
      </p>

      <div className={`container ${styles.wrap}`}>
        {!me && guestParticipation && <GuestConversionBanner from={`/invite/${code}`} />}

        <Card padding="none" className={styles.card}>
          <header className={styles.banner} style={{ background: cat.bgGradient }}>
            <div className={styles.bannerInner}>
              <div className={styles.emoji} aria-hidden="true">
                {cat.emoji}
              </div>
              <div className={styles.kickerRow}>
                <p className={styles.kicker}>
                  <Icon name="mail" aria-hidden="true" className={styles.kickerIcon} />
                  친구가 모임에 초대했어요
                </p>
                <span className={styles.countdown}>
                  <Icon name="clock" aria-hidden="true" />
                  {countdownLabel}
                </span>
              </div>
              <h1 className={styles.title}>{data.title}</h1>
              <p className={styles.metaRow}>
                <span className={styles.metaItem}>
                  <span className={styles.metaIcon} aria-hidden="true">
                    🗓
                  </span>
                  {startLabel}
                </span>
                <span className={styles.metaItem}>
                  <Icon name="pin" aria-hidden="true" className={styles.metaIcon} />
                  {data.venueArea}
                </span>
              </p>
            </div>
          </header>

          <div className={styles.body}>
            <section className={styles.codeSection} aria-labelledby="invite-code-label">
              <button
                type="button"
                className={styles.codeBlock}
                onClick={handleCopyCode}
                aria-label={`초대 코드 ${data.quickCode} 복사하기`}
              >
                <span id="invite-code-label" className={styles.codeLabel}>
                  초대 코드
                </span>
                <span className={styles.codeValue}>{data.quickCode}</span>
                <span className={styles.codeHint}>
                  <Icon name="bookmark" aria-hidden="true" />
                  탭하면 복사돼요
                </span>
              </button>
            </section>

            <div className={styles.actions}>
              {guestParticipation && !me ? (
                <div className={styles.guestJoined} role="status">
                  <Avatar
                    size="md"
                    hue={guestParticipation.guestAvatar?.hue ?? 'var(--color-primary)'}
                    pattern="gradient"
                    emoji={guestParticipation.guestAvatar?.emoji ?? '🎟'}
                    imageSrc={guestParticipation.guestAvatar?.imageData ?? null}
                    ring="gold"
                    label={`${guestParticipation.guestName ?? '게스트'}님의 아바타`}
                  />
                  <div className={styles.guestJoinedBody}>
                    <strong>
                      {guestParticipation.guestName}님, 게스트로 참여 중이에요{' '}
                      <Badge tone="gold" size="sm">
                        게스트
                      </Badge>
                    </strong>
                    <span>당일 현장에서 호스트에게 닉네임을 알려주면 바로 체크인할 수 있어요.</span>
                    <Button variant="ghost" size="sm" onClick={openGuestAvatarEditor}>
                      <Icon name="user" aria-hidden="true" /> 아바타 변경
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button variant="gold" size="xl" fullWidth onClick={handleJoin}>
                    ✨ 참여하기
                  </Button>
                  {!me && (
                    <Button
                      variant="soft"
                      size="md"
                      fullWidth
                      onClick={() => setShowGuestForm(true)}
                    >
                      🎟 가입 없이 게스트로 참여
                    </Button>
                  )}
                </>
              )}

              <Button variant="ghost" size="md" fullWidth onClick={handleShare}>
                <Icon name="chevron-right" aria-hidden="true" /> 친구에게 공유
              </Button>
            </div>

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
        title={isEditingGuestAvatar ? '🖼 아바타 변경' : '🎟 게스트로 참여'}
        description={
          isEditingGuestAvatar
            ? '닉네임과 아바타를 새로 고를 수 있어요'
            : '가입 없이 닉네임과 아바타만으로 합류해요'
        }
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
              {isEditingGuestAvatar ? '변경 저장' : '게스트로 합류'}
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
          <div className={styles.photoField}>
            <Avatar
              size="lg"
              hue={guestAvatarBase.hue}
              pattern="gradient"
              emoji={guestAvatarBase.emoji}
              imageSrc={guestImage}
              ring="soft"
              label="아바타 미리보기"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.photoInput}
              aria-label="아바타 사진 파일 선택"
              onChange={onPickGuestFile}
            />
            <div className={styles.photoBtns}>
              <Button
                variant="soft"
                size="sm"
                isLoading={imageBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                📷 {guestImage ? '사진 변경' : '내 사진 올리기'}
              </Button>
              {guestImage && (
                <Button variant="ghost" size="sm" onClick={() => setGuestImage(null)}>
                  사진 지우기
                </Button>
              )}
            </div>
            <p className={styles.photoHint}>
              최대 5MB · 자동으로 줄여 저장돼요. 사진을 지우면 아래 프리셋으로 돌아가요.
            </p>
          </div>
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
    </main>
  )
}
