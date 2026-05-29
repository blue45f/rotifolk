import { useMemo } from 'react'
import type { PartyNote } from '@rotifolk/shared'
import { useMyNotes, useMarkNoteRead } from '@features/notes/queries'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import styles from './Notes.module.css'

function initialsOf(nickname?: string): string {
  if (!nickname) return '?'
  return nickname.trim().slice(0, 2).toUpperCase()
}

function formatArrival(iso?: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const min = Math.floor(diff / 60_000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

function NoteCard({ note, onRead }: { note: PartyNote; onRead: (id: string) => void }) {
  const unread = !note.readAt
  return (
    <article
      className={`${styles.card} ${unread ? styles.cardUnread : ''}`}
      onClick={() => unread && onRead(note.id)}
    >
      <div className={styles.cardHead}>
        <Avatar
          size="md"
          initials={initialsOf(note.fromNickname)}
          ring={unread ? 'gold' : 'soft'}
        />
        <div className={styles.who}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{note.fromNickname ?? '익명'}</span>
            {unread && <span className={styles.dot} aria-label="안 읽음" />}
          </div>
          <span className={styles.time}>{formatArrival(note.deliveredAt)}</span>
        </div>
        {note.emoji && (
          <span className={styles.sticker} aria-hidden="true">
            {note.emoji}
          </span>
        )}
      </div>

      <p className={styles.body}>{note.body}</p>

      {note.shareContact && (
        <div className={styles.badges}>
          <Badge tone="gold" outlined>
            📇 연락처 동봉
          </Badge>
        </div>
      )}
    </article>
  )
}

export default function NotesInboxPage() {
  const { data, isLoading } = useMyNotes()
  const markRead = useMarkNoteRead()

  const notes = useMemo(() => data ?? [], [data])
  const unreadCount = notes.filter((n) => !n.readAt).length

  if (isLoading) return <Loading label="쪽지를 불러오는 중" />

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>💌 쪽지함</h1>
        <p className={styles.sub}>
          {notes.length > 0 ? (
            <>
              라운드에서 받은 마음 <strong>{notes.length}</strong>통
              {unreadCount > 0 && (
                <span className={styles.subUnread}> · 새 쪽지 {unreadCount}</span>
              )}
            </>
          ) : (
            '라운드에서 만난 사람들의 한마디가 여기 모여요.'
          )}
        </p>
      </header>

      {notes.length === 0 ? (
        <EmptyState
          emoji="💌"
          title="아직 도착한 쪽지가 없어요"
          description="모임이 끝나면 라운드에서 만난 사람들의 쪽지가 이곳으로 배달돼요."
        />
      ) : (
        <div className={styles.list}>
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onRead={(id) => markRead.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  )
}
