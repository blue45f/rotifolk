import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@services/api'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import { Tabs } from '@components/ui/Tabs/Tabs'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import styles from './Follows.module.css'

interface FollowedUser {
  id: string
  nickname: string
  avatarId: string | null
  role?: string
}

export default function FollowsPage() {
  const [tab, setTab] = useState<'following' | 'followers'>('following')
  const queryClient = useQueryClient()

  const { data: following, isLoading: loadingFollowing } = useQuery({
    queryKey: ['follows', 'me'],
    queryFn: () => api.get<FollowedUser[]>('follows/me'),
  })

  const { data: followers, isLoading: loadingFollowers } = useQuery({
    queryKey: ['follows', 'me', 'followers'],
    queryFn: () => api.get<FollowedUser[]>('follows/me/followers'),
  })

  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`follows/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows', 'me'] })
    },
  })

  const isLoading = loadingFollowing || loadingFollowers
  if (isLoading) return <Loading />

  const currentList = tab === 'following' ? (following ?? []) : (followers ?? [])

  const tabItems = [
    { value: 'following', label: `팔로잉 (${following?.length ?? 0})` },
    { value: 'followers', label: `팔로워 (${followers?.length ?? 0})` },
  ]

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>팔로우</h1>
      </header>

      <Tabs
        tabs={tabItems}
        value={tab}
        onChange={(v) => setTab(v as 'following' | 'followers')}
      />

      <div className={styles.tabContent}>
        {currentList.length === 0 ? (
          tab === 'following' ? (
            <EmptyState
              emoji="🌙"
              title="아직 팔로우한 호스트가 없어요"
              description="마음에 드는 호스트 페이지에서 팔로우해 보세요."
              action={
                <Link to="/discover">
                  <Button variant="primary">파티 탐색</Button>
                </Link>
              }
            />
          ) : (
            <EmptyState
              emoji="🌙"
              title="아직 팔로워가 없어요"
            />
          )
        ) : (
          <ul className={styles.list}>
            {currentList.map((u) => (
              <li key={u.id} className={styles.row}>
                <Link to={`/hosts/${u.id}`} className={styles.rowInner}>
                  <Avatar
                    size="md"
                    hue="#7A1F3D"
                    pattern="gradient"
                    emoji={u.nickname[0]}
                  />
                  <div className={styles.body}>
                    <strong>{u.nickname}</strong>
                    {u.role === 'host' && <span>🎙️ 호스트</span>}
                  </div>
                </Link>
                <div className={styles.rowActions}>
                  {tab === 'following' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unfollowMutation.mutate(u.id)}
                      disabled={unfollowMutation.isPending}
                    >
                      언팔
                    </Button>
                  )}
                  <Link to={`/hosts/${u.id}`} className={styles.cta}>
                    프로필 →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
