import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  CONNECTION_CHANNELS,
  CONTACT_EXCHANGE_POLICY_LABEL,
  type ConnectionChannel,
  type ContactExchangeChannelState,
  type ContactExchangePolicy,
  type MatchScope,
} from '@rotifolk/shared'
import { useParty } from '@features/parties/queries'
import {
  useDecideContactExchangeRequest,
  useMyPartyMatches,
  usePartyPopular,
  useRequestContactExchange,
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
import { useAuthStore } from '@store/authStore'
import { AfterPartyManager } from '@features/parties/AfterPartyManager'
import styles from './MatchReveal.module.css'

const EASE = [0.19, 1, 0.22, 1] as const

const RESULT_LABEL: Record<MatchResult, string> = {
  mutual: '서로 선택',
  'top-pick': '상위 인연',
  all: '함께한 인연',
}

const SCOPE_LEAD: Record<MatchScope, string> = {
  'mutual-only': '서로를 고른 사람만 보여드려요.',
  'top-n': '오늘 호감이 모인 인연까지 보여드려요.',
  'all-participants': '오늘 함께한 사람들과 이어질 수 있어요.',
  'mutual-plus-top-n': '상호 매칭을 먼저, 부족하면 상위 인연을 더 보여드려요.',
}

const POLICY_LEAD: Record<ContactExchangePolicy, string> = {
  'mutual-consent': '외부 연락처는 양쪽이 공개 동의했을 때만 보여요.',
  'chat-only': '오늘은 앱 안 채팅으로만 이어져요.',
  'open-after-match': '매칭된 사람의 공개 채널을 바로 볼 수 있어요.',
  'request-approval': '채팅은 바로 시작하고, 외부 연락처는 상대가 승인하면 보여요.',
}

const STATE_LABEL: Record<ContactExchangeChannelState, string> = {
  open: '바로 가능',
  requestable: '요청 가능',
  pending_me: '승인 대기',
  pending_them: '승인 필요',
  approved: '승인됨',
  rejected: '거절됨',
  locked: '준비 안 됨',
}

export default function MatchRevealPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const me = useAuthStore((s) => s.user)
  const reduce = useReducedMotion() ?? false
  const { data: party } = useParty(partyId)
  const { data, isLoading } = useMyPartyMatches(partyId)
  const { data: popular } = usePartyPopular(partyId)
  const requestContact = useRequestContactExchange(partyId)
  const decideContact = useDecideContactExchangeRequest(partyId)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  if (isLoading) return <Loading />

  const matches = data?.matches ?? []
  const title = party?.party.title ?? '오늘의 모임'
  const policy = data?.contactExchangePolicy ?? 'mutual-consent'

  const copyHandle = async (handle: string) => {
    try {
      await navigator.clipboard.writeText(handle)
      toast.show('복사했어요', 'success')
    } catch {
      toast.show('복사에 실패했어요', 'error')
    }
  }

  const requestExternalContact = async (partnerId: string, channel: ConnectionChannel) => {
    const key = `${partnerId}:${channel}:request`
    setBusyKey(key)
    try {
      await requestContact.mutateAsync({ partnerId, channel })
      toast.show('요청을 보냈어요. 상대가 승인하면 바로 보여드릴게요.', 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setBusyKey(null)
    }
  }

  const decideExternalContact = async (
    requestId: string,
    action: 'approve' | 'reject',
    partnerId: string,
    channel: ConnectionChannel,
  ) => {
    const key = `${partnerId}:${channel}:${action}`
    setBusyKey(key)
    try {
      await decideContact.mutateAsync({ requestId, action })
      toast.show(
        action === 'approve' ? '승인했어요' : '거절했어요',
        action === 'approve' ? 'success' : 'info',
      )
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <div className={styles.headTop}>
          <span className={styles.kicker}>MATCH RESULT</span>
          {data && (
            <Badge tone={policy === 'request-approval' ? 'gold' : 'primary'} size="md">
              {CONTACT_EXCHANGE_POLICY_LABEL[policy]}
            </Badge>
          )}
        </div>
        <motion.h1
          className={styles.title}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          이제 이렇게 이어가면 돼요
        </motion.h1>
        <p className={styles.lead}>
          {title}. {data ? SCOPE_LEAD[data.scope] : '오늘 이어질 인연을 확인해요.'}
        </p>

        {data && (
          <div className={styles.summary} aria-label="매칭 요약">
            <div className={styles.summaryItem}>
              <span>이어진 사람</span>
              <strong>{matches.length}명</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>받은 호감</span>
              <strong>{data.myLikesReceived ?? 0}개</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>연결 방식</span>
              <strong>{CONTACT_EXCHANGE_POLICY_LABEL[policy]}</strong>
            </div>
          </div>
        )}
        <p className={styles.policyNote}>{POLICY_LEAD[policy]}</p>
      </header>

      <PopularBanner popular={popular} reduce={reduce} />

      <section className={`container ${styles.body}`}>
        {matches.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyMark} aria-hidden="true">
              0
            </span>
            <h2>이번엔 최종 매칭이 없어요</h2>
            <p>라운드 기록은 남아 있어요. 다음 모임에서는 더 편하게 선택해 보세요.</p>
            <Link to="/discover">
              <Button variant="primary" size="lg">
                다음 모임 보기
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.resultBar}>
              <strong>먼저 채팅으로 인사해 보세요.</strong>
              <span>외부 연락처는 각 카드에서 상태를 확인할 수 있어요.</span>
            </div>
            <div className={styles.grid}>
              {matches.map((match, index) => (
                <MatchCard
                  key={match.partnerId}
                  match={match}
                  index={index}
                  reduce={reduce}
                  busyKey={busyKey}
                  onChat={() => navigate('/chats')}
                  onCopyHandle={copyHandle}
                  onRequestContact={requestExternalContact}
                  onDecideContact={decideExternalContact}
                />
              ))}
            </div>

            {data?.groupAfterParty && (
              <AfterPartyManager partyId={partyId!} isHost={party?.party.hostId === me?.id} />
            )}
          </>
        )}
      </section>

      <footer className={`container ${styles.footer}`}>
        <Link to="/me/cards">
          <Button variant="soft">내 매칭 명함</Button>
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
  if (popular.popularMale)
    winners.push({ person: popular.popularMale, label: '가장 많이 선택된 남성' })
  if (popular.popularFemale)
    winners.push({ person: popular.popularFemale, label: '가장 많이 선택된 여성' })
  if (winners.length === 0) return null

  return (
    <motion.section
      className={`container ${styles.popular}`}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: 0.08, ease: EASE }}
      aria-label="오늘 많이 선택된 멤버"
    >
      <span className={styles.popularKicker}>오늘 많이 선택된 멤버</span>
      <div className={styles.popularRow}>
        {winners.map(({ person, label }) => (
          <div key={person.userId} className={styles.popularCard}>
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
              {person.likes == null ? '많은 호감을 받았어요' : `${person.likes}명이 선택`}
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
  busyKey,
  onChat,
  onCopyHandle,
  onRequestContact,
  onDecideContact,
}: {
  match: PartyMatch
  index: number
  reduce: boolean
  busyKey: string | null
  onChat: () => void
  onCopyHandle: (handle: string) => void
  onRequestContact: (partnerId: string, channel: ConnectionChannel) => void
  onDecideContact: (
    requestId: string,
    action: 'approve' | 'reject',
    partnerId: string,
    channel: ConnectionChannel,
  ) => void
}) {
  const chat = match.channels.find((channel) => channel.channel === 'chat')
  const externalChannels = match.channels.filter((channel) => channel.channel !== 'chat')

  return (
    <motion.article
      className={`${styles.card} ${match.result === 'mutual' ? styles.cardMutual : ''}`}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.25), ease: EASE }}
    >
      <div className={styles.cardTop}>
        <Avatar
          size="xl"
          hue="#7A1F3D"
          pattern="gradient"
          emoji={match.nickname[0]}
          ring={match.result === 'mutual' ? 'glow' : 'gold'}
        />
        <div className={styles.identity}>
          <h3 className={styles.name}>{match.nickname}</h3>
          <div className={styles.badgeRow}>
            <Badge tone={match.result === 'mutual' ? 'gold' : 'wine'} size="sm">
              {RESULT_LABEL[match.result]}
            </Badge>
            {match.verified && (
              <Badge tone="info" size="sm">
                본인인증
              </Badge>
            )}
          </div>
        </div>
      </div>

      {match.compatibility && (
        <div className={styles.compatGroup}>
          <strong>
            궁합 {match.compatibility.score}점, {match.compatibility.title}
          </strong>
          {match.compatibility.blurb && <p>{match.compatibility.blurb}</p>}
          {match.compatibility.factors && match.compatibility.factors.length > 0 && (
            <span>{match.compatibility.factors.join(' · ')}</span>
          )}
        </div>
      )}

      <div className={styles.primaryAction}>
        <Button variant="primary" size="lg" fullWidth onClick={onChat} disabled={!chat}>
          채팅 시작하기
        </Button>
        {!chat && <span>이 모임은 채팅 채널을 제공하지 않아요.</span>}
      </div>

      <div className={styles.connections}>
        <div className={styles.connectionHeader}>
          <strong>외부 연락처</strong>
          <span>
            {externalChannels.length > 0 ? '필요한 채널만 열어보세요' : '제공된 외부 채널 없음'}
          </span>
        </div>
        {externalChannels.length === 0 ? (
          <span className={styles.channelLocked}>채팅으로 먼저 인사할 수 있어요.</span>
        ) : (
          externalChannels.map((channel) => (
            <ChannelRow
              key={channel.channel}
              partnerId={match.partnerId}
              channel={channel}
              busyKey={busyKey}
              onCopyHandle={onCopyHandle}
              onRequestContact={onRequestContact}
              onDecideContact={onDecideContact}
            />
          ))
        )}
      </div>
    </motion.article>
  )
}

