import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useParty } from '@features/parties/queries'
import { useLiveParty } from '@features/live/useLiveParty'
import { CATEGORY_META } from '@features/categories/meta'
import { useAuthStore } from '@store/authStore'
import { Button } from '@components/ui/Button/Button'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { useVenueMenu } from '@features/venues/queries'
import { Tabs } from '@components/ui/Tabs/Tabs'
import Loading from '@components/feedback/Loading'
import styles from './LiveParty.module.css'

export default function LivePartyPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useParty(partyId)
  const { state, send } = useLiveParty(partyId, user?.id)
  const toast = useToast()
  const { data: menu } = useVenueMenu(data?.party?.venueId)

  const [showOrder, setShowOrder] = useState(false)
  const [showFinal, setShowFinal] = useState(false)
  const [orderCart, setOrderCart] = useState<Record<string, number>>({})
  const [orderTab, setOrderTab] = useState<'drink' | 'snack' | 'dessert'>('drink')

  useEffect(() => {
    if (state.status === 'ended') setShowFinal(true)
  }, [state.status])

  if (isLoading || !data) return <Loading />
  const { party, participants } = data
  const cat = CATEGORY_META[party.config.category]
  const isHost = user?.id === party.hostId
  const mm = Math.floor(state.remainingSec / 60).toString().padStart(2, '0')
  const ss = (state.remainingSec % 60).toString().padStart(2, '0')

  const partnerIds = state.myPair?.memberIds.filter((id) => id !== user?.id) ?? []
  const partners = partnerIds
    .map((id) => participants.find((p) => p.userId === id))
    .filter(Boolean)

  return (
    <div className={styles.page} style={{ background: cat.bgGradient }}>
      <div className={styles.glow} aria-hidden="true" />

      <header className={styles.header}>
        <button className={styles.exit} onClick={() => navigate(`/parties/${party.id}`)} aria-label="나가기">
          ✕
        </button>
        <div className={styles.headBody}>
          <div className={styles.headChips}>
            <Badge tone="gold" size="md">
              {cat.emoji} {cat.label}
            </Badge>
            <Badge tone="danger" size="md">
              🔴 LIVE
            </Badge>
            {state.currentRoundIndex && (
              <Badge tone="primary" size="md">
                R {state.currentRoundIndex}/{party.config.totalRounds}
              </Badge>
            )}
          </div>
          <h1 className={styles.title}>{party.title}</h1>
        </div>
        <div className={styles.headRight}>
          <span className={styles.timer} aria-live="polite">
            {mm}:{ss}
          </span>
        </div>
      </header>

      <main className={styles.main}>
        {state.activeQuiz ? (
          <QuizPanel
            quiz={state.activeQuiz}
            onAnswer={(idx) =>
              send('participant:quiz:answer', {
                partyId: party.id,
                questionId: state.activeQuiz!.questionId,
                selectedOptionIndex: idx,
              })
            }
          />
        ) : state.myPair && partners.length > 0 ? (
          <PairPanel
            partners={partners.map((p) => ({
              id: p!.userId,
              nickname: p!.user?.nickname ?? '익명',
              mbti: p!.user?.mbti,
              interests: p!.user?.interests ?? [],
            }))}
            seatLabel={state.myPair.seatLabel}
            lastCard={state.lastCard?.prompt}
            onLike={(id) => send('participant:mid-match:like', { partyId: party.id, targetUserId: id })}
            onDrawCard={() => send('card:draw', { partyId: party.id, pairId: state.myPair?.id })}
          />
        ) : (
          <WaitPanel
            status={state.status}
            participantCount={state.participantCount}
            roundIndex={state.currentRoundIndex}
            isHost={isHost}
          />
        )}

        <AnimatePresence>
          {state.lastEvent && (
            <motion.div
              key={state.lastEvent.kind}
              className={styles.eventBurst}
              initial={{ opacity: 0, scale: 0.4, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <span>{EVENT_LABEL[state.lastEvent.kind] ?? '✨ 이벤트'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className={styles.footer}>
        {isHost ? (
          <HostBar
            onNextRound={() => send('host:round:start', { partyId: party.id })}
            onEndRound={() => send('host:round:end', { partyId: party.id })}
            onCheers={() =>
              send('host:event:fire', { partyId: party.id, kind: 'cheers' })
            }
            onShuffle={() => send('host:event:fire', { partyId: party.id, kind: 'shuffle' })}
            onComplimentRain={() =>
              send('host:event:fire', { partyId: party.id, kind: 'compliment-rain' })
            }
            onEndParty={() => {
              if (confirm('파티를 종료할까요? 최종 매칭이 공개돼요.')) {
                send('host:party:end', { partyId: party.id })
              }
            }}
            onLaunchQuiz={async () => {
              toast.show('퀴즈는 콘솔에서 미리 등록한 뒤 발사할 수 있어요', 'info')
            }}
          />
        ) : (
          <ParticipantBar
            partyId={party.id}
            ordersEnabled={party.config.enableLiveOrders}
            onOpenOrder={() => setShowOrder(true)}
            onFinalVote={() =>
              partners[0] &&
              send('participant:final-match:vote', {
                partyId: party.id,
                targetUserId: partners[0]!.userId,
              })
            }
            enableFinalMatch={party.config.enableFinalMatching}
          />
        )}
      </footer>

      <Sheet
        open={showOrder}
        onClose={() => setShowOrder(false)}
        title="음료 · 안주 주문"
        description="지금 자리에서 추가 주문할 수 있어요"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowOrder(false)}>
              취소
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const items = Object.entries(orderCart)
                  .filter(([, q]) => q > 0)
                  .map(([menuItemId, quantity]) => ({ menuItemId, quantity }))
                if (items.length === 0) {
                  toast.show('주문할 항목을 선택해 주세요', 'warning')
                  return
                }
                send('participant:order:create', {
                  partyId: party.id,
                  items,
                })
                toast.show('주문이 들어갔어요 🍷', 'success')
                setOrderCart({})
                setShowOrder(false)
              }}
            >
              주문하기
            </Button>
          </>
        }
      >
        <Tabs
          variant="underline"
          value={orderTab}
          onChange={(v) => setOrderTab(v as never)}
          tabs={[
            { value: 'drink', label: '🍷 음료' },
            { value: 'snack', label: '🍴 안주' },
            { value: 'dessert', label: '🍰 디저트' },
          ]}
        />
        <div className={styles.menuList}>
          {(menu ?? []).filter((m) => m.kind === orderTab).map((m) => (
            <MenuRow
              key={m.id}
              name={m.name}
              priceKRW={m.priceKRW}
              quantity={orderCart[m.id] ?? 0}
              onChange={(q) => setOrderCart((c) => ({ ...c, [m.id]: q }))}
            />
          ))}
          {(menu ?? []).filter((m) => m.kind === orderTab).length === 0 && (
            <p className={styles.muted}>이 카테고리에는 메뉴가 없어요.</p>
          )}
        </div>
      </Sheet>

      <Sheet
        open={showFinal}
        onClose={() => setShowFinal(false)}
        variant="modal"
        size="md"
        title="🌹 오늘의 최종 매칭"
      >
        {state.finalMatches.length === 0 ? (
          <p>아직 상호 매칭이 없어요. 다음 라운드를 기약해 봐요.</p>
        ) : (
          <ul className={styles.matchList}>
            {state.finalMatches.map((m, i) => (
              <li key={i}>
                <Avatar size="md" hue="#7A1F3D" pattern="gradient" emoji="💌" ring="gold" />
                <strong>
                  {participants.find((p) => p.userId === m.userAId)?.user?.nickname ?? '익명'} ↔{' '}
                  {participants.find((p) => p.userId === m.userBId)?.user?.nickname ?? '익명'}
                </strong>
              </li>
            ))}
          </ul>
        )}
        <Link to={`/parties/${party.id}`}>
          <Button variant="primary" fullWidth size="lg">
            돌아가기
          </Button>
        </Link>
      </Sheet>
    </div>
  )
}

