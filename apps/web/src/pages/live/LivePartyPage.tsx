import { useConfirm } from '@components/feedback/Confirm/useConfirm'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/useToast'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Icon } from '@components/ui/Icon/Icon'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { Tabs } from '@components/ui/Tabs/Tabs'
import { useBgmQueue, getEmbedUrl, type BgmTrack } from '@domains/bgm/useBgmQueue'
import { CATEGORY_META } from '@domains/categories/meta'
import { isLongBreakAfterRound } from '@domains/live/partyTiming'
import { notifyRoundEnded, playRoundChime } from '@domains/live/roundAlarm'
import { detectRoundMilestone, ROUND_MILESTONE_MESSAGE } from '@domains/live/roundMilestones'
import { TimingPanel } from '@domains/live/TimingPanel'
import { useLiveParty } from '@domains/live/useLiveParty'
import { usePartyTimingSettings } from '@domains/live/useTimingSettings'
import { usePartyNotes } from '@domains/notes/queries'
import { SendNoteSheet } from '@domains/notes/SendNoteSheet'
import { useParty } from '@domains/parties/queries'
import { useVenueMenu } from '@domains/venues/queries'
import {
  BALANCE_GAMES,
  IDEAL_TYPE_PROMPTS,
  MINI_GAMES,
  buildConversationCard,
  computeCompatibility,
  drawFortune,
  type CompatInput,
  type PromptKind,
} from '@rotifolk/shared'
import { useAuthStore } from '@store/authStore'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

import styles from './LiveParty.module.css'

