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

const relativeTime = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' })

function formatArrival(iso?: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const day = Math.floor(diffMs / 86_400_000)
  // 7일을 넘기면 상대 시간 대신 절대 날짜를 보여준다.
  if (day >= 7) {
    return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }
  // 가장 큰 단위(일/시간/분)를 골라 locale-aware 문구로 변환한다. numeric:'auto'가
  // '어제', '0분 전(=지금 막)' 같은 자연스러운 한국어 표현을 만들어 준다.
  if (day >= 1) return relativeTime.format(-day, 'day')
  const hour = Math.floor(diffMs / 3_600_000)
  if (hour >= 1) return relativeTime.format(-hour, 'hour')
  const minute = Math.floor(diffMs / 60_000)
  // 1분 미만은 '현재 분' 같은 어색한 표현 대신 '방금'으로 보여준다.
  if (minute < 1) return '방금'
  return relativeTime.format(-minute, 'minute')
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
