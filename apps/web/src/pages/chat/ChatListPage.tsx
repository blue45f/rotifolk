import { Link } from 'react-router-dom'
import { useMyChatRooms } from '@features/chat/queries'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useAuthStore } from '@store/authStore'
import styles from './Chat.module.css'

export default function ChatListPage() {
  const me = useAuthStore((s) => s.user)
  const { data, isLoading } = useMyChatRooms()

  if (isLoading) return <Loading />
  if (!data || data.length === 0) {
    return (
      <div className={`container ${styles.page}`}>
        <h1 className={styles.title}>채팅</h1>
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
      <h1 className={styles.title}>채팅</h1>
      <ul className={styles.list}>
        {data.map((room) => {
          const counterpart =
            room.kind === 'pair'
              ? room.members.find((m) => m.userId !== me?.id) ?? room.members[0]
              : null
          const displayTitle =
            room.kind === 'pair'
              ? `💌 ${counterpart?.nickname ?? '매칭'}`
              : `🍷 ${room.title ?? '파티'}`
          const last = room.lastMessage
          const lastAt = last ? new Date(last.createdAt) : null
          const readAt = room.lastReadAt ? new Date(room.lastReadAt) : null
          const isUnread = !!(lastAt && (!readAt || lastAt > readAt))
          return (
            <li key={room.id}>
              <Link to={`/chats/${room.id}`} className={`${styles.row} ${isUnread ? styles.rowUnread : ''}`}>
                <Avatar
                  size="lg"
                  hue={room.kind === 'pair' ? '#C9627F' : '#7A1F3D'}
                  pattern="gradient"
                  emoji={room.kind === 'pair' ? '💌' : '🍷'}
                  ring={isUnread ? 'glow' : 'soft'}
                />
                <div className={styles.rowBody}>
                  <div className={styles.rowHead}>
                    <strong>{displayTitle}</strong>
                    {room.partyTitle && room.kind === 'pair' && (
                      <Badge tone="primary" size="sm">
                        {room.partyTitle}
                      </Badge>
                    )}
                    {isUnread && <span className={styles.unreadDot} aria-label="안 읽음" />}
                  </div>
                  <p className={`${styles.rowLast} ${isUnread ? styles.rowLastUnread : ''}`}>
                    {last
                      ? last.body.length > 60
                        ? last.body.slice(0, 60) + '…'
                        : last.body
                      : '아직 메시지가 없어요'}
                  </p>
                </div>
                {last && (
                  <time className={styles.rowTime}>
                    {new Date(last.createdAt).toLocaleString('ko-KR', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
