import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Tabs } from '@components/ui/Tabs/Tabs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import styles from './Notifications.module.css'

import type { NotificationItem } from '@/domains/notifications/realtime-cache'

import { notificationKeys } from '@/domains/notifications/useNotificationsRealtime'
import { api } from '@/infrastructure/api'

const KIND_EMOJI: Record<string, string> = {
  party_join: '🎟️',
  party_starting: '⏰',
  match_made: '💌',
  host_review: '⭐',
  message: '💬',
  new_follower: '👤',
}

type FilterKey = 'all' | 'party' | 'match' | 'message' | 'review' | 'follow'

const FILTER_KIND: Record<FilterKey, (kind: string) => boolean> = {
  all: () => true,
  party: (k) => k === 'party_join' || k === 'party_starting',
  match: (k) => k === 'match_made',
  message: (k) => k === 'message',
  review: (k) => k === 'host_review',
  follow: (k) => k === 'new_follower',
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterKey>('all')

  const { data, isLoading } = useQuery({
    queryKey: notificationKeys.list,
    queryFn: () => api.get<NotificationItem[]>('notifications'),
    staleTime: 60_000,
  })
  const markAllRead = useMutation({
    mutationFn: () => api.post('notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread })
    },
  })
  const markOne = useMutation({
    mutationFn: (id: string) => api.post(`notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread })
    },
  })

  const all = data ?? []
  const unread = all.filter((n) => !n.isRead).length

  const counts: Record<FilterKey, number> = {
    all: all.length,
    party: all.filter((n) => FILTER_KIND.party(n.kind)).length,
    match: all.filter((n) => FILTER_KIND.match(n.kind)).length,
    message: all.filter((n) => FILTER_KIND.message(n.kind)).length,
    review: all.filter((n) => FILTER_KIND.review(n.kind)).length,
    follow: all.filter((n) => FILTER_KIND.follow(n.kind)).length,
  }
  const filtered = all.filter((n) => FILTER_KIND[filter](n.kind))

  const grouped = useMemo(() => {
    const now = new Date()
    const todayStr = now.toDateString()
    const yesterdayStr = new Date(now.getTime() - 86_400_000).toDateString()
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000)
    const groups: { label: string; items: typeof filtered }[] = [
      { label: '오늘', items: [] },
      { label: '어제', items: [] },
      { label: '이번 주', items: [] },
      { label: '그 이전', items: [] },
    ]
    for (const n of filtered) {
      const d = new Date(n.createdAt)
      if (d.toDateString() === todayStr) groups[0].items.push(n)
      else if (d.toDateString() === yesterdayStr) groups[1].items.push(n)
      else if (d >= weekAgo) groups[2].items.push(n)
      else groups[3].items.push(n)
    }
    return groups.filter((g) => g.items.length > 0)
  }, [filtered])

  if (isLoading) return <Loading />

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

      {all.length > 0 && (
        <div className={styles.tabs}>
          <Tabs
            value={filter}
            onChange={(v) => setFilter(v as FilterKey)}
            tabs={[
              { value: 'all', label: `전체 (${counts.all})` },
              { value: 'party', label: `모임 (${counts.party})`, icon: '🎟️' },
              { value: 'match', label: `매칭 (${counts.match})`, icon: '💌' },
              { value: 'follow', label: `팔로우 (${counts.follow})`, icon: '👤' },
              { value: 'message', label: `메시지 (${counts.message})`, icon: '💬' },
              { value: 'review', label: `후기 (${counts.review})`, icon: '⭐' },
            ]}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          emoji="🔕"
          title={all.length === 0 ? '아직 알림이 없어요' : '이 필터에 해당하는 알림이 없어요'}
          description={
            all.length === 0
              ? '모임이 곧 시작되거나 매칭이 성사되면 여기로 알려드릴게요.'
              : '다른 탭에서 확인해 보세요.'
          }
        />
      ) : (
        <div className={styles.groups}>
          {grouped.map((group) => (
            <section key={group.label} className={styles.group}>
              <h3 className={styles.groupLabel}>{group.label}</h3>
              <ul className={styles.list}>
                {group.items.map((n) => {
                  const handleClick = () => !n.isRead && markOne.mutate(n.id)
                  const handleDismiss = (e: React.MouseEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!n.isRead) markOne.mutate(n.id)
                  }
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
                    </>
                  )
                  return (
                    <li key={n.id} className={n.isRead ? '' : styles.unread}>
                      <div className={styles.row}>
                        {n.link ? (
                          <Link to={n.link} className={styles.rowMain} onClick={handleClick}>
                            {inner}
                          </Link>
                        ) : (
                          <button type="button" className={styles.rowMain} onClick={handleClick}>
                            {inner}
                          </button>
                        )}
                        {!n.isRead && (
                          <button
                            type="button"
                            className={styles.dismissBtn}
                            onClick={handleDismiss}
                            aria-label="읽음으로 표시"
                            title="읽음으로 표시"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Card padding="md" variant="soft" className={styles.permission}>
        <p>브라우저 알림을 켜면 모임 시작 30분 전과 매칭 성사 알림을 받을 수 있어요.</p>
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
