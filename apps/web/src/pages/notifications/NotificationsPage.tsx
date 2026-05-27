import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@services/api'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import styles from './Notifications.module.css'

interface NotificationItem {
  id: string
  kind: string
  title: string
  body: string | null
  link: string | null
  isRead: boolean
  createdAt: string
}

const KIND_EMOJI: Record<string, string> = {
  party_join: '🎟️',
  party_starting: '⏰',
  match_made: '💌',
  host_review: '⭐',
  message: '💬',
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<NotificationItem[]>('notifications'),
    refetchInterval: 30_000,
  })
  const markAllRead = useMutation({
    mutationFn: () => api.post('notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const markOne = useMutation({
    mutationFn: (id: string) => api.post(`notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  if (isLoading) return <Loading />
  const unread = data?.filter((n) => !n.isRead).length ?? 0

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <div>
          <h1>알림</h1>
          {unread > 0 && <p className={styles.muted}>읽지 않은 {unread}개</p>}
        </div>
        {unread > 0 && (
          <Button variant="ghost" onClick={() => markAllRead.mutate()}>
            모두 읽음
          </Button>
        )}
      </header>

      {!data || data.length === 0 ? (
        <EmptyState
          emoji="🔕"
          title="아직 알림이 없어요"
          description="모임이 곧 시작되거나 매칭이 성사되면 여기로 알려드릴게요."
        />
      ) : (
        <ul className={styles.list}>
          {data.map((n) => {
            const handleClick = () => !n.isRead && markOne.mutate(n.id)
            const inner = (
              <>
                <span className={styles.kindIcon} aria-hidden="true">
                  {KIND_EMOJI[n.kind] ?? '🔔'}
                </span>
                <div className={styles.body}>
                  <strong>{n.title}</strong>
                  {n.body && <p>{n.body}</p>}
                  <time>
                    {new Date(n.createdAt).toLocaleString('ko-KR', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
                {!n.isRead && <span className={styles.dot} aria-label="새 알림" />}
              </>
            )
            return (
              <li key={n.id} className={n.isRead ? '' : styles.unread}>
                {n.link ? (
                  <Link to={n.link} className={styles.row} onClick={handleClick}>
                    {inner}
                  </Link>
                ) : (
                  <div className={styles.row} onClick={handleClick}>
                    {inner}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Card padding="md" variant="soft" className={styles.permission}>
        <p>
          브라우저 알림을 켜면 모임 시작 30분 전과 매칭 성사 알림을 받을 수 있어요.
        </p>
        <Button
          variant="soft"
          onClick={async () => {
            if ('Notification' in window) {
              await Notification.requestPermission()
            }
          }}
        >
          알림 권한 켜기
        </Button>
      </Card>
    </div>
  )
}