const EVENT_LABEL: Record<string, string> = {
  cheers: '🥂 다 같이 건배!',
  shuffle: '🔀 좌석 셔플 시작!',
  'photo-time': '📸 단체 사진 타임',
  'mini-game': '🎲 미니 게임 시작',
  reveal: '🎭 정체 공개',
  announcement: '📣 호스트 공지',
  'compliment-rain': '💖 칭찬 폭우',
  'gift-card': '🎁 즉석 선물 카드',
}

function PairPanel({
  partners,
  seatLabel,
  lastCard,
  onLike,
  onDrawCard,
}: {
  partners: { id: string; nickname: string; mbti?: string | null; interests: string[] }[]
  seatLabel: string
  lastCard?: string
  onLike: (id: string) => void
  onDrawCard: () => void
}) {
  return (
    <div className={styles.pair}>
      <div className={styles.seatLabel}>좌석 {seatLabel}</div>
      <div className={styles.partners}>
        {partners.map((p, i) => (
          <motion.div
            key={p.id}
            className={styles.partner}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12, duration: 0.5 }}
          >
            <Avatar size="xl" hue="#FCFAF5" pattern="gradient" emoji={p.nickname[0]} ring="glow" />
            <h2 className={styles.partnerName}>{p.nickname}</h2>
            <div className={styles.partnerMeta}>
              {p.mbti && <Badge tone="gold" outlined>{p.mbti}</Badge>}
              {p.interests.slice(0, 3).map((it) => (
                <Badge key={it} tone="neutral" outlined>
                  #{it}
                </Badge>
              ))}
            </div>
            <Button variant="gold" onClick={() => onLike(p.id)}>
              ✨ 좋은 라운드였어요
            </Button>
          </motion.div>
        ))}
      </div>

      <div className={styles.cardArea}>
        <h3 className={styles.cardLabel}>질문 카드</h3>
        {lastCard ? (
          <motion.p
            key={lastCard}
            className={styles.cardText}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            “{lastCard}”
          </motion.p>
        ) : (
          <p className={styles.cardEmpty}>카드를 뽑아보세요</p>
        )}
        <Button variant="soft" onClick={onDrawCard}>
          🃏 다음 카드 뽑기
        </Button>
      </div>
    </div>
  )
}

