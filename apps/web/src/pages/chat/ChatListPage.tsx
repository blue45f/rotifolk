import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { EnchantingTitle } from '@components/ui/EnchantingTitle/EnchantingTitle'
import { Icon } from '@components/ui/Icon/Icon'
import { Input } from '@components/ui/Input/Input'
import { useAuthStore } from '@store/authStore'
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

import styles from './Chat.module.css'

import { useMyChatRooms } from '@/domains/chat/queries'

export default function ChatListPage() {
  const me = useAuthStore((s) => s.user)
  const { data, isLoading } = useMyChatRooms()
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    if (!data) return []
    if (!q) return data
    const term = q.toLowerCase()
    return data.filter((room) => {
      const counterpart =
        room.kind === 'pair'
          ? (room.members.find((m) => m.userId !== me?.id) ?? room.members[0])
          : null
      const titleMatch = (room.title ?? '').toLowerCase().includes(term)
      const nicknameMatch = counterpart
        ? (counterpart.nickname ?? '').toLowerCase().includes(term)
        : false
      const lastBodyMatch = (room.lastMessage?.body ?? '').toLowerCase().includes(term)
      return titleMatch || nicknameMatch || lastBodyMatch
    })
  }, [data, q, me?.id])

  if (isLoading) {
    return (
      <div className={`container ${styles.page}`}>
        <EnchantingTitle className={styles.title}>채팅</EnchantingTitle>
        <Loading />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={`container ${styles.page}`}>
        <EnchantingTitle className={styles.title}>채팅</EnchantingTitle>
        <EmptyState
          emoji="💌"
          title="아직 채팅방이 없어요"
          description="파티에 참여하면 단톡방이, 매칭이 성사되면 1:1 채팅방이 자동으로 열려요."
        />
      </div>
    )
  }

  return (
    <div className={`container ${styles.page}`}>
      <EnchantingTitle className={styles.title}>채팅</EnchantingTitle>
      <div className={styles.searchWrap}>
        <Input
          type="search"
          placeholder="채팅 검색"
          aria-label="채팅 검색"
          leftIcon={<Icon name="search" />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <p className={styles.count} role="status">
            {filtered.length}개의 채팅방
          </p>
        )}
      </div>
      {filtered.length === 0 ? (
        <EmptyState emoji="🔎" title="검색 결과가 없어요" />
      ) : (
        <ul className={styles.list}>
          {filtered.map((room) => {
            const counterpart =
              room.kind === 'pair'
                ? (room.members.find((m) => m.userId !== me?.id) ?? room.members[0])
                : null
            const name =
              room.kind === 'pair' ? (counterpart?.nickname ?? '매칭') : (room.title ?? '파티')
            const last = room.lastMessage
            const lastAt = last ? new Date(last.createdAt) : null
            const readAt = room.lastReadAt ? new Date(room.lastReadAt) : null
            const isUnread = !!(lastAt && (!readAt || lastAt > readAt))
            return (
              <li key={room.id}>
                <Link
                  to={`/chats/${room.id}`}
                  className={`${styles.row} ${isUnread ? styles.rowUnread : ''}`}
                >
                  <Avatar
                    size="lg"
                    hue={room.kind === 'pair' ? 'var(--brand-apricot-400)' : 'var(--color-primary)'}
                    pattern="gradient"
                    emoji={room.kind === 'pair' ? '💌' : '🍷'}
                    // 1:1 방은 상대의 업로드 사진을 보여준다 — 단톡방은 파티 글리프 유지.
                    imageSrc={room.kind === 'pair' ? (counterpart?.avatarImage ?? null) : null}
                    ring={isUnread ? 'glow' : 'soft'}
                  />
                  <div className={styles.rowBody}>
                    <div className={styles.rowHead}>
                      <strong className={styles.rowName}>{name}</strong>
                      {room.partyTitle && room.kind === 'pair' && (
                        <Badge tone="primary" size="sm">
                          {room.partyTitle}
                        </Badge>
                      )}
                    </div>
                    <p className={`${styles.rowLast} ${isUnread ? styles.rowLastUnread : ''}`}>
                      {last
                        ? last.body.length > 60
                          ? last.body.slice(0, 60) + '…'
                          : last.body
                        : '아직 메시지가 없어요'}
                    </p>
                  </div>
                  <div className={styles.rowMeta}>
                    {last && (
                      <time
                        className={styles.rowTime}
                        dateTime={new Date(last.createdAt).toISOString()}
                      >
                        {new Date(last.createdAt).toLocaleString('ko-KR', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    )}
                    {isUnread && <span className={styles.unreadDot} aria-label="안 읽음" />}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
