import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { CONNECTION_CHANNELS, type ConnectionChannel } from '@rotifolk/shared'
import { useParty } from '@features/parties/queries'
import { useEnsurePartyRoom } from '@features/chat/queries'
import {
  useMyPartyMatches,
  usePartyPopular,
  type MatchChannel,
  type MatchResult,
  type PartyMatch,
  type PopularPerson,
} from '@features/matching/queries'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import styles from './MatchReveal.module.css'

const EASE = [0.19, 1, 0.22, 1] as const

const RESULT_LABEL: Record<MatchResult, string> = {
  mutual: '서로 골랐어요',
  'top-pick': '오늘의 상위 선택',
  all: '함께한 인연',
}
const SCOPE_LEAD: Record<string, string> = {
  'mutual-only': '서로를 고른 사람만 이어집니다.',
  'top-n': '오늘 마음이 모인 상위 인연이에요.',
  'all-participants': '오늘 함께한 모두와 이어집니다.',
}

export default function MatchRevealPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const reduce = useReducedMotion() ?? false
  const { data: party } = useParty(partyId)
  const { data, isLoading } = useMyPartyMatches(partyId)
  const { data: popular } = usePartyPopular(partyId)
  const ensureRoom = useEnsurePartyRoom()

  if (isLoading) return <Loading />

  const matches = data?.matches ?? []
  const title = party?.party.title ?? '오늘의 모임'

  const copyHandle = async (handle: string) => {
    try {
      await navigator.clipboard.writeText(handle)
      toast.show('복사했어요', 'success')
    } catch {
      toast.show('복사에 실패했어요', 'error')
    }
  }

  const openGroup = async () => {
    if (!partyId) return
    try {
      const room = await ensureRoom.mutateAsync(partyId)
      navigate(`/chats/${room.id}`)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <header className={`container ${styles.head}`}>
        <span className={styles.kicker}>AFTER THE ROUNDS</span>
        <motion.h1
          className={styles.title}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          🌹 오늘의 인연
        </motion.h1>
        <p className={styles.lead}>
          {title} · {data ? (SCOPE_LEAD[data.scope] ?? '오늘의 인연이에요.') : ''}
        </p>
      </header>

      <PopularBanner popular={popular} reduce={reduce} />

      <section className={`container ${styles.body}`}>
        {matches.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyOrb} aria-hidden="true">
              🌙
            </div>
            <h2>이번엔 인연이 닿지 않았어요</h2>
            <p>
              괜찮아요. 좋은 대화는 그 자체로 남으니까요. 다음 라운드에서 또 다른 한 잔을 기울여
              봐요.
            </p>
            <Link to="/discover">
              <Button variant="primary" size="lg">
                다음 모임 둘러보기
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <p className={styles.count}>
              <strong>{matches.length}</strong>명과 이어졌어요
            </p>
            <div className={styles.grid}>
              {matches.map((m, i) => (
                <MatchCard
                  key={m.partnerId}
                  match={m}
                  index={i}
                  reduce={reduce}
                  onChat={() => navigate('/chats')}
                  onCopyHandle={copyHandle}
                />
              ))}
            </div>

            {data?.groupAfterParty && (
              <div className={styles.groupCard}>
                <div>
                  <strong>👥 오늘 모두와 한 방에서</strong>
                  <span>종료 후 전원 단톡으로 여운을 이어가요.</span>
                </div>
                <Button
                  variant="gold"
                  size="lg"
                  isLoading={ensureRoom.isPending}
                  onClick={openGroup}
                >
                  전원 단톡 열기
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <footer className={`container ${styles.footer}`}>
        <Link to="/me/cards">
          <Button variant="soft">내 매칭 명함 보기</Button>
        </Link>
        <Link to={`/parties/${partyId}`}>
          <Button variant="ghost">파티로 돌아가기</Button>
        </Link>
      </footer>
    </div>
  )
}

function PopularBanner({
  popular,
  reduce,
}: {
  popular?: {
    revealPopular: boolean
    popularMale: PopularPerson | null
    popularFemale: PopularPerson | null
  }
  reduce: boolean
}) {
  if (!popular?.revealPopular) return null
  const winners: Array<{ person: PopularPerson; label: string }> = []
  if (popular.popularMale) winners.push({ person: popular.popularMale, label: '오늘의 인기남' })
  if (popular.popularFemale) winners.push({ person: popular.popularFemale, label: '오늘의 인기녀' })
  if (winners.length === 0) return null

  return (
    <motion.section
      className={`container ${styles.popular}`}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
      aria-label="오늘의 인기 멤버"
    >
      <span className={styles.popularKicker}>👑 오늘 가장 사랑받은</span>
      <div className={styles.popularRow}>
        {winners.map(({ person, label }) => (
          <div key={person.userId} className={styles.popularCard}>
            <div className={styles.crown} aria-hidden="true">
              👑
            </div>
            <Avatar
              size="lg"
              hue="#7A1F3D"
              pattern="sparkle"
              emoji={person.nickname[0]}
              ring="gold"
            />
            <span className={styles.popularLabel}>{label}</span>
            <strong className={styles.popularName}>{person.nickname}</strong>
            <span className={styles.popularLikes}>
              {person.likes == null ? '많은 호감을 받았어요' : `${person.likes}명에게 호감`}
            </span>
          </div>
        ))}
      </div>
    </motion.section>
  )
}

function MatchCard({
  match,
  index,
  reduce,
  onChat,
  onCopyHandle,
}: {
  match: PartyMatch
  index: number
  reduce: boolean
  onChat: () => void
  onCopyHandle: (handle: string) => void
}) {
  return (
    <motion.article
      className={`${styles.card} ${match.result === 'mutual' ? styles.cardMutual : ''}`}
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.09, 0.6), ease: EASE }}
    >
      <Avatar
        size="xl"
        hue="#7A1F3D"
        pattern="gradient"
        emoji={match.nickname[0]}
        ring={match.result === 'mutual' ? 'glow' : 'gold'}
      />
      <h3 className={styles.name}>{match.nickname}</h3>
      <Badge tone={match.result === 'mutual' ? 'gold' : 'wine'} size="sm">
        {RESULT_LABEL[match.result]}
      </Badge>

      <div className={styles.actions}>
        {match.channels.length === 0 ? (
          <span className={styles.channelLocked}>아직 열린 연결 채널이 없어요</span>
        ) : (
          match.channels.map((ch) => (
            <ChannelRow key={ch.channel} channel={ch} onChat={onChat} onCopyHandle={onCopyHandle} />
          ))
        )}
      </div>
    </motion.article>
  )
}

