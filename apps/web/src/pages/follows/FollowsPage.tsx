import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import { Icon } from '@components/ui/Icon/Icon'
import { Tabs } from '@components/ui/Tabs/Tabs'
import { api } from '@services/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import styles from './Follows.module.css'

interface FollowedUser {
  id: string
  nickname: string
  avatarId: string | null
  avatarImage?: string | null
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
    { value: 'following', label: '팔로잉', badge: following?.length ?? 0 },
    { value: 'followers', label: '팔로워', badge: followers?.length ?? 0 },
  ]

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.kicker}>나의 사람들</p>
        <h1>팔로우</h1>
        <p className={styles.muted}>마음에 든 호스트를 따라가고, 나를 따르는 사람을 확인하세요.</p>
      </header>

      <Tabs
        tabs={tabItems}
        value={tab}
        onChange={(v) => setTab(v as 'following' | 'followers')}
        label="팔로잉과 팔로워 전환"
      />

      <div className={styles.tabContent}>
        {currentList.length === 0 ? (
          tab === 'following' ? (
            <EmptyState
              emoji="🌙"
              title="아직 팔로우한 호스트가 없어요"
              description="마음에 드는 호스트 페이지에서 팔로우해 보세요."
              action={
                <Link to="/discover" className={styles.emptyAction}>
                  <Button variant="primary" leftIcon={<Icon name="compass" />}>
                    파티 탐색
                  </Button>
                </Link>
              }
            />
          ) : (
            <EmptyState
              emoji="🌙"
              title="아직 팔로워가 없어요"
              description="모임을 열고 사람들을 만나면 나를 따르는 이들이 생겨요."
            />
          )
        ) : (
          <ul className={styles.list}>
            {currentList.map((u) => (
              <li key={u.id} className={styles.row}>
                <Link
                  to={`/hosts/${u.id}`}
                  className={styles.rowInner}
                  aria-label={`${u.nickname} 프로필 보기`}
                >
                  <Avatar
                    size="md"
                    hue="var(--color-primary)"
                    pattern="gradient"
                    emoji={u.nickname[0]}
                    imageSrc={u.avatarImage ?? null}
                  />
                  <div className={styles.body}>
                    <strong className={styles.name}>{u.nickname}</strong>
                    {u.role === 'host' && (
                      <span className={styles.tag}>
                        <Icon name="shield" size={0.85} />
                        호스트
                      </span>
                    )}
                  </div>
                  <Icon name="chevron-right" className={styles.chevron} aria-hidden />
                </Link>
                {tab === 'following' && (
                  <div className={styles.rowActions}>
                    <Button
                      variant="soft"
                      size="sm"
                      aria-pressed={true}
                      aria-label={`${u.nickname} 언팔로우`}
                      leftIcon={<Icon name="check" size={0.9} />}
                      onClick={() => unfollowMutation.mutate(u.id)}
                      disabled={unfollowMutation.isPending}
                    >
                      팔로잉
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