export default function LivePartyPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useParty(partyId)
  const { state, send } = useLiveParty(partyId, user?.id)
  const toast = useToast()
  const confirm = useConfirm()
  const { data: menu } = useVenueMenu(data?.party?.venueId)
  const { data: partyNotes } = usePartyNotes(partyId)
  const remainingNotes = Math.max(
    0,
    (data?.party?.config?.noteQuota ?? 5) - (partyNotes?.sent?.length ?? 0)
  )

  const [showOrder, setShowOrder] = useState(false)
  const [showFinal, setShowFinal] = useState(false)
  const [showBgm, setShowBgm] = useState(false)
  const [showOps, setShowOps] = useState(false)
  const { settings: timing, update: updateTiming } = usePartyTimingSettings(partyId)
  const [noteTarget, setNoteTarget] = useState<{ id: string; nickname: string } | null>(null)
  const [orderCart, setOrderCart] = useState<Record<string, number>>({})
  const [orderTab, setOrderTab] = useState<'drink' | 'snack' | 'dessert'>('drink')
  const bgm = useBgmQueue(partyId, user?.nickname)
  const [announcement, setAnnouncement] = useState<{ message: string; until: number } | null>(null)
  const [rec, setRec] = useState<{
    kind: string
    payload?: Record<string, unknown>
    until: number
  } | null>(null)
  // 타이머 매초 낭독 대신 마일스톤만 스크린리더에 알린다 — 표시용 타이머는 aria-hidden
  const [timerMilestone, setTimerMilestone] = useState('')
  const prevRemainingRef = useRef(state.remainingSec)
  const announcedRoundRef = useRef<number | null>(null)

  useEffect(() => {
    if (state.status !== 'ended') return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setShowFinal(true)
    })
    return () => {
      cancelled = true
    }
  }, [state.status])

  useEffect(() => {
    if (state.lastEvent?.kind === 'announcement') {
      const msg = String(state.lastEvent.payload?.message ?? '').trim()
      if (msg) {
        const until = Date.now() + 30_000
        const showTimer = window.setTimeout(() => {
          setAnnouncement({ message: msg, until })
        }, 0)
        const clearTimer = setTimeout(() => {
          setAnnouncement((cur) => (cur && cur.until === until ? null : cur))
        }, 30_000)
        return () => {
          window.clearTimeout(showTimer)
          clearTimeout(clearTimer)
        }
      }
    }
  }, [state.lastEvent])

  useEffect(() => {
    const k = state.lastEvent?.kind
    if (k && REC_KINDS.has(k)) {
      const until = Date.now() + 40_000
      const showTimer = window.setTimeout(() => {
        setRec({ kind: k, payload: state.lastEvent?.payload, until })
      }, 0)
      const clearTimer = setTimeout(() => {
        setRec((cur) => (cur && cur.until === until ? null : cur))
      }, 40_000)
      return () => {
        window.clearTimeout(showTimer)
        clearTimeout(clearTimer)
      }
    }
  }, [state.lastEvent])

  useEffect(() => {
    if (state.status !== 'live' || !state.currentRoundIndex) return
    if (announcedRoundRef.current === state.currentRoundIndex) return
    announcedRoundRef.current = state.currentRoundIndex
    setTimerMilestone(`라운드 ${state.currentRoundIndex} 시작`)
  }, [state.status, state.currentRoundIndex])

  useEffect(() => {
    const prevSec = prevRemainingRef.current
    prevRemainingRef.current = state.remainingSec
    const milestone = detectRoundMilestone(
      prevSec,
      state.remainingSec,
      state.currentRound?.durationSec ?? 0
    )
    if (milestone) setTimerMilestone(ROUND_MILESTONE_MESSAGE[milestone])
    // 라운드 알람 — 호스트가 토글을 켰을 때만 종료 시점에 차임+브라우저 알림
    if (milestone === 'ended' && timing.alarmOn && data?.party && user?.id === data.party.hostId) {
      playRoundChime()
      notifyRoundEnded(data.party.title)
    }
  }, [state.remainingSec, state.currentRound, timing.alarmOn, data?.party, user?.id])

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
  // N:1 핫시트 — memberIds[0]가 hub(스포트라이트 받는 사람)
  const hubId =
    party.config.rotationFormat === 'many-to-one' ? (state.myPair?.memberIds?.[0] ?? null) : null
  const iAmHub = !!hubId && hubId === user?.id

  return (
    <div className={styles.page} style={{ background: cat.bgGradient }}>
      <div className={styles.glow} aria-hidden="true" />
      <AnimatePresence>
        {announcement && (
          <motion.div
            key={announcement.until}
            role="status"
            aria-live="polite"
            className={styles.announceBanner}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.announceIcon} aria-hidden="true">
              <Icon name="bell" size={1.05} />
            </span>
            <span className={styles.announceMsg}>{announcement.message}</span>
            {isHost && (
              <button
                type="button"
                className={styles.announceDismiss}
                onClick={() => setAnnouncement(null)}
                aria-label="공지 닫기"
              >
                <Icon name="close" size={0.95} />
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
          <Icon name="close" size={1} />
        </button>
        <div className={styles.headBody}>
          <div className={styles.headChips}>
            <span className={styles.liveTag}>
              <Icon name="live" size={0.85} aria-hidden="true" />
              LIVE
            </span>
            {state.currentRoundIndex ? (
              <span className={styles.roundTag}>
                <span className={styles.roundNow}>R{state.currentRoundIndex}</span>
                <span className={styles.roundTotal}>/{party.config.totalRounds}</span>
              </span>
            ) : null}
            <span className={styles.catTag} aria-hidden="true">
              {cat.emoji} {cat.label}
            </span>
          </div>
          <h1 className={styles.title}>{party.title}</h1>
        </div>
        <div className={styles.headRight}>
          <span className={styles.timer} aria-hidden="true">
            <Icon name="clock" size={0.7} className={styles.timerIcon} />
            {mm}:{ss}
          </span>
          <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {timerMilestone}
          </span>
          <button
            type="button"
            className={styles.bgmBtn}
            onClick={() => setShowBgm(true)}
            aria-label="BGM 큐 열기"
          >
            <Icon name="music" size={1.05} style={{ verticalAlign: 'middle' }} />
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
              nickname: p!.user?.nickname ?? p!.guestName ?? '익명',
              mbti: p!.user?.mbti,
              interests: p!.user?.interests ?? [],
              verified: !!p!.user?.verifiedFields?.includes('identity'),
              isGuest: !!p!.isGuest,
              // 🎭 아바타 모드 파티는 업로드 사진 대신 프리셋만 노출한다.
              avatarImage: party.config.enableAvatarOnly
                ? null
                : (p!.guestAvatar?.imageData ?? p!.user?.avatarImage ?? null),
            }))}
            seatLabel={state.myPair.seatLabel}
            lastCard={state.lastCard?.prompt}
            onLike={(id) =>
              send('participant:mid-match:like', { partyId: party.id, targetUserId: id })
            }
            onDrawCard={() => send('card:draw', { partyId: party.id, pairId: state.myPair?.id })}
            onSendNote={(p) => setNoteTarget(p)}
            hubId={hubId}
            iAmHub={iAmHub}
            roundIndex={state.currentRoundIndex}
            totalRounds={party.config.totalRounds}
            me={{ mbti: user?.mbti, interests: user?.interests, birthYear: user?.birthYear }}
            meId={user?.id ?? ''}
          />
        ) : (
          <WaitPanel
            status={state.status}
            participantCount={state.participantCount}
            roundIndex={state.currentRoundIndex}
            isHost={isHost}
            longBreakMin={
              isHost &&
              isLongBreakAfterRound(
                state.currentRoundIndex,
                timing.breakEveryN >= 1 && timing.breakMin >= 1
                  ? { everyNRounds: timing.breakEveryN, breakMin: timing.breakMin }
                  : null
              )
                ? timing.breakMin
                : null
            }
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

      {noteTarget && (
        <SendNoteSheet
          partyId={party.id}
          toUserId={noteTarget.id}
          toNickname={noteTarget.nickname}
          open={!!noteTarget}
          onClose={() => setNoteTarget(null)}
          roundIndex={state.currentRoundIndex}
          remainingQuota={remainingNotes}
        />
      )}

      <footer className={styles.footer}>
        {isHost ? (
          <HostBar
            onOpenOps={() => setShowOps(true)}
            onNextRound={() => send('host:round:start', { partyId: party.id })}
            onEndRound={() => send('host:round:end', { partyId: party.id })}
            onCheers={() => send('host:event:fire', { partyId: party.id, kind: 'cheers' })}
            onShuffle={() => send('host:event:fire', { partyId: party.id, kind: 'shuffle' })}
            onComplimentRain={() =>
              send('host:event:fire', { partyId: party.id, kind: 'compliment-rain' })
            }
            onEndParty={async () => {
              const ok = await confirm({
                title: '파티를 종료할까요?',
                description: '최종 매칭이 공개돼요.',
                confirmLabel: '종료',
                danger: true,
              })
              if (ok) {
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
                <Avatar
                  size="md"
                  hue="var(--color-primary)"
                  pattern="gradient"
                  emoji="💌"
                  ring="gold"
                />
                <strong>
                  {participants.find((p) => p.userId === m.userAId)?.user?.nickname ?? '익명'} ↔{' '}
                  {participants.find((p) => p.userId === m.userBId)?.user?.nickname ?? '익명'}
                </strong>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <Link to={`/parties/${party.id}/reveal`} onClick={() => setShowFinal(false)}>
            <Button variant="gold" fullWidth size="lg">
              ✨ 결과 자세히 보기
            </Button>
          </Link>
          <Link to={`/parties/${party.id}`}>
            <Button variant="ghost" fullWidth size="md">
              돌아가기
            </Button>
          </Link>
        </div>
      </Sheet>

      <Sheet
        open={showOps}
        onClose={() => setShowOps(false)}
        title="⏱ 타이밍 · 운영"
        description="로스터 확인, 시작 지연, 종료 역산, 휴식 규칙, 라운드 알람"
      >
        <TimingPanel
          party={party}
          participants={participants}
          settings={timing}
          onUpdate={updateTiming}
        />
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

  // 밸런스 게임 득표 모의 통계
  const aVotes = 6 + (pick === 'a' ? 1 : 0)
  const bVotes = 4 + (pick === 'b' ? 1 : 0)
  const totalVotes = aVotes + bVotes
  const aPercent = Math.round((aVotes / totalVotes) * 100)
  const bPercent = 100 - aPercent
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
          <Icon name="close" size={1} />
        </button>
        {rec.kind === 'balance-game' && (
          <>
            <span className={styles.recKicker}>⚖️ 밸런스 게임</span>
            <p className={styles.recSub}>둘 중 하나, 이유와 함께 말해봐요</p>
            <div className={styles.recChoices}>
              {(['a', 'b'] as const).map((side) => (
                <button
                  key={side}
                  className={`${styles.recChoice} ${pick === side ? styles.recChoiceOn : ''} ${pick && pick !== side ? styles.recChoiceOff : ''}`}
                  onClick={() => !pick && setPick(side)}
                  disabled={!!pick}
                >
                  <span className={styles.choiceAlphabet}>{side.toUpperCase()}</span>
                  <span className={styles.choiceText}>{String(p[side] ?? '')}</span>
                </button>
              ))}
            </div>

            {pick && (
              <motion.div
                className={styles.pollResults}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className={styles.pollLabels}>
                  <span>
                    {aPercent}% ({aVotes}명)
                  </span>
                  <span>우리 방 선택 현황</span>
                  <span>
                    {bPercent}% ({bVotes}명)
                  </span>
                </div>
                <div className={styles.pollBarContainer}>
                  <div className={styles.pollBarA} style={{ width: `${aPercent}%` }} />
                  <div className={styles.pollBarB} style={{ width: `${bPercent}%` }} />
                </div>
              </motion.div>
            )}
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
  onSendNote,
  hubId,
  iAmHub,
  roundIndex,
  totalRounds,
  me,
  meId,
}: {
  partners: {
    id: string
    nickname: string
    mbti?: string | null
    interests: string[]
    verified?: boolean
    isGuest?: boolean
    avatarImage?: string | null
  }[]
  seatLabel: string
  lastCard?: string
  onLike: (id: string) => void
  onDrawCard: () => void
  onSendNote: (p: { id: string; nickname: string }) => void
  hubId?: string | null
  iAmHub?: boolean
  roundIndex: number | null
  totalRounds: number
  me: CompatInput
  meId: string
}) {
  return (
    <div className={styles.pair}>
      <div className={styles.seatLabel}>
        좌석 {seatLabel} ·{' '}
        {hubId ? 'N:1 핫시트' : partners.length <= 1 ? '1:1 대화' : `그룹 ${partners.length + 1}명`}
      </div>
      {iAmHub && (
        <div className={styles.hubBanner}>
          <Badge tone="gold">
            <Icon name="flame" size={0.85} aria-hidden="true" /> 당신이 핫시트예요 · 모두의 질문에
            답해보세요
          </Badge>
        </div>
      )}
      <div className={styles.partners}>
        {partners.map((p, i) => (
          <motion.div
            key={p.id}
            className={styles.partner}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12, duration: 0.5 }}
          >
            <Avatar
              size="xl"
              hue="var(--brand-paper-50)"
              pattern="gradient"
              emoji={p.nickname[0]}
              imageSrc={p.avatarImage ?? null}
              ring="glow"
            />
            <h2 className={styles.partnerName}>{p.nickname}</h2>
            <div className={styles.partnerMeta}>
              {p.isGuest && <Badge tone="gold">게스트</Badge>}
              {p.verified && (
                <Badge tone="info">
                  <Icon name="check" size={0.8} aria-hidden="true" /> 본인인증
                </Badge>
              )}
              {hubId === p.id && (
                <Badge tone="gold">
                  <Icon name="flame" size={0.8} aria-hidden="true" /> 핫시트
                </Badge>
              )}
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
            <div className={styles.partnerCtas}>
              <Button
                variant="gold"
                size="sm"
                leftIcon={<Icon name="sparkle" size={0.9} aria-hidden="true" />}
                onClick={() => onLike(p.id)}
              >
                좋았어요
              </Button>
              <Button
                variant="soft"
                size="sm"
                leftIcon={<Icon name="mail" size={0.9} aria-hidden="true" />}
                onClick={() => onSendNote({ id: p.id, nickname: p.nickname })}
              >
                쪽지
              </Button>
            </div>
            <CompatChip me={me} meId={meId} partner={p} />
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

      <ConversationKit roundIndex={roundIndex} totalRounds={totalRounds} />
    </div>
  )
}

/** 서로 간의 궁합 운세 — 탭하면 점수+한 줄 운세를 펼친다. */
function CompatChip({
  me,
  meId,
  partner,
}: {
  me: CompatInput
  meId: string
  partner: { id: string; mbti?: string | null; interests: string[] }
}) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        궁합 보기
      </Button>
    )
  }
  const c = computeCompatibility(me, partner, `${meId}-${partner.id}`)
  return (
    <div className={styles.compat}>
      <strong className={styles.compatScore}>
        {c.score}점 · {c.title}
      </strong>
      <p className={styles.compatBlurb}>{c.blurb}</p>
      {c.factors.length > 0 && <p className={styles.compatFactors}>{c.factors.join(' · ')}</p>}
    </div>
  )
}

const KIT_KINDS: { value: PromptKind; label: string; emoji: string }[] = [
  { value: 'icebreaker', label: '가볍게', emoji: '🫧' },
  { value: 'deep', label: '깊게', emoji: '🌙' },
  { value: 'balance', label: '밸런스', emoji: '⚖️' },
  { value: 'ideal', label: '이상형', emoji: '💘' },
  { value: 'game', label: '게임', emoji: '🎮' },
]

/** 라운드 진행도에 따라 추천 덱 (초반 가볍게 → 중반 밸런스 → 후반 이상형). WNRS 3단계 차용. */
function suggestKitKind(roundIndex: number | null, totalRounds: number): PromptKind {
  if (!roundIndex || totalRounds <= 0) return 'icebreaker'
  const p = roundIndex / totalRounds
  if (p <= 1 / 3) return 'icebreaker'
  if (p <= 2 / 3) return 'balance'
  return 'ideal'
}

/** 참가자용 대화 도우미 — 라운드 진행도에 맞춰 주제를 추천한다. */
function ConversationKit({
  roundIndex,
  totalRounds,
}: {
  roundIndex: number | null
  totalRounds: number
}) {
  const suggested = suggestKitKind(roundIndex, totalRounds)
  const sourceKey = `${roundIndex ?? 'none'}:${totalRounds}`
  const [override, setOverride] = useState<{
    sourceKey: string
    kind: PromptKind
    idx: number
  } | null>(null)
  const kind = override?.sourceKey === sourceKey ? override.kind : suggested
  const idx = override?.sourceKey === sourceKey ? override.idx : 0
  const card = buildConversationCard(kind, idx)
  return (
    <div className={styles.kit}>
      <div className={styles.kitHead}>
        <h3 className={styles.cardLabel}>대화 도우미</h3>
        <span className={styles.kitHint}>대화가 끊기면 눌러요</span>
      </div>
      <div className={styles.kitChips} role="group" aria-label="대화 주제 종류">
        {KIT_KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            className={`${styles.kitChip} ${kind === k.value ? styles.kitChipOn : ''}`}
            aria-pressed={kind === k.value}
            onClick={() => {
              setOverride({ sourceKey, kind: k.value, idx: 0 })
            }}
          >
            <span aria-hidden="true">{k.emoji}</span> {k.label}
            {k.value === suggested ? ' · 추천' : ''}
          </button>
        ))}
      </div>
      <motion.p
        key={`${kind}-${idx}`}
        className={styles.kitText}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {card.text}
      </motion.p>
      {card.hint && <p className={styles.kitSub}>{card.hint}</p>}
      <Button variant="soft" onClick={() => setOverride({ sourceKey, kind, idx: idx + 1 })}>
        🎲 다음 주제
      </Button>
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
  longBreakMin,
}: {
  status: string
  participantCount: number
  roundIndex: number | null
  isHost: boolean
  /** 휴식 규칙(N라운드마다 M분)에 걸린 긴 휴식이면 분 단위 값 */
  longBreakMin?: number | null
}) {
  const inLongBreak = status !== 'ended' && !!roundIndex && !!longBreakMin
  return (
    <div className={styles.wait}>
      <motion.div
        className={styles.waitOrb}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
        aria-hidden="true"
      >
        {status === 'ended' ? '🌹' : inLongBreak ? '☕' : '🍷'}
      </motion.div>
      <h2 className={styles.waitTitle}>
        {status === 'ended'
          ? '오늘의 라운드를 마쳤어요'
          : inLongBreak
            ? `쉬는 시간 — ${longBreakMin}분`
            : roundIndex
              ? `라운드 ${roundIndex} 휴식`
              : '곧 라운드가 시작됩니다'}
      </h2>
      <p className={styles.waitSub}>
        {status === 'ended'
          ? '곧 최종 매칭을 공개할게요'
          : inLongBreak
            ? `라운드 ${roundIndex}까지 마쳤어요. 화장실·리필 타임! ${longBreakMin}분 뒤 다음 라운드를 시작해 주세요.`
            : isHost
              ? '“다음 라운드 시작”을 눌러 라운드를 시작해주세요'
              : `호스트가 다음 라운드를 곧 시작합니다. 함께한 인원: ${participantCount}명`}
      </p>
    </div>
  )
}

function HostBar({
  onOpenOps,
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
  onOpenOps: () => void
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
      <span className={styles.barRole}>
        <Icon name="shield" size={0.9} aria-hidden="true" /> 호스트 콘솔
      </span>
      {composing ? (
        <div className={styles.announceCompose}>
          <input
            type="text"
            className={styles.announceInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 140))}
            placeholder="모든 참가자에게 한 줄 공지 (최대 140자)"
            aria-label="공지 내용"
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
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Icon name="bell" size={0.85} aria-hidden="true" />}
            onClick={submit}
            disabled={!draft.trim()}
          >
            발사
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
        <div className={styles.barActions}>
          <div className={styles.barSecondary}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Icon name="clock" size={0.85} aria-hidden="true" />}
              onClick={onOpenOps}
            >
              타이밍
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Icon name="bell" size={0.85} aria-hidden="true" />}
              onClick={() => setComposing(true)}
            >
              공지
            </Button>
            <Button variant="ghost" size="sm" onClick={onCheers}>
              🥂 건배
            </Button>
            <Button variant="ghost" size="sm" onClick={onShuffle}>
              🔀 셔플
            </Button>
            <Button variant="ghost" size="sm" onClick={onComplimentRain}>
              💖 칭찬 폭우
            </Button>
            <span className={styles.barDeck}>
              <Button
                variant="soft"
                size="sm"
                onClick={() =>
                  fireRec('balance-game', { ...BALANCE_GAMES[ri % BALANCE_GAMES.length] })
                }
              >
                ⚖️ 밸런스
              </Button>
              <Button
                variant="soft"
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
                variant="soft"
                size="sm"
                onClick={() => fireRec('fortune', { ...drawFortune(ri) })}
              >
                🔮 운세
              </Button>
              <Button
                variant="soft"
                size="sm"
                onClick={() => fireRec('mini-game', { ...MINI_GAMES[ri % MINI_GAMES.length] })}
              >
                🎮 미니게임
              </Button>
            </span>
            <Button variant="ghost" size="sm" onClick={onLaunchQuiz}>
              🎯 퀴즈 발사
            </Button>
            <Button variant="ghost" size="sm" onClick={onEndRound}>
              라운드 종료
            </Button>
            <Button variant="danger" size="sm" onClick={onEndParty}>
              파티 종료
            </Button>
          </div>
          <Button
            className={styles.primaryAction}
            variant="primary"
            size="lg"
            rightIcon={<Icon name="chevron-right" size={1} aria-hidden="true" />}
            onClick={onNextRound}
          >
            다음 라운드
          </Button>
        </div>
      )}
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
      <span className={styles.barRole}>
        <Icon name="user" size={0.9} aria-hidden="true" /> 참가자
      </span>
      <div className={styles.barActions}>
        <div className={styles.barSecondary}>
          {ordersEnabled && (
            <Button variant="ghost" size="md" onClick={onOpenOrder}>
              🍷 음료/안주 추가
            </Button>
          )}
        </div>
        {enableFinalMatch && (
          <Button
            className={styles.primaryAction}
            variant="gold"
            size="lg"
            leftIcon={<Icon name="mail" size={1} aria-hidden="true" />}
            onClick={onFinalVote}
          >
            최종 매칭 투표
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
                  <Icon name="close" size={0.85} />
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
