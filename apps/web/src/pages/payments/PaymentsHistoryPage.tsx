import { useConfirm } from '@components/feedback/Confirm/useConfirm'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/useToast'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import { Icon } from '@components/ui/Icon/Icon'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import styles from './Payments.module.css'

import { CATEGORY_META } from '@/domains/categories/meta'
import { api } from '@/infrastructure/api'

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

const FILTERS: { value: 'all' | Payment['status']; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'paid', label: '결제 완료' },
  { value: 'pending', label: '결제 대기' },
  { value: 'refunded', label: '환불됨' },
  { value: 'cancelled', label: '취소됨' },
]

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

function formatWhen(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PaymentsHistoryPage() {
  const [filterStatus, setFilterStatus] = useState<'all' | Payment['status']>('all')
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
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
        <p className={styles.kicker}>결제</p>
        <h1>결제 내역</h1>
        <p className={styles.muted}>
          참여한 모임의 결제와 환불 기록이에요. 최근 100건까지 표시돼요.
        </p>
      </header>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Icon name="archive" size={1.6} />
          </span>
          <h2 className={styles.emptyTitle}>아직 결제 내역이 없어요</h2>
          <p className={styles.emptyDesc}>파티에 참여하면 결제 기록이 여기에 모여요.</p>
          <Link to="/discover" className={styles.emptyAction}>
            <Button variant="primary">모임 둘러보기</Button>
          </Link>
        </div>
      ) : (
        <>
          <dl className={styles.summary} aria-label="결제 요약">
            <div className={styles.summaryStat}>
              <dt>누적 결제</dt>
              <dd>{won(paidTotal)}</dd>
            </div>
            <div className={styles.summaryDivider} aria-hidden="true" />
            <div className={styles.summaryStat}>
              <dt>환불</dt>
              <dd>{won(refundedTotal)}</dd>
            </div>
            <div className={styles.summaryDivider} aria-hidden="true" />
            <div className={styles.summaryStat}>
              <dt>전체 건수</dt>
              <dd>{items.length}건</dd>
            </div>
          </dl>

          <div className={styles.filterRow} role="group" aria-label="상태로 거르기">
            {FILTERS.map((f) => (
              <Chip
                key={f.value}
                selected={filterStatus === f.value}
                onClick={() => setFilterStatus(f.value)}
              >
                {f.label}
              </Chip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className={styles.filterEmpty}>이 상태의 결제가 없어요.</p>
          ) : (
            <ul className={styles.list}>
              {filtered.map((p) => {
                const cat = p.party
                  ? CATEGORY_META[p.party.category as keyof typeof CATEGORY_META]
                  : null
                const isRefund = p.status === 'refunded'
                const when = p.paidAt ?? p.createdAt
                return (
                  <li key={p.id} className={styles.row}>
                    <div
                      className={styles.rowCover}
                      style={{ background: cat?.bgGradient ?? 'var(--color-primary)' }}
                    >
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
                        <span className={styles.dot} aria-hidden="true" />
                        <time dateTime={new Date(when).toISOString()}>{formatWhen(when)}</time>
                      </p>
                    </div>

                    <div className={styles.rowAside}>
                      <strong
                        className={`${styles.rowAmount} ${isRefund ? styles.rowAmountRefund : ''}`}
                      >
                        {isRefund && <span aria-hidden="true">-</span>}
                        <span className="sr-only">{isRefund ? '환불 ' : ''}</span>
                        {won(p.amountKRW)}
                      </strong>
                      {p.status === 'paid' && (
                        <button
                          type="button"
                          className={styles.refundBtn}
                          onClick={async () => {
                            if (await confirm({ title: '환불 처리할까요?', confirmLabel: '환불' }))
                              refund.mutate(p.id)
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
