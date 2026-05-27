import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Tabs } from '@components/ui/Tabs/Tabs'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useState } from 'react'
import { api } from '@services/api'
import styles from './Admin.module.css'

interface AdminReport {
  id: string
  kind: string
  body: string
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  reporter: { id: string; nickname: string }
  target: { id: string; nickname: string } | null
  party: { id: string; title: string } | null
  createdAt: string
}

export default function AdminPage() {
  const [tab, setTab] = useState<'open' | 'resolved'>('open')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', tab],
    queryFn: () => api.get<AdminReport[]>(`admin/reports?status=${tab}`),
  })

  const resolve = useMutation({
    mutationFn: (input: { id: string; status: 'resolved' | 'dismissed' }) =>
      api.patch(`admin/reports/${input.id}`, { status: input.status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  })

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>🛡️ 어드민 콘솔</h1>
        <p>신고 큐 · 사용자 검토 · 정지</p>
      </header>
      <Tabs
        tabs={[
          { value: 'open', label: '진행 중' },
          { value: 'resolved', label: '처리 완료' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as 'open' | 'resolved')}
      />
      <div className={styles.list}>
        {isLoading ? (
          <Loading />
        ) : !data || data.length === 0 ? (
          <EmptyState emoji="🕊️" title="처리할 신고가 없어요" />
        ) : (
          data.map((r) => (
            <Card key={r.id} padding="lg">
              <div className={styles.head2}>
                <Badge tone={r.status === 'open' ? 'danger' : 'success'}>{r.status}</Badge>
                <Badge tone="neutral">{KIND_LABEL[r.kind] ?? r.kind}</Badge>
                <time>{new Date(r.createdAt).toLocaleString('ko-KR')}</time>
              </div>
              <p className={styles.body}>{r.body}</p>
              <dl className={styles.meta}>
                <div>
                  <dt>신고자</dt>
                  <dd>{r.reporter.nickname}</dd>
                </div>
                {r.target && (
                  <div>
                    <dt>대상</dt>
                    <dd>{r.target.nickname}</dd>
                  </div>
                )}
                {r.party && (
                  <div>
                    <dt>파티</dt>
                    <dd>{r.party.title}</dd>
                  </div>
                )}
              </dl>
              {r.status === 'open' && (
                <div className={styles.actions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resolve.mutate({ id: r.id, status: 'dismissed' })}
                  >
                    기각
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => resolve.mutate({ id: r.id, status: 'resolved' })}
                  >
                    조치 완료
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

const KIND_LABEL: Record<string, string> = {
  harassment: '괴롭힘',
  spam: '스팸',
  inappropriate: '부적절',
  other: '기타',
}
