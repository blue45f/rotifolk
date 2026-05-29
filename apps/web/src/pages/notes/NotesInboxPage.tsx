import { useMemo } from 'react'
import type { PartyNote } from '@rotifolk/shared'
import { useMyNotes, useMarkNoteRead } from '@features/notes/queries'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import Loading from '@components/feedback/Loading'
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
      {unread && (
        <span className={styles.seal} aria-hidden="true">
          새 쪽지
        </span>
      )}

      <div className={styles.cardHead}>
        <Avatar
          size="md"
          initials={initialsOf(note.fromNickname)}
          ring={unread ? 'gold' : 'soft'}
        />
        <div className={styles.who}>
          <span className={styles.name}>{note.fromNickname ?? '익명'}</span>
          <span className={styles.time}>{formatArrival(note.deliveredAt)} 도착</span>
        </div>
        {note.emoji && (
          <span className={styles.sticker} aria-hidden="true">
            {note.emoji}
          </span>
        )}
      </div>

      <blockquote className={styles.body}>{note.body}</blockquote>

      {note.shareContact && (
        <div className={styles.badges}>
          <Badge tone="gold" outlined className={styles.contactBadge}>
            <span aria-hidden="true">📇</span> 연락처 동봉
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
        <span className={styles.kicker}>ROUND KEEPSAKES</span>
        <h1 className={styles.title}>쪽지함</h1>
        <p className={styles.sub}>
          {notes.length > 0 ? (
            <>
              라운드에서 받은 마음 <strong>{notes.length}</strong>통이 도착했어요
              {unreadCount > 0 && (
                <span className={styles.subUnread}> · 아직 안 읽은 쪽지 {unreadCount}통</span>
              )}
            </>
          ) : (
            '라운드에서 만난 사람들의 한마디가 여기 모여요.'
          )}
        </p>
      </header>

      {notes.length === 0 ? (
        <section className={styles.empty}>
          <div className={styles.emptyMark} aria-hidden="true">
            <span className={styles.emptyEnvelope}>💌</span>
          </div>
          <h2 className={styles.emptyTitle}>아직 도착한 쪽지가 없어요</h2>
          <p className={styles.emptyDesc}>
            모임이 끝나면, 라운드에서 마주 앉았던 사람들이 남긴 한마디가
            <br />
            이곳으로 한 통씩 배달돼요.
          </p>
        </section>
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
