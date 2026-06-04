import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@services/api'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import { Input } from '@components/ui/Input/Input'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { useConfirm } from '@components/feedback/Confirm/ConfirmProvider'
import styles from './BlockedUsers.module.css'

interface BlockedUser {
  id: string
  nickname: string
  avatarId: string | null
  blockedAt?: string
  reason?: string | null
}

export default function BlockedUsersPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['blocks', 'me'],
    queryFn: () => api.get<BlockedUser[]>('blocks'),
  })

  const unblock = useMutation({
    mutationFn: (userId: string) => api.delete(`blocks/${userId}`),
    onSuccess: () => {
      toast.show('차단을 해제했어요', 'success')
      qc.invalidateQueries({ queryKey: ['blocks'] })
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  if (isLoading) return <Loading />
  const items = data ?? []
  const filtered = q.trim()
    ? items.filter((u) => u.nickname.toLowerCase().includes(q.toLowerCase()))
    : items

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>
          차단한 사용자 {items.length > 0 && <span className={styles.count}>({items.length})</span>}
        </h1>
        <p className={styles.muted}>
          차단한 사용자와는 같은 모임에서 만나지 않도록 자동으로 회피해요.
        </p>
      </header>

      {items.length > 0 && (
        <div className={styles.search}>
          <Input
            type="search"
            placeholder="닉네임으로 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            leftIcon={<span aria-hidden="true">🔎</span>}
          />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          emoji="🌙"
          title="차단한 사용자가 없어요"
          description="호스트 프로필의 더보기(⋯) 메뉴에서 차단할 수 있어요."
        />
      ) : filtered.length === 0 ? (
        <p className={styles.muted}>"{q}"와 일치하는 차단 사용자가 없어요.</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((u) => (
            <li key={u.id} className={styles.row}>
              <Link to={`/hosts/${u.id}`} className={styles.identity}>
                <Avatar
                  size="md"
                  hue="#7A1F3D"
                  pattern="gradient"
                  emoji={u.nickname[0]}
                  ring="soft"
                />
                <div className={styles.body}>
                  <strong>{u.nickname}</strong>
                  {u.reason && <small>사유: {u.reason}</small>}
                  {u.blockedAt && (
                    <time>
                      {new Date(u.blockedAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                      })}
                    </time>
                  )}
                </div>
              </Link>
              <Button
                variant="soft"
                size="sm"
                onClick={async () => {
                  if (await confirm({ title: '차단을 해제할까요?', confirmLabel: '해제' }))
                    unblock.mutate(u.id)
                }}
                disabled={unblock.isPending}
              >
                해제
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
