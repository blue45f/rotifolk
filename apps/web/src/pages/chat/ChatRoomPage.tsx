import Loading from '@components/feedback/Loading'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import EnchantingTitle from '@components/ui/EnchantingTitle/EnchantingTitle'
import { Icon } from '@components/ui/Icon/Icon'
import { useAuthStore } from '@store/authStore'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'

import styles from './Chat.module.css'

import {
  useChatMessages,
  useSendMessage,
  useMyChatRooms,
  useMarkChatRead,
} from '@/domains/chat/queries'

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|svg)(\?.*)?$/i

function isImageUrl(s: string): boolean {
  try {
    const url = new URL(s)
    return (url.protocol === 'https:' || url.protocol === 'http:') && IMAGE_EXT.test(url.pathname)
  } catch {
    return false
  }
}

const URL_RE = /https?:\/\/[^\s]+/g

function MessageBody({ body }: { body: string }) {
  const urls = Array.from(body.matchAll(URL_RE), (m) => m[0])
  if (urls.length === 0) return <p className={styles.msgText}>{body}</p>

  const imageUrls = urls.filter(isImageUrl)
  const plainText = body.replace(URL_RE, '').trim()

  return (
    <>
      {plainText && <p className={styles.msgText}>{plainText}</p>}
      {imageUrls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className={styles.msgImgLink}
        >
          <img src={url} alt="" className={styles.msgImg} loading="lazy" />
        </a>
      ))}
      {urls
        .filter((u) => !isImageUrl(u))
        .map((url) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className={styles.msgLink}
          >
            {url.length > 50 ? url.slice(0, 50) + '…' : url}
          </a>
        ))}
    </>
  )
}

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.user)
  const { data: rooms } = useMyChatRooms()
  const room = useMemo(() => rooms?.find((r) => r.id === roomId), [rooms, roomId])
  const { data: messages, isLoading } = useChatMessages(roomId)
  const send = useSendMessage(roomId!)
  const markRead = useMarkChatRead(roomId)
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const lastMarkedRef = useRef<string | null>(null)
  const latestMessageId = messages?.at(-1)?.id

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages?.length])

  useEffect(() => {
    if (!roomId || !latestMessageId || markRead.isPending) return
    if (lastMarkedRef.current === latestMessageId) return
    lastMarkedRef.current = latestMessageId
    markRead.mutate()
  }, [roomId, latestMessageId, markRead])

  if (isLoading || !room) return <Loading />
  const counterpart = room.kind === 'pair' ? room.members.find((m) => m.userId !== me?.id) : null
  // 멤버별 업로드 사진 조회용 — 메시지 행 아바타가 프리셋 대신 사진을 보여줄 수 있게.
  const memberImageById = new Map(room.members.map((m) => [m.userId, m.avatarImage ?? null]))
  const isPair = room.kind === 'pair'
  const name = isPair ? (counterpart?.nickname ?? '매칭') : (room.title ?? '파티 단톡방')

  const handleSend = async () => {
    const body = text.trim()
    if (!body) return
    setText('')
    await send.mutateAsync({ body })
  }

  return (
    <div className={styles.roomWrap}>
      <header className={styles.roomHeader}>
        <button
          className={styles.roomBack}
          onClick={() => navigate('/chats')}
          aria-label="채팅 목록으로"
        >
          <Icon name="chevron-right" className={styles.roomBackIcon} />
        </button>
        <Avatar
          size="sm"
          hue={isPair ? 'var(--brand-apricot-400)' : 'var(--color-primary)'}
          pattern="gradient"
          emoji={isPair ? '💌' : '🍷'}
          imageSrc={isPair ? (counterpart?.avatarImage ?? null) : null}
          ring="soft"
        />
        <div className={styles.roomHeaderBody}>
          <EnchantingTitle className={styles.roomTitle}>{name}</EnchantingTitle>
          {room.partyId && !isPair ? (
            <Link to={`/parties/${room.partyId}`} className={styles.roomPartyLink}>
              파티 보기
              <Icon name="chevron-right" size={0.85} />
            </Link>
          ) : (
            <span className={styles.roomSub}>{room.members.length}명</span>
          )}
        </div>
      </header>

      <main className={styles.roomMain} aria-label={`${name} 대화`}>
        <ol className={styles.msgLog}>
          {(messages ?? []).map((m) => {
            const mine = m.userId === me?.id
            if (m.kind === 'split-bill') {
              return (
                <li key={m.id} className={styles.logItem}>
                  <SplitBillCard meta={m.meta} />
                </li>
              )
            }
            if (m.kind === 'system') {
              return (
                <li key={m.id} className={`${styles.logItem} ${styles.systemMsg}`}>
                  <span>{m.body}</span>
                </li>
              )
            }
            return (
              <li
                key={m.id}
                className={`${styles.logItem} ${styles.msgRow} ${mine ? styles.msgMine : ''}`}
              >
                {!mine && (
                  <Avatar
                    size="sm"
                    hue="var(--color-primary)"
                    pattern="gradient"
                    emoji={m.nickname[0]}
                    imageSrc={memberImageById.get(m.userId) ?? null}
                  />
                )}
                <div className={styles.msgBubble}>
                  {!mine && <div className={styles.msgName}>{m.nickname}</div>}
                  <MessageBody body={m.body} />
                  <time dateTime={new Date(m.createdAt).toISOString()}>
                    {new Date(m.createdAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
              </li>
            )
          })}
        </ol>
        <div ref={endRef} />
      </main>

      <footer className={styles.roomFooter}>
        <label htmlFor="chat-composer" className="sr-only">
          메시지 입력
        </label>
        <textarea
          id="chat-composer"
          className={styles.composer}
          placeholder="메시지 입력 (Enter 전송, Shift+Enter 줄바꿈)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!text.trim() || send.isPending}
          aria-label="전송"
          leftIcon={<Icon name="chevron-right" />}
        >
          전송
        </Button>
      </footer>
    </div>
  )
}

function SplitBillCard({ meta }: { meta?: Record<string, unknown> | null }) {
  const total = (meta?.totalKRW as number) ?? 0
  const headcount = (meta?.headcount as number) ?? 1
  const per = (meta?.perPersonKRW as number) ?? Math.ceil(total / Math.max(1, headcount))
  return (
    <div className={styles.splitCard}>
      <div className={styles.splitHead}>
        <span aria-hidden>💰</span>
        <strong>엔빵 정산 안내</strong>
      </div>
      <ul>
        <li>
          합계 <strong>{total.toLocaleString()}원</strong>
        </li>
        <li>
          인원 <strong>{headcount}명</strong>
        </li>
        <li>
          1인당 <strong>{per.toLocaleString()}원</strong>
        </li>
      </ul>
      <p className={styles.splitFoot}>호스트 계좌로 송금하면 자동으로 체크돼요.</p>
    </div>
  )
}
