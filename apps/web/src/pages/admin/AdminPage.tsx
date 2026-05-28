import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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

type TabKey = 'open' | 'reviewing' | 'resolved'

const STATUS_TONE: Record<AdminReport['status'], 'danger' | 'warning' | 'success' | 'neutral'> = {
  open: 'danger',
  reviewing: 'warning',
  resolved: 'success',
  dismissed: 'neutral',
}

const STATUS_LABEL: Record<AdminReport['status'], string> = {
  open: '미처리',
  reviewing: '검토 중',
  resolved: '처리 완료',
  dismissed: '기각',
}

export default function AdminPage() {
  const [tab, setTab] = useState<TabKey>('open')
  const queryClient = useQueryClient()

  const { data: openData } = useQuery({
    queryKey: ['admin', 'reports', 'open'],
    queryFn: () => api.get<AdminReport[]>('admin/reports?status=open'),
  })
  const { data: reviewingData } = useQuery({
    queryKey: ['admin', 'reports', 'reviewing'],
    queryFn: () => api.get<AdminReport[]>('admin/reports?status=reviewing'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', tab],
    queryFn: () => api.get<AdminReport[]>(`admin/reports?status=${tab}`),
  })

  const patch = useMutation({
    mutationFn: (input: { id: string; status: AdminReport['status'] }) =>
      api.patch(`admin/reports/${input.id}`, { status: input.status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  })

  const openCount = openData?.length ?? 0
  const reviewingCount = reviewingData?.length ?? 0

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>🛡️ 어드민 콘솔</h1>
        <p>신고 큐 · 사용자 검토 · 정지</p>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: 'var(--color-danger)' }}>{openCount}</span>
          <span className={styles.statLabel}>미처리</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: 'var(--brand-gold-600, #B8891E)' }}>{reviewingCount}</span>
          <span className={styles.statLabel}>검토 중</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{openCount + reviewingCount}</span>
          <span className={styles.statLabel}>처리 대기</span>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: 'open', label: `미처리${openCount > 0 ? ` (${openCount})` : ''}` },
          { value: 'reviewing', label: `검토 중${reviewingCount > 0 ? ` (${reviewingCount})` : ''}` },
          { value: 'resolved', label: '처리 완료' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as TabKey)}
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
                <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                <Badge tone="neutral">{KIND_LABEL[r.kind] ?? r.kind}</Badge>
                <time>{new Date(r.createdAt).toLocaleString('ko-KR')}</time>
              </div>
              <p className={styles.body}>{r.body}</p>
              <dl className={styles.meta}>
                <div>
                  <dt>신고자</dt>
                  <dd>
                    <Link to={`/hosts/${r.reporter.id}`} className={styles.userLink}>
                      {r.reporter.nickname}
                    </Link>
                  </dd>
                </div>
                {r.target && (
                  <div>
                    <dt>대상</dt>
                    <dd>
                      <Link to={`/hosts/${r.target.id}`} className={styles.userLink}>
                        {r.target.nickname}
                      </Link>
                    </dd>
                  </div>
                )}
                {r.party && (
                  <div>
                    <dt>파티</dt>
                    <dd>
                      <Link to={`/parties/${r.party.id}`} className={styles.userLink}>
                        {r.party.title}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
              {r.status === 'open' && (
                <div className={styles.actions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => patch.mutate({ id: r.id, status: 'reviewing' })}
                  >
                    검토 시작
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => patch.mutate({ id: r.id, status: 'dismissed' })}
                  >
                    기각
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => patch.mutate({ id: r.id, status: 'resolved' })}
                  >
                    조치 완료
                  </Button>
                </div>
              )}
              {r.status === 'reviewing' && (
                <div className={styles.actions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => patch.mutate({ id: r.id, status: 'dismissed' })}
                  >
                    기각
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => patch.mutate({ id: r.id, status: 'resolved' })}
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
