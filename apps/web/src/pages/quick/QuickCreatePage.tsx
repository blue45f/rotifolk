import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { PartyCategory } from '@rotifolk/shared'
import { api } from '@services/api'
import { useVenues } from '@features/venues/queries'
import { ALL_CATEGORIES, CATEGORY_META } from '@features/categories/meta'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { Icon } from '@components/ui/Icon/Icon'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import styles from './QuickCreate.module.css'

const TIME_PRESETS = [30, 60, 90, 120, 180] as const

export default function QuickCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: venues } = useVenues({ partnered: true })
  const [category, setCategory] = useState<PartyCategory>('wine')
  const [venueId, setVenueId] = useState<string | null>(null)
  const [startInMin, setStartInMin] = useState<number>(60)
  const [maxParticipants, setMax] = useState(8)
  const [creating, setCreating] = useState(false)
  const [createdParty, setCreatedParty] = useState<{ id: string; quickCode: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const cat = CATEGORY_META[category]

  const handleCreate = async () => {
    if (!venueId) {
      toast.show('장소를 선택해 주세요', 'warning')
      return
    }
    setCreating(true)
    try {
      const created = await api.post<{ id: string; quickCode: string }>('parties/quick', {
        category,
        venueId,
        startInMinutes: startInMin,
        maxParticipants,
      })
      setCreatedParty({ id: created.id, quickCode: created.quickCode })
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleCopyCode = async () => {
    if (!createdParty) return
    try {
      await navigator.clipboard.writeText(createdParty.quickCode)
      toast.show('초대 코드를 복사했어요', 'success')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.show('복사에 실패했어요', 'error')
    }
  }

  const handleShare = async () => {
    if (!createdParty) return
    const url = `${window.location.origin}/invite/${createdParty.quickCode}`
    const shareText = `즉석 모임에 초대합니다!\n초대 코드: ${createdParty.quickCode}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: '즉석 모임 초대',
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

  if (createdParty !== null) {
    return (
      <div className={styles.page}>
        <div className={styles.success}>
          <div className={styles.successEmoji} aria-hidden="true">
            {cat.emoji}
          </div>
          <h1 className={styles.successTitle}>🎉 모임이 열렸어요!</h1>
          <p className={styles.successLead}>
            아래 초대 코드를 친구에게 공유하면 바로 참여할 수 있어요.
          </p>

          <button
            type="button"
            className={styles.codeBlock}
            onClick={handleCopyCode}
            aria-label={`초대 코드 ${createdParty.quickCode} 복사`}
          >
            <span className={styles.codeLabel}>초대 코드</span>
            <span className={styles.codeValue}>{createdParty.quickCode}</span>
            <span className={styles.codeHint}>{copied ? '✓ 복사됨' : '탭하면 복사돼요'}</span>
          </button>

          <div className={styles.successActions}>
            <Button
              size="xl"
              variant="gold"
              fullWidth
              onClick={() => navigate(`/host/parties/${createdParty.id}`)}
            >
              호스트 콘솔로 이동 →
            </Button>
            <Button variant="ghost" size="md" fullWidth onClick={handleShare}>
              ↗ 친구에게 공유
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Badge tone="gold" size="md">
          <Icon name="bolt" size={0.95} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{' '}
          1분 만에 즉석 모임
        </Badge>
        <h1 className={styles.title}>
          지금, <span className={styles.accent}>한 잔 어때요?</span>
        </h1>
        <p className={styles.lead}>
          카테고리·시간·장소만 고르면 끝. 친구한테 공유 코드만 던지면 모여요.
        </p>
      </header>

      <main className={styles.body}>
        <motion.div className={styles.preview} style={{ background: cat.bgGradient }} layout>
          <div className={styles.previewEmoji}>{cat.emoji}</div>
          <h2>{cat.label}</h2>
          <p>{cat.description}</p>
        </motion.div>

        <Card padding="lg" className={styles.config}>
          <section>
            <h3 className={styles.h3}>1️⃣ 어떤 잔으로?</h3>
            <div className={styles.catRow}>
              {ALL_CATEGORIES.filter((c) => c.value !== 'custom').map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`${styles.catBtn} ${category === c.value ? styles.catActive : ''}`}
                  onClick={() => setCategory(c.value)}
                  aria-pressed={category === c.value}
                >
                  <span>{c.emoji}</span>
                  <span>{c.shortLabel}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className={styles.h3}>2️⃣ 어디서?</h3>
            <div className={styles.venueRow}>
              {(venues ?? []).map((v) => (
                <button
                  type="button"
                  key={v.id}
                  className={`${styles.venueChip} ${venueId === v.id ? styles.venueActive : ''}`}
                  onClick={() => setVenueId(v.id)}
                >
                  <Icon
                    name="pin"
                    size={0.9}
                    style={{ marginRight: '4px', verticalAlign: 'middle' }}
                  />{' '}
                  {v.area} · <strong>{v.name}</strong>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className={styles.h3}>3️⃣ 언제 시작할까요?</h3>
            <div className={styles.timeRow}>
              {TIME_PRESETS.map((m) => (
                <button
                  type="button"
                  key={m}
                  className={`${styles.timeBtn} ${startInMin === m ? styles.timeActive : ''}`}
                  onClick={() => setStartInMin(m)}
                >
                  <strong>{m < 60 ? `${m}분` : `${m / 60}시간`}</strong>
                  <span>뒤</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className={styles.h3}>4️⃣ 정원</h3>
            <div className={styles.peopleRow}>
              {[4, 6, 8, 10, 12].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`${styles.peopleBtn} ${maxParticipants === n ? styles.peopleActive : ''}`}
                  onClick={() => setMax(n)}
                >
                  {n}명
                </button>
              ))}
            </div>
          </section>

          <Button
            size="xl"
            variant="gold"
            fullWidth
            onClick={handleCreate}
            isLoading={creating}
            disabled={!venueId}
            leftIcon={<Icon name="bolt" />}
          >
            지금 모임 열기
          </Button>
        </Card>
      </main>
    </div>
  )
}
