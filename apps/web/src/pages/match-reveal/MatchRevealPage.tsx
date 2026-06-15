import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/useToast'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
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
import { AfterPartyManager } from '@features/parties/AfterPartyManager'
import { useParty } from '@features/parties/queries'
import {
  CONNECTION_CHANNELS,
  CONTACT_EXCHANGE_POLICY_LABEL,
  type ConnectionChannel,
  type ContactExchangeChannelState,
  type ContactExchangePolicy,
  type MatchScope,
} from '@rotifolk/shared'
import { useAuthStore } from '@store/authStore'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

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
  const hasMatches = matches.length > 0

  // 가장 또렷한 인연을 무대 중앙에. 상호 매칭이 있으면 그 사람을 먼저.
  const featured = hasMatches ? (matches.find((m) => m.result === 'mutual') ?? matches[0]) : null
  const rest = featured ? matches.filter((m) => m.partnerId !== featured.partnerId) : []

  const headline = hasMatches ? '오늘, 서로를 골랐어요' : '오늘의 라운드가 끝났어요'
  const announce = hasMatches
    ? `매칭 ${matches.length}명. ${featured?.nickname ?? ''}님과 이어졌어요.`
    : '이번엔 최종 매칭이 없어요.'

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
    channel: ConnectionChannel
  ) => {
    const key = `${partnerId}:${channel}:${action}`
    setBusyKey(key)
    try {
      await decideContact.mutateAsync({ requestId, action })
      toast.show(
        action === 'approve' ? '승인했어요' : '거절했어요',
        action === 'approve' ? 'success' : 'info'
      )
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className={styles.page}>
      {/* 스크린리더에 결과를 한 번 또렷하게 알린다. */}
      <p className={styles.srOnly} role="status" aria-live="polite">
        {announce}
      </p>

      <header className={`container ${styles.head}`}>
        <span className={styles.kicker}>
          <Icon name="sparkle" aria-hidden /> MATCH RESULT
        </span>
        <motion.h1
          className={styles.title}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {headline}
        </motion.h1>
        <p className={styles.lead}>
          {title}. {data ? SCOPE_LEAD[data.scope] : '오늘 이어질 인연을 확인해요.'}
        </p>
        <p className={styles.policyNote}>
          {data && (
            <Badge tone={policy === 'request-approval' ? 'gold' : 'primary'} size="sm">
              {CONTACT_EXCHANGE_POLICY_LABEL[policy]}
            </Badge>
          )}
          <span>{POLICY_LEAD[policy]}</span>
        </p>
      </header>

      <main className={`container ${styles.body}`}>
        {!hasMatches ? (
          <section className={styles.empty} aria-labelledby="empty-title">
            <span className={styles.emptyMark} aria-hidden="true">
              <Icon name="moon" />
            </span>
            <h2 id="empty-title">이번엔 최종 매칭이 없어요</h2>
            <p>라운드 기록은 남아 있어요. 다음 모임에서는 더 편하게 선택해 보세요.</p>
            <Link to="/discover" className={styles.emptyCta}>
              <Button variant="primary" size="lg" leftIcon={<Icon name="compass" aria-hidden />}>
                다음 모임 보기
              </Button>
            </Link>
          </section>
        ) : (
          <>
            {featured && (
              <SpotlightMatch
                match={featured}
                reduce={reduce}
                busyKey={busyKey}
                onChat={() => navigate('/chats')}
                onCopyHandle={copyHandle}
                onRequestContact={requestExternalContact}
                onDecideContact={decideExternalContact}
              />
            )}

            {rest.length > 0 && (
              <section className={styles.restSection} aria-label="이어진 다른 인연">
                <h2 className={styles.restHeading}>
                  이어진 다른 인연 <span aria-hidden="true">{rest.length}</span>
                </h2>
                <div className={styles.grid}>
                  {rest.map((match, index) => (
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
              </section>
            )}

            <PopularBanner popular={popular} reduce={reduce} />

            {data?.groupAfterParty && (
              <AfterPartyManager partyId={partyId!} isHost={party?.party.hostId === me?.id} />
            )}
          </>
        )}
      </main>

      <footer className={`container ${styles.footer}`}>
        <Link to="/me/cards">
          <Button variant="soft" leftIcon={<Icon name="bookmark" aria-hidden />}>
            내 매칭 명함
          </Button>
        </Link>
        <Link to={`/parties/${partyId}`}>
          <Button variant="ghost" leftIcon={<Icon name="chevron-right" aria-hidden />}>
            파티로 돌아가기
          </Button>
        </Link>
      </footer>
    </div>
  )
}

/**
 * 무대 중앙의 한 사람. 큰 아바타(글로우 링) + 이름 + 궁합 + 단 하나의 1차 CTA.
 * 매칭의 감정적 절정을 한 카드에 모은다.
 */
function SpotlightMatch({
  match,
  reduce,
  busyKey,
  onChat,
  onCopyHandle,
  onRequestContact,
  onDecideContact,
}: {
  match: PartyMatch
  reduce: boolean
  busyKey: string | null
  onChat: () => void
  onCopyHandle: (handle: string) => void
  onRequestContact: (partnerId: string, channel: ConnectionChannel) => void
  onDecideContact: (
    requestId: string,
    action: 'approve' | 'reject',
    partnerId: string,
    channel: ConnectionChannel
  ) => void
}) {
  const chat = match.channels.find((channel) => channel.channel === 'chat')
  const externalChannels = match.channels.filter((channel) => channel.channel !== 'chat')

  return (
    <motion.section
      className={styles.spotlight}
      aria-labelledby="spotlight-name"
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className={styles.spotlightGlow} aria-hidden="true" />
      <div className={styles.spotlightAvatar}>
        <Avatar
          size="xl"
          hue="var(--color-primary)"
          pattern="gradient"
          emoji={match.nickname[0]}
          imageSrc={match.avatarImage ?? null}
          ring={match.result === 'mutual' ? 'glow' : 'gold'}
        />
      </div>

      <div className={styles.spotlightBadges}>
        <Badge tone={match.result === 'mutual' ? 'gold' : 'primary'} size="md">
          {RESULT_LABEL[match.result]}
        </Badge>
        {match.verified && (
          <Badge tone="info" size="md">
            본인인증
          </Badge>
        )}
      </div>

      <h2 id="spotlight-name" className={styles.spotlightName}>
        {match.nickname}
      </h2>

      {match.compatibility && (
        <div className={styles.spotlightCompat}>
          <strong>
            궁합 {match.compatibility.score}점 · {match.compatibility.title}
          </strong>
          {match.compatibility.blurb && <p>{match.compatibility.blurb}</p>}
          {match.compatibility.factors && match.compatibility.factors.length > 0 && (
            <span>{match.compatibility.factors.join(' · ')}</span>
          )}
        </div>
      )}

      <div className={styles.spotlightAction}>
        <Button
          variant="primary"
          size="xl"
          fullWidth
          onClick={onChat}
          disabled={!chat}
          leftIcon={<Icon name="chat" aria-hidden />}
        >
          채팅 시작하기
        </Button>
        {!chat && <span className={styles.actionNote}>이 모임은 채팅 채널을 제공하지 않아요.</span>}
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
    </motion.section>
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
      className={styles.popular}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: 0.08, ease: EASE }}
      aria-label="오늘 많이 선택된 멤버"
    >
      <span className={styles.popularKicker}>
        <Icon name="flame" aria-hidden /> 오늘 많이 선택된 멤버
      </span>
      <div className={styles.popularRow}>
        {winners.map(({ person, label }) => (
          <div key={person.userId} className={styles.popularCard}>
            <Avatar
              size="lg"
              hue="var(--color-primary)"
              pattern="sparkle"
              emoji={person.nickname[0]}
              imageSrc={person.avatarImage ?? null}
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
    channel: ConnectionChannel
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
          size="lg"
          hue="var(--color-primary)"
          pattern="gradient"
          emoji={match.nickname[0]}
          imageSrc={match.avatarImage ?? null}
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
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onChat}
          disabled={!chat}
          leftIcon={<Icon name="chat" aria-hidden />}
        >
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
    channel: ConnectionChannel
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