function ChannelRow({
  partnerId,
  channel,
  busyKey,
  onCopyHandle,
  onRequestContact,
  onDecideContact,
}: {
  partnerId: string
  channel: MatchChannel
  busyKey: string | null
  onCopyHandle: (handle: string) => void
  onRequestContact: (partnerId: string, channel: ConnectionChannel) => void
  onDecideContact: (
    requestId: string,
    action: 'approve' | 'reject',
    partnerId: string,
    channel: ConnectionChannel,
  ) => void
}) {
  const meta = CONNECTION_CHANNELS[channel.channel]
  const [revealed, setRevealed] = useState(false)
  const state = channel.state ?? (channel.handle ? 'open' : 'locked')
  const canShowHandle = !!channel.handle && (state === 'open' || state === 'approved')
  const requestKey = `${partnerId}:${channel.channel}:request`
  const approveKey = `${partnerId}:${channel.channel}:approve`
  const rejectKey = `${partnerId}:${channel.channel}:reject`

  return (
    <div className={styles.channel}>
      <div className={styles.channelTop}>
        <div className={styles.channelMeta}>
          <strong>
            {meta.icon} {meta.label}
          </strong>
          <span>{channelHelpText(state, meta.commitmentLabel)}</span>
        </div>
        <span className={`${styles.statusPill} ${styles[`state_${state}`]}`}>
          {STATE_LABEL[state]}
        </span>
      </div>

      {canShowHandle ? (
        revealed ? (
          <button
            type="button"
            className={styles.handleReveal}
            onClick={() => onCopyHandle(channel.handle as string)}
            title="누르면 복사돼요"
          >
            <span className={styles.handleValue}>{channel.handle}</span>
            <span className={styles.handleCopy}>복사</span>
          </button>
        ) : (
          <Button variant="soft" size="sm" fullWidth onClick={() => setRevealed(true)}>
            {meta.short} 보기
          </Button>
        )
      ) : state === 'requestable' || (state === 'rejected' && channel.canRequest) ? (
        <Button
          variant="soft"
          size="sm"
          fullWidth
          isLoading={busyKey === requestKey}
          onClick={() => onRequestContact(partnerId, channel.channel)}
        >
          {state === 'rejected' ? `${meta.short} 다시 요청` : `${meta.short} 요청하기`}
        </Button>
      ) : state === 'pending_them' && channel.requestId ? (
        <div className={styles.buttonRow}>
          <Button
            variant="primary"
            size="sm"
            fullWidth
            isLoading={busyKey === approveKey}
            onClick={() =>
              onDecideContact(channel.requestId as string, 'approve', partnerId, channel.channel)
            }
          >
            승인
          </Button>
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            isLoading={busyKey === rejectKey}
            onClick={() =>
              onDecideContact(channel.requestId as string, 'reject', partnerId, channel.channel)
            }
          >
            거절
          </Button>
        </div>
      ) : (
        <span className={styles.channelLocked}>{lockedText(state, channel.requestedBy)}</span>
      )}

      {channel.channel === 'phone' && meta.note && (
        <p className={styles.channelNote}>{meta.note}</p>
      )}
    </div>
  )
}

function channelHelpText(state: ContactExchangeChannelState, commitment: string) {
  if (state === 'pending_them') return '상대가 공개를 요청했어요'
  if (state === 'pending_me') return '상대 승인 대기 중'
  if (state === 'approved') return '승인되어 확인 가능'
  if (state === 'requestable') return `${commitment}, 승인 후 공개`
  if (state === 'rejected') return '요청이 거절됐어요'
  if (state === 'locked') return '아직 사용할 수 없어요'
  return commitment
}

function lockedText(state: ContactExchangeChannelState, requestedBy?: 'me' | 'them' | null) {
  if (state === 'pending_me') return '요청을 보냈어요. 승인되면 연락처가 보여요.'
  if (state === 'rejected' && requestedBy === 'them') return '이 요청은 거절했어요.'
  if (state === 'rejected') return '상대가 이번 요청은 거절했어요.'
  return '서로의 연락처 공개 설정이 준비되면 요청할 수 있어요.'
}