function QuizPanel({
  quiz,
  onAnswer,
}: {
  quiz: { questionId: string; prompt: string; options: string[]; kind: string }
  onAnswer: (idx: number) => void
}) {
  return (
    <motion.div
      className={styles.quiz}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Badge tone="gold" size="md">
        🎯 라이브 퀴즈
      </Badge>
      <h2 className={styles.quizPrompt}>{quiz.prompt}</h2>
      <div className={styles.quizOptions}>
        {quiz.options.map((opt, i) => (
          <button key={i} className={styles.quizOpt} onClick={() => onAnswer(i)}>
            <span className={styles.quizOptIdx}>{String.fromCharCode(65 + i)}</span>
            <span>{opt}</span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function WaitPanel({
  status,
  participantCount,
  roundIndex,
  isHost,
}: {
  status: string
  participantCount: number
  roundIndex: number | null
  isHost: boolean
}) {
  return (
    <div className={styles.wait}>
      <motion.div
        className={styles.waitOrb}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
        aria-hidden="true"
      >
        {status === 'ended' ? '🌹' : '🍷'}
      </motion.div>
      <h2 className={styles.waitTitle}>
        {status === 'ended'
          ? '오늘의 라운드를 마쳤어요'
          : roundIndex
            ? `라운드 ${roundIndex} 휴식`
            : '곧 라운드가 시작됩니다'}
      </h2>
      <p className={styles.waitSub}>
        {status === 'ended'
          ? '곧 최종 매칭을 공개할게요'
          : isHost
            ? '“다음 라운드 시작”을 눌러 라운드를 시작해주세요'
            : `호스트가 다음 라운드를 곧 시작합니다. 함께한 인원: ${participantCount}명`}
      </p>
    </div>
  )
}

function HostBar({
  onNextRound,
  onEndRound,
  onCheers,
  onShuffle,
  onComplimentRain,
  onEndParty,
  onLaunchQuiz,
}: {
  onNextRound: () => void
  onEndRound: () => void
  onCheers: () => void
  onShuffle: () => void
  onComplimentRain: () => void
  onEndParty: () => void
  onLaunchQuiz: () => void
}) {
  return (
    <div className={styles.barInner}>
      <span className={styles.barRole}>🎙️ 호스트 콘솔</span>
      <div className={styles.barActions}>
        <Button variant="soft" size="sm" onClick={onCheers}>🥂 건배</Button>
        <Button variant="soft" size="sm" onClick={onShuffle}>🔀 셔플</Button>
        <Button variant="soft" size="sm" onClick={onComplimentRain}>💖 칭찬 폭우</Button>
        <Button variant="soft" size="sm" onClick={onLaunchQuiz}>🎯 퀴즈 발사</Button>
        <Button variant="ghost" size="sm" onClick={onEndRound}>⏸ 라운드 종료</Button>
        <Button variant="primary" size="md" onClick={onNextRound}>▶ 다음 라운드</Button>
        <Button variant="danger" size="sm" onClick={onEndParty}>🌹 파티 종료</Button>
      </div>
    </div>
  )
}

function ParticipantBar({
  ordersEnabled,
  onOpenOrder,
  onFinalVote,
  enableFinalMatch,
}: {
  partyId: string
  ordersEnabled: boolean
  onOpenOrder: () => void
  onFinalVote: () => void
  enableFinalMatch: boolean
}) {
  return (
    <div className={styles.barInner}>
      <span className={styles.barRole}>🎟️ 참가자</span>
      <div className={styles.barActions}>
        {ordersEnabled && (
          <Button variant="soft" size="md" onClick={onOpenOrder}>
            🍷 음료/안주 추가
          </Button>
        )}
        {enableFinalMatch && (
          <Button variant="gold" size="md" onClick={onFinalVote}>
            💌 최종 매칭 투표
          </Button>
        )}
      </div>
    </div>
  )
}

function MenuRow({
  name,
  priceKRW,
  quantity,
  onChange,
}: {
  name: string
  priceKRW: number
  quantity: number
  onChange: (q: number) => void
}) {
  return (
    <div className={styles.menuRow}>
      <div className={styles.menuInfo}>
        <strong>{name}</strong>
        <span>{priceKRW.toLocaleString()}원</span>
      </div>
      <div className={styles.menuQty}>
        <button
          type="button"
          className={styles.qtyBtn}
          onClick={() => onChange(Math.max(0, quantity - 1))}
          aria-label="감소"
        >
          −
        </button>
        <span className={styles.qtyVal}>{quantity}</span>
        <button
          type="button"
          className={styles.qtyBtn}
          onClick={() => onChange(quantity + 1)}
          aria-label="증가"
        >
          +
        </button>
      </div>
    </div>
  )
}
