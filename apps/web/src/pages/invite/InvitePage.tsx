import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { PartyCategory } from '@rotifolk/shared'
import { api } from '@services/api'
import { CATEGORY_META } from '@features/categories/meta'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
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
    diffMs < 0 ? '진행 중'
    : diffMs < 2 * 60 * 60 * 1000 ? '곧 시작'
    : diffDays === 0 ? '오늘 시작'
    : `D-${diffDays}`

  const handleJoin = () => {
    if (!me) {
      toast.show('로그인하고 합류해요', 'info')
      navigate('/login', { state: { from: `/parties/${data.id}` } })
      return
    }
    navigate(`/parties/${data.id}`)
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
                  <span className={styles.metaIcon} aria-hidden="true">🗓</span>
                  {startLabel}
                </span>
                <span className={styles.metaItem}>
                  <span className={styles.metaIcon} aria-hidden="true">📍</span>
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

            <Button
              variant="gold"
              size="xl"
              fullWidth
              onClick={handleJoin}
            >
              ✨ 참여하기
            </Button>

            <Button
              variant="ghost"
              size="md"
              fullWidth
              onClick={handleShare}
            >
              ↗ 친구에게 공유
            </Button>

            {!me && (
              <p className={styles.notice}>
                지금은 미리보기예요. 참여하려면 로그인 또는 가입이 필요해요.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