function ChannelRow({
  channel,
  onChat,
  onCopyHandle,
}: {
  channel: MatchChannel
  onChat: () => void
  onCopyHandle: (handle: string) => void
}) {
  const meta = CONNECTION_CHANNELS[channel.channel as ConnectionChannel]
  const [revealed, setRevealed] = useState(false)

  // 앱 내 채팅: 핸들 없이 바로 채팅으로 이어짐
  if (channel.channel === 'chat') {
    return (
      <div className={styles.channel}>
        <Button variant="primary" size="sm" fullWidth onClick={onChat}>
          {meta.icon} 채팅으로 이어가기
        </Button>
        <span className={styles.commitTag}>{meta.commitmentLabel}</span>
      </div>
    )
  }

  // 외부 채널인데 상대가 아직 공개하지 않은 경우
  if (channel.handle == null) {
    return (
      <div className={styles.channel}>
        <span className={styles.channelLocked}>
          {meta.icon} {meta.label} · 상대가 아직 공개하지 않았어요
        </span>
      </div>
    )
  }

  return (
    <div className={styles.channel}>
      {revealed ? (
        <button
          type="button"
          className={styles.handleReveal}
          onClick={() => onCopyHandle(channel.handle as string)}
          title="탭하면 복사돼요"
        >
          <span className={styles.handleIcon}>{meta.icon}</span>
          <span className={styles.handleValue}>{channel.handle}</span>
          <span className={styles.handleCopy}>복사</span>
        </button>
      ) : (
        <Button variant="soft" size="sm" fullWidth onClick={() => setRevealed(true)}>
          {meta.icon} {meta.label} 보기
        </Button>
      )}
      <span className={styles.commitTag}>{meta.commitmentLabel}</span>
      {channel.channel === 'phone' && meta.note && (
        <span className={styles.channelNote}>⚠️ {meta.note}</span>
      )}
    </div>
  )
}
