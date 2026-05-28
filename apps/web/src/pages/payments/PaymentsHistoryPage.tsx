import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@services/api'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Chip } from '@components/ui/Chip/Chip'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { CATEGORY_META } from '@features/categories/meta'
import styles from './Payments.module.css'

interface Payment {
  id: string
  partyId: string
  amountKRW: number
  status: 'pending' | 'paid' | 'refunded' | 'cancelled'
  method: 'card' | 'kakao' | 'toss' | 'mock'
  paidAt: string | null
  refundedAt: string | null
  createdAt: string
  party: {
    id: string
    title: string
    category: string
    startAt: string
    coverImageUrl: string | null
  } | null
}

const METHOD_LABEL: Record<Payment['method'], string> = {
  card: '카드',
  kakao: '카카오페이',
  toss: '토스페이',
  mock: '시뮬레이션',
}

const STATUS_TONE: Record<Payment['status'], 'success' | 'warning' | 'danger' | 'primary'> = {
  paid: 'success',
  pending: 'warning',
  refunded: 'danger',
  cancelled: 'primary',
}

const STATUS_LABEL: Record<Payment['status'], string> = {
  paid: '결제 완료',
  pending: '결제 대기',
  refunded: '환불됨',
  cancelled: '취소됨',
}

export default function PaymentsHistoryPage() {
  const [filterStatus, setFilterStatus] = useState<'all' | Payment['status']>('all')
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading } = useQuery({
    queryKey: ['payments', 'me'],
    queryFn: () => api.get<Payment[]>('payments/me'),
  })

  const refund = useMutation({
    mutationFn: (id: string) => api.post(`payments/${id}/refund`, {}),
    onSuccess: () => {
      toast.show('환불 처리됐어요', 'success')
      qc.invalidateQueries({ queryKey: ['payments'] })
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  if (isLoading) return <Loading />
  const items = data ?? []
  const filtered = filterStatus === 'all' ? items : items.filter((p) => p.status === filterStatus)
  const paidTotal = items
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amountKRW, 0)
  const refundedTotal = items
    .filter((p) => p.status === 'refunded')
    .reduce((sum, p) => sum + p.amountKRW, 0)

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>결제 내역</h1>
        <p className={styles.muted}>최근 100건까지 표시돼요.</p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          emoji="🧾"
          title="아직 결제 내역이 없어요"
          description="파티에 참여하면 결제 기록이 여기에 모여요."
          action={
            <Link to="/discover">
              <Button variant="primary">모임 둘러보기</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Card padding="lg" className={styles.summary}>
            <div className={styles.summaryStat}>
              <span>누적 결제</span>
              <strong>{paidTotal.toLocaleString()}원</strong>
            </div>
            <div className={styles.summaryStat}>
              <span>환불</span>
              <strong>{refundedTotal.toLocaleString()}원</strong>
            </div>
            <div className={styles.summaryStat}>
              <span>건수</span>
              <strong>{items.length}건</strong>
            </div>
          </Card>

          <div className={styles.filterRow}>
            <Chip selected={filterStatus === 'all'} onClick={() => setFilterStatus('all')}>전체</Chip>
            <Chip selected={filterStatus === 'paid'} onClick={() => setFilterStatus('paid')}>결제 완료</Chip>
            <Chip selected={filterStatus === 'pending'} onClick={() => setFilterStatus('pending')}>결제 대기</Chip>
            <Chip selected={filterStatus === 'refunded'} onClick={() => setFilterStatus('refunded')}>환불됨</Chip>
            <Chip selected={filterStatus === 'cancelled'} onClick={() => setFilterStatus('cancelled')}>취소됨</Chip>
          </div>

          {filtered.length === 0 && items.length > 0 ? (
            <p className={styles.filterEmpty}>이 상태의 결제가 없어요.</p>
          ) : (
            <ul className={styles.list}>
              {filtered.map((p) => {
                const cat = p.party ? CATEGORY_META[p.party.category as keyof typeof CATEGORY_META] : null
                const when = p.paidAt ?? p.createdAt
                return (
                  <li key={p.id} className={styles.row}>
                    <div className={styles.rowCover} style={{ background: cat?.bgGradient ?? '#7A1F3D' }}>
                      {p.party?.coverImageUrl ? (
                        <img src={p.party.coverImageUrl} alt="" loading="lazy" />
                      ) : (
                        <span aria-hidden="true">{cat?.emoji ?? '🍷'}</span>
                      )}
                    </div>
                    <div className={styles.rowBody}>
                      <div className={styles.rowTitleRow}>
                        {p.party ? (
                          <Link to={`/parties/${p.party.id}`} className={styles.rowTitle}>
                            {p.party.title}
                          </Link>
                        ) : (
                          <span className={styles.rowTitleOrphan}>삭제된 파티</span>
                        )}
                        <Badge tone={STATUS_TONE[p.status]} size="sm">
                          {STATUS_LABEL[p.status]}
                        </Badge>
                      </div>
                      <p className={styles.rowMeta}>
                        <span>{METHOD_LABEL[p.method]}</span>
                        <span aria-hidden="true">·</span>
                        <time>
                          {new Date(when).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </p>
                    </div>
                    <div className={styles.rowAside}>
                      <strong className={styles.rowAmount}>
                        {p.status === 'refunded' && '-'}
                        {p.amountKRW.toLocaleString()}원
                      </strong>
                      {p.status === 'paid' && (
                        <button
                          type="button"
                          className={styles.refundBtn}
                          onClick={() => {
                            if (confirm('환불 처리할까요?')) refund.mutate(p.id)
                          }}
                          disabled={refund.isPending}
                        >
                          환불 요청
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
