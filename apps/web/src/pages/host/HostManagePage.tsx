import { useParams, Link, useNavigate } from 'react-router-dom'
import { useParty, usePartyLifecycleActions } from '@features/parties/queries'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Tabs } from '@components/ui/Tabs/Tabs'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { useState } from 'react'
import { CATEGORY_META } from '@features/categories/meta'
import { api } from '@services/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { QuestionCard } from '@rotifolk/shared'
import HostAnalyticsTab from './HostAnalyticsTab'
import styles from './HostManage.module.css'

const DEPTH_META: Record<string, { label: string; tone: 'primary' | 'success' | 'wine' | 'danger' }> = {
  icebreaker: { label: '아이스브레이커', tone: 'primary' },
  casual: { label: '캐주얼', tone: 'success' },
  deeper: { label: '깊은 대화', tone: 'wine' },
  spicy: { label: '스파이시', tone: 'danger' },
}

export default function HostManagePage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const { data, isLoading, refetch } = useParty(partyId)
  const lifecycle = usePartyLifecycleActions(partyId!)
  const toast = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('participants')
  const [selectedDepth, setSelectedDepth] = useState<keyof typeof DEPTH_META>('icebreaker')
  const [cardPrompt, setCardPrompt] = useState('')

  const { data: globalCards, isLoading: cardsLoading } = useQuery({
    queryKey: ['question-cards'],
    queryFn: () => api.get<QuestionCard[]>('question-cards'),
  })

  const addCardMutation = useMutation({
    mutationFn: (vars: { partyId: string; depth: string; prompt: string; language: string }) =>
      api.post('question-cards', vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-cards'] })
      setCardPrompt('')
      toast.show('카드가 추가됐어요', 'success')
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  if (isLoading) return <Loading />
  if (!data) return <EmptyState emoji="🌙" title="파티를 찾을 수 없어요" />
  const { party, participants } = data
  const cat = CATEGORY_META[party.config.category]

  const handleCheckIn = async (userId: string) => {
    try {
      await api.post(`parties/${party.id}/check-in/${userId}`, {})
      toast.show('체크인 완료', 'success')
      refetch()
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handlePlan = async () => {
    try {
      await lifecycle.plan.mutateAsync()
      toast.show('라운드를 짰어요. 이제 시작만 누르면 돼요!', 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleStart = async () => {
    try {
      await lifecycle.start.mutateAsync()
      toast.show('파티 시작! 라이브로 이동할게요', 'success')
      navigate(`/live/${party.id}`)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <div>
          <div className={styles.crumb}>
            <Link to="/host">← 호스트 콘솔</Link>
          </div>
          <h1 className={styles.title}>
            <span style={{ marginRight: 8 }}>{cat.emoji}</span>
            {party.title}
          </h1>
          <div className={styles.heroMeta}>
            <Badge tone="primary">{cat.label}</Badge>
            <Badge tone={party.status === 'live' ? 'danger' : 'success'}>
              {party.status.toUpperCase()}
            </Badge>
            <span className={styles.metaDim}>
              {new Date(party.startAt).toLocaleString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        <div className={styles.heroActions}>
          {party.status === 'open' && (
            <>
              <Button variant="ghost" size="lg" onClick={handlePlan} isLoading={lifecycle.plan.isPending}>
                라운드 짜기
              </Button>
              <Button variant="primary" size="lg" onClick={handleStart} isLoading={lifecycle.start.isPending}>
                ▶ 파티 시작
              </Button>
            </>
          )}
          {party.status === 'live' && (
            <Link to={`/live/${party.id}`}>
              <Button variant="gold" size="lg">
                🔴 라이브로 이동
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className={`container ${styles.tabs}`}>
        <Tabs
          tabs={[
            { value: 'participants', label: `참가자 (${participants.length})`, icon: '🎟️' },
            { value: 'rounds', label: '라운드', icon: '🔄' },
            { value: 'cards', label: '질문 카드', icon: '🃏' },
            { value: 'orders', label: '주문', icon: '🍷' },
            { value: 'analytics', label: '분석', icon: '📊' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className={`container ${styles.body}`}>
        {tab === 'participants' && (
          <Card padding="lg">
            <h2 className={styles.h2}>참가자 관리</h2>
            <p className={styles.muted}>도착한 사람부터 체크인해 주세요.</p>
            <div className={styles.partList}>
              {participants.map((p, i) => (
                <GuestRow
                  key={p.id}
                  partyId={party.id}
                  userId={p.userId}
                  nickname={p.user?.nickname ?? '익명'}
                  seatNumber={p.seatNumber ?? i + 1}
                  status={p.status}
                  onCheckIn={() => handleCheckIn(p.userId)}
                />
              ))}
            </div>
          </Card>
        )}

        {tab === 'rounds' && (
          <Card padding="lg">
            <h2 className={styles.h2}>라운드 시뮬레이션</h2>
            <p className={styles.muted}>
              {party.config.totalRounds}라운드 ×{' '}
              {Math.round(party.config.roundDurationSec / 60)}분 ({party.config.rotationMode})
            </p>
            <p className={styles.muted}>
              참가자 확정 후 “라운드 짜기”를 누르면 자동으로 모든 라운드의 좌석이 배치돼요.
              파티 시작 후 라이브에서 “다음 라운드 시작” 버튼을 사용하세요.
            </p>
            <div className={styles.actionsRow}>
              <Button onClick={handlePlan} isLoading={lifecycle.plan.isPending}>
                라운드 다시 짜기
              </Button>
            </div>
          </Card>
        )}

        {tab === 'cards' && (
          <Card padding="lg">
            <h2 className={styles.h2}>질문 카드 풀</h2>
            <p className={styles.muted}>
              파티에서 순서대로 뽑히는 대화 카드예요. 글로벌 풀에서 자동 선택되거나, 아래에서 직접 추가할 수 있어요.
            </p>

            {cardsLoading ? (
              <Loading />
            ) : !globalCards || globalCards.length === 0 ? (
              <EmptyState emoji="🃏" title="아직 카드가 없어요" />
            ) : (
              <div className={styles.cardGrid}>
                {globalCards.map((card) => {
                  const meta = DEPTH_META[card.depth] ?? DEPTH_META['icebreaker']
                  return (
                    <div key={card.id} className={styles.cardItem}>
                      <div className={styles.cardMeta}>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {card.partyId && <Badge tone="primary">전용 카드</Badge>}
                      </div>
                      <p className={styles.cardPrompt}>{card.prompt}</p>
                      <span className={styles.cardUsed}>사용 {card.usedCount}회</span>
                    </div>
                  )
                })}
              </div>
            )}

            <div className={styles.cardAddForm}>
              <p className={styles.cardAddTitle}>커스텀 카드 추가</p>
              <textarea
                className={styles.cardTextarea}
                placeholder="질문 프롬프트를 입력하세요"
                value={cardPrompt}
                onChange={(e) => setCardPrompt(e.target.value)}
                rows={3}
              />
              <div className={styles.depthRow}>
                {Object.entries(DEPTH_META).map(([key, { label }]) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.depthBtn}${selectedDepth === key ? ` ${styles.depthBtnActive}` : ''}`}
                    onClick={() => setSelectedDepth(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button
                variant="primary"
                isLoading={addCardMutation.isPending}
                disabled={!cardPrompt.trim()}
                onClick={() =>
                  addCardMutation.mutate({
                    partyId: party.id,
                    depth: selectedDepth,
                    prompt: cardPrompt.trim(),
                    language: 'ko',
                  })
                }
              >
                카드 추가
              </Button>
            </div>
          </Card>
        )}

        {tab === 'orders' && (
          <Card padding="lg">
            <h2 className={styles.h2}>실시간 주문 현황</h2>
            <p className={styles.muted}>
              파티 시작 후 라이브 콘솔에서 들어오는 주문을 처리할 수 있어요.
            </p>
          </Card>
        )}

        {tab === 'analytics' && <HostAnalyticsTab participants={participants} />}
      </div>
    </div>
  )
}

interface GuestRowProps {
  partyId: string
  userId: string
  nickname: string
  seatNumber: number
  status: string
  onCheckIn: () => void
}

function GuestRow({ partyId, userId, nickname, seatNumber, status, onCheckIn }: GuestRowProps) {
  const storageKey = `rotifolk-guest-memo-${partyId}-${userId}`
  const [memo, setMemo] = useState(() => {
    try { return localStorage.getItem(storageKey) ?? '' } catch { return '' }
  })
  const [open, setOpen] = useState(false)
  const save = (next: string) => {
    setMemo(next)
    try { localStorage.setItem(storageKey, next) } catch {}
  }
  return (
    <div className={styles.part}>
      <Avatar
        size="lg"
        hue="#7A1F3D"
        pattern="gradient"
        emoji={nickname[0]}
        ring={status === 'checked-in' ? 'glow' : 'soft'}
      />
      <div className={styles.partInfo}>
        <strong>{nickname}</strong>
        <span>좌석 #{seatNumber}</span>
        {memo && !open && <span className={styles.memoPreview}>📝 {memo.slice(0, 40)}</span>}
        {open && (
          <textarea
            className={styles.memoBox}
            placeholder="이 게스트에 대한 비공개 메모 (내 브라우저에만 저장)"
            value={memo}
            onChange={(e) => save(e.target.value)}
            rows={2}
            autoFocus
            onBlur={() => setOpen(false)}
          />
        )}
      </div>
      <div className={styles.partActions}>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? '닫기' : memo ? '메모' : '+ 메모'}
        </Button>
        <Button
          variant={status === 'checked-in' ? 'soft' : 'primary'}
          size="sm"
          onClick={onCheckIn}
          disabled={status === 'checked-in'}
        >
          {status === 'checked-in' ? '✓ 체크인됨' : '체크인'}
        </Button>
      </div>
    </div>
  )
}
