import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useParty } from '@features/parties/queries'
import { useEnsurePartyRoom } from '@features/chat/queries'
import { useMyPartyMatches, type MatchResult, type PartyMatch } from '@features/matching/queries'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import styles from './MatchReveal.module.css'

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
  const ensureRoom = useEnsurePartyRoom()

  if (isLoading) return <Loading />

  const matches = data?.matches ?? []
  const title = party?.party.title ?? '오늘의 모임'

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
          transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
        >
          🌹 오늘의 인연
        </motion.h1>
        <p className={styles.lead}>
          {title} · {data ? (SCOPE_LEAD[data.scope] ?? '오늘의 인연이에요.') : ''}
        </p>
      </header>

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
                  connectionMode={data?.connectionMode ?? 'chat'}
                  index={i}
                  reduce={reduce}
                  onChat={() => navigate('/chats')}
                  onCopyPhone={async (phone) => {
                    try {
                      await navigator.clipboard.writeText(phone)
                      toast.show('연락처를 복사했어요', 'success')
                    } catch {
                      toast.show('복사에 실패했어요', 'error')
                    }
                  }}
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

function MatchCard({
  match,
  connectionMode,
  index,
  reduce,
  onChat,
  onCopyPhone,
}: {
  match: PartyMatch
  connectionMode: string
  index: number
  reduce: boolean
  onChat: () => void
  onCopyPhone: (phone: string) => void
}) {
  const [showPhone, setShowPhone] = useState(false)
  const wantsChat = connectionMode === 'chat' || connectionMode === 'both'
  const wantsPhone = connectionMode === 'phone' || connectionMode === 'both'
  return (
    <motion.article
      className={`${styles.card} ${match.result === 'mutual' ? styles.cardMutual : ''}`}
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.09, 0.6), ease: [0.19, 1, 0.22, 1] }}
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
        {wantsChat && (
          <Button variant="primary" size="sm" fullWidth onClick={onChat}>
            💬 채팅으로 이어가기
          </Button>
        )}
        {wantsPhone &&
          (match.phone ? (
            showPhone ? (
              <button
                type="button"
                className={styles.phoneReveal}
                onClick={() => onCopyPhone(match.phone!)}
                title="탭하면 복사돼요"
              >
                📞 {match.phone}
              </button>
            ) : (
              <Button variant="soft" size="sm" fullWidth onClick={() => setShowPhone(true)}>
                📞 연락처 보기
              </Button>
            )
          ) : (
            <span className={styles.phoneLocked}>상대가 연락처를 비공개했어요</span>
          ))}
      </div>
    </motion.article>
  )
}
