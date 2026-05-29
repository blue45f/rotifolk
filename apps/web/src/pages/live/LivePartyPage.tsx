import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BALANCE_GAMES, IDEAL_TYPE_PROMPTS, MINI_GAMES, drawFortune } from '@rotifolk/shared'
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
import { useBgmQueue, getEmbedUrl, type BgmTrack } from '@features/bgm/useBgmQueue'
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
  const [showBgm, setShowBgm] = useState(false)
  const [orderCart, setOrderCart] = useState<Record<string, number>>({})
  const [orderTab, setOrderTab] = useState<'drink' | 'snack' | 'dessert'>('drink')
  const bgm = useBgmQueue(partyId, user?.nickname)
  const [announcement, setAnnouncement] = useState<{ message: string; until: number } | null>(null)
  const [rec, setRec] = useState<{
    kind: string
    payload?: Record<string, unknown>
    until: number
  } | null>(null)

  useEffect(() => {
    if (state.status === 'ended') setShowFinal(true)
  }, [state.status])

  useEffect(() => {
    if (state.lastEvent?.kind === 'announcement') {
      const msg = String(state.lastEvent.payload?.message ?? '').trim()
      if (msg) {
        const until = Date.now() + 30_000
        setAnnouncement({ message: msg, until })
        const t = setTimeout(() => {
          setAnnouncement((cur) => (cur && cur.until === until ? null : cur))
        }, 30_000)
        return () => clearTimeout(t)
      }
    }
  }, [state.lastEvent])

  useEffect(() => {
    const k = state.lastEvent?.kind
    if (k && REC_KINDS.has(k)) {
      const until = Date.now() + 40_000
      setRec({ kind: k, payload: state.lastEvent?.payload, until })
      const t = setTimeout(() => {
        setRec((cur) => (cur && cur.until === until ? null : cur))
      }, 40_000)
      return () => clearTimeout(t)
    }
  }, [state.lastEvent])

  if (isLoading || !data) return <Loading />
  const { party, participants } = data
  const cat = CATEGORY_META[party.config.category]
  const isHost = user?.id === party.hostId
  const mm = Math.floor(state.remainingSec / 60)
    .toString()
    .padStart(2, '0')
  const ss = (state.remainingSec % 60).toString().padStart(2, '0')

  const partnerIds = state.myPair?.memberIds.filter((id) => id !== user?.id) ?? []
  const partners = partnerIds.map((id) => participants.find((p) => p.userId === id)).filter(Boolean)

  return (
    <div className={styles.page} style={{ background: cat.bgGradient }}>
      <div className={styles.glow} aria-hidden="true" />
      <AnimatePresence>
        {announcement && (
          <motion.div
            key={announcement.until}
            className={styles.announceBanner}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.announceIcon} aria-hidden="true">
              📣
            </span>
            <span className={styles.announceMsg}>{announcement.message}</span>
            {isHost && (
              <button
                type="button"
                className={styles.announceDismiss}
                onClick={() => setAnnouncement(null)}
                aria-label="공지 닫기"
              >
                ✕
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <header className={styles.header}>
        <button
          className={styles.exit}
          onClick={() => navigate(`/parties/${party.id}`)}
          aria-label="나가기"
        >
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
          <button
            type="button"
            className={styles.bgmBtn}
            onClick={() => setShowBgm(true)}
            aria-label="BGM 큐 열기"
          >
            🎵
            {bgm.tracks.length > 0 && <span className={styles.bgmBadge}>{bgm.tracks.length}</span>}
          </button>
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
            onLike={(id) =>
              send('participant:mid-match:like', { partyId: party.id, targetUserId: id })
            }
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
          {state.lastEvent &&
            !REC_KINDS.has(state.lastEvent.kind) &&
            state.lastEvent.kind !== 'announcement' && (
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

      <AnimatePresence>
        {rec && <RecreationOverlay key={rec.until} rec={rec} onClose={() => setRec(null)} />}
      </AnimatePresence>

      <footer className={styles.footer}>
        {isHost ? (
          <HostBar
            onNextRound={() => send('host:round:start', { partyId: party.id })}
            onEndRound={() => send('host:round:end', { partyId: party.id })}
            onCheers={() => send('host:event:fire', { partyId: party.id, kind: 'cheers' })}
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
            onAnnounce={(message) =>
              send('host:event:fire', {
                partyId: party.id,
                kind: 'announcement',
                payload: { message },
              })
            }
            onFire={(kind, payload) =>
              send('host:event:fire', { partyId: party.id, kind, payload })
            }
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
          {(menu ?? [])
            .filter((m) => m.kind === orderTab)
            .map((m) => (
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

      <Sheet
        open={showBgm}
        onClose={() => setShowBgm(false)}
        title="🎵 BGM 큐"
        description={
          isHost
            ? '트랙을 큐에 등록해 분위기를 만들어 보세요'
            : '호스트가 등록한 트랙을 함께 즐겨요'
        }
      >
        <BgmPanel
          tracks={bgm.tracks}
          current={bgm.current}
          currentTrack={bgm.currentTrack}
          isHost={isHost}
          onAdd={(url, title) => bgm.addTrack(url, title)}
          onRemove={bgm.removeTrack}
          onNext={bgm.playNext}
          onPrev={bgm.playPrev}
        />
      </Sheet>
    </div>
  )
}

const EVENT_LABEL: Record<string, string> = {
  cheers: '🥂 다 같이 건배!',
  shuffle: '🔀 좌석 셔플 시작!',
  'photo-time': '📸 단체 사진 타임',
  reveal: '🎭 정체 공개',
  'compliment-rain': '💖 칭찬 폭우',
  'gift-card': '🎁 즉석 선물 카드',
}

/** 풀스크린 레크 카드로 받는 이벤트 종류 (덱 기반) */
const REC_KINDS = new Set(['balance-game', 'ideal-type', 'fortune', 'mini-game'])

function RecreationOverlay({
  rec,
  onClose,
}: {
  rec: { kind: string; payload?: Record<string, unknown> }
  onClose: () => void
}) {
  const [pick, setPick] = useState<'a' | 'b' | null>(null)
  const p = rec.payload ?? {}
  return (
    <motion.div
      className={styles.recOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.recCard}
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.recClose} onClick={onClose} aria-label="닫기">
          ✕
        </button>
        {rec.kind === 'balance-game' && (
          <>
            <span className={styles.recKicker}>⚖️ 밸런스 게임</span>
            <p className={styles.recSub}>둘 중 하나, 이유와 함께 말해봐요</p>
            <div className={styles.recChoices}>
              {(['a', 'b'] as const).map((side) => (
                <button
                  key={side}
                  className={`${styles.recChoice} ${pick === side ? styles.recChoiceOn : ''}`}
                  onClick={() => setPick(side)}
                >
                  {String(p[side] ?? '')}
                </button>
              ))}
            </div>
          </>
        )}
        {rec.kind === 'ideal-type' && (
          <>
            <span className={styles.recKicker}>💘 이상형 토크</span>
            <p className={styles.recBig}>“{String(p.prompt ?? '')}”</p>
          </>
        )}
        {rec.kind === 'mini-game' && (
          <>
            <span className={styles.recKicker}>🎮 미니 게임</span>
            <p className={styles.recBig}>
              {String(p.emoji ?? '🎲')} {String(p.title ?? '')}
            </p>
            <p className={styles.recSub}>{String(p.rule ?? '')}</p>
          </>
        )}
        {rec.kind === 'fortune' && (
          <>
            <span className={styles.recKicker}>🔮 오늘의 인연운</span>
            <div className={styles.recFortuneEmoji} aria-hidden="true">
              {String(p.emoji ?? '✨')}
            </div>
            <p className={styles.recBig}>{String(p.title ?? '')}</p>
            <p className={styles.recSub}>{String(p.body ?? '')}</p>
            <div className={styles.recFortuneMeta}>
              <span className={styles.recChip}>행운 키워드 · {String(p.luckyKeyword ?? '')}</span>
              <span className={styles.recScore}>인연력 {Number(p.loveScore ?? 0)}</span>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
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
              {p.mbti && (
                <Badge tone="gold" outlined>
                  {p.mbti}
                </Badge>
              )}
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
  onAnnounce,
  onFire,
}: {
  onNextRound: () => void
  onEndRound: () => void
  onCheers: () => void
  onShuffle: () => void
  onComplimentRain: () => void
  onEndParty: () => void
  onLaunchQuiz: () => void
  onAnnounce: (message: string) => void
  onFire: (kind: string, payload?: Record<string, unknown>) => void
}) {
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [ri, setRi] = useState(0)
  const fireRec = (kind: string, payload: Record<string, unknown>) => {
    onFire(kind, payload)
    setRi((n) => n + 1)
  }
  const submit = () => {
    const msg = draft.trim()
    if (!msg) return
    onAnnounce(msg)
    setDraft('')
    setComposing(false)
  }
  return (
    <div className={styles.barInner}>
      <span className={styles.barRole}>🎙️ 호스트 콘솔</span>
      <div className={styles.barActions}>
        {composing ? (
          <div className={styles.announceCompose}>
            <input
              type="text"
              className={styles.announceInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 140))}
              placeholder="모든 참가자에게 한 줄 공지 (최대 140자)"
              maxLength={140}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                } else if (e.key === 'Escape') {
                  setComposing(false)
                  setDraft('')
                }
              }}
            />
            <Button variant="primary" size="sm" onClick={submit} disabled={!draft.trim()}>
              📣 발사
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setComposing(false)
                setDraft('')
              }}
            >
              취소
            </Button>
          </div>
        ) : (
          <>
            <Button variant="soft" size="sm" onClick={() => setComposing(true)}>
              📣 공지
            </Button>
            <Button variant="soft" size="sm" onClick={onCheers}>
              🥂 건배
            </Button>
            <Button variant="soft" size="sm" onClick={onShuffle}>
              🔀 셔플
            </Button>
            <Button variant="soft" size="sm" onClick={onComplimentRain}>
              💖 칭찬 폭우
            </Button>
            <span className={styles.barDeck}>
              <Button
                variant="gold"
                size="sm"
                onClick={() =>
                  fireRec('balance-game', { ...BALANCE_GAMES[ri % BALANCE_GAMES.length] })
                }
              >
                ⚖️ 밸런스
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={() =>
                  fireRec('ideal-type', {
                    prompt: IDEAL_TYPE_PROMPTS[ri % IDEAL_TYPE_PROMPTS.length],
                  })
                }
              >
                💘 이상형
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={() => fireRec('fortune', { ...drawFortune(ri) })}
              >
                🔮 운세
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={() => fireRec('mini-game', { ...MINI_GAMES[ri % MINI_GAMES.length] })}
              >
                🎮 미니게임
              </Button>
            </span>
            <Button variant="soft" size="sm" onClick={onLaunchQuiz}>
              🎯 퀴즈 발사
            </Button>
            <Button variant="ghost" size="sm" onClick={onEndRound}>
              ⏸ 라운드 종료
            </Button>
            <Button variant="primary" size="md" onClick={onNextRound}>
              ▶ 다음 라운드
            </Button>
            <Button variant="danger" size="sm" onClick={onEndParty}>
              🌹 파티 종료
            </Button>
          </>
        )}
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

function BgmPanel({
  tracks,
  current,
  currentTrack,
  isHost,
  onAdd,
  onRemove,
  onNext,
  onPrev,
}: {
  tracks: BgmTrack[]
  current: number
  currentTrack: BgmTrack | null
  isHost: boolean
  onAdd: (url: string, title?: string) => void
  onRemove: (id: string) => void
  onNext: () => void
  onPrev: () => void
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')

  const handleAdd = () => {
    const trimmed = url.trim()
    if (!trimmed) return
    onAdd(trimmed, title.trim() || undefined)
    setUrl('')
    setTitle('')
  }

  return (
    <div className={styles.bgmSheet}>
      <div className={styles.bgmPlayer}>
        {currentTrack ? (
          <iframe
            key={currentTrack.id}
            className={styles.bgmFrame}
            src={getEmbedUrl(currentTrack.url)}
            title={currentTrack.title}
            allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className={styles.bgmEmpty}>아직 큐가 비어 있어요</div>
        )}
        <div className={styles.bgmNowMeta}>
          {currentTrack ? (
            <>
              <strong className={styles.bgmNowTitle}>{currentTrack.title}</strong>
              <span className={styles.bgmNowBy}>by {currentTrack.addedBy}</span>
            </>
          ) : (
            <span className={styles.bgmMuted}>현재 재생 중인 트랙이 없어요</span>
          )}
        </div>
        <div className={styles.bgmControls}>
          <Button variant="ghost" size="sm" onClick={onPrev} disabled={tracks.length === 0}>
            ⏮ 이전
          </Button>
          <span className={styles.bgmPos}>
            {tracks.length === 0 ? '0 / 0' : `${current} / ${tracks.length}`}
          </span>
          <Button variant="ghost" size="sm" onClick={onNext} disabled={tracks.length === 0}>
            다음 ⏭
          </Button>
        </div>
      </div>

      <ul className={styles.bgmList}>
        {tracks.length === 0 ? (
          <li className={styles.bgmListEmpty}>큐에 등록된 트랙이 없어요</li>
        ) : (
          tracks.map((t, i) => (
            <li
              key={t.id}
              className={`${styles.bgmTrack} ${current === i + 1 ? styles.bgmTrackActive : ''}`}
            >
              <span className={styles.bgmIdx}>{i + 1}</span>
              <div className={styles.bgmTrackBody}>
                <strong className={styles.bgmTrackTitle}>{t.title}</strong>
                <span className={styles.bgmTrackBy}>by {t.addedBy}</span>
              </div>
              {isHost && (
                <button
                  type="button"
                  className={styles.bgmRemove}
                  onClick={() => onRemove(t.id)}
                  aria-label={`${t.title} 삭제`}
                >
                  ✕
                </button>
              )}
            </li>
          ))
        )}
      </ul>

      {isHost ? (
        <div className={styles.bgmForm}>
          <input
            type="url"
            className={styles.bgmInput}
            placeholder="YouTube 또는 Spotify URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <input
            type="text"
            className={styles.bgmInput}
            placeholder="제목 (선택)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button variant="primary" size="md" onClick={handleAdd} disabled={!url.trim()}>
            추가
          </Button>
        </div>
      ) : (
        <p className={styles.bgmHint}>트랙은 호스트만 추가/삭제할 수 있어요</p>
      )}
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
