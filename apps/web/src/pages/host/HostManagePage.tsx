import { useParams, Link, useNavigate } from 'react-router-dom'
import { useParty, usePartyLifecycleActions } from '@features/parties/queries'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Tabs } from '@components/ui/Tabs/Tabs'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { useState } from 'react'
import { CATEGORY_META } from '@features/categories/meta'
import { api } from '@services/api'
import styles from './HostManage.module.css'

export default function HostManagePage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const { data, isLoading, refetch } = useParty(partyId)
  const lifecycle = usePartyLifecycleActions(partyId!)
  const toast = useToast()
  const [tab, setTab] = useState('participants')

  if (isLoading) return <Loading />
  if (!data) return <EmptyState emoji="🌙" title="파티를 찾을 수 없어요" />
  const { party, participants } = data
  const cat = CATEGORY_META[party.config.category]

  const handleCheckIn = async (userId: string) => {
    try {
      await api.post(`parties/${party.id}/check-in/${userId}`, {})
      toast.show('체크인 완료', 'success')
      refetch()
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handlePlan = async () => {
    try {
      await lifecycle.plan.mutateAsync()
      toast.show('라운드를 짰어요. 이제 시작만 누르면 돼요!', 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleStart = async () => {
    try {
      await lifecycle.start.mutateAsync()
      toast.show('파티 시작! 라이브로 이동할게요', 'success')
      navigate(`/live/${party.id}`)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <div>
          <div className={styles.crumb}>
            <Link to="/host">← 호스트 콘솔</Link>
          </div>
          <h1 className={styles.title}>
            <span style={{ marginRight: 8 }}>{cat.emoji}</span>
            {party.title}
          </h1>
          <div className={styles.heroMeta}>
            <Badge tone="primary">{cat.label}</Badge>
            <Badge tone={party.status === 'live' ? 'danger' : 'success'}>
              {party.status.toUpperCase()}
            </Badge>
            <span className={styles.metaDim}>
              {new Date(party.startAt).toLocaleString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        <div className={styles.heroActions}>
          {party.status === 'open' && (
            <>
              <Button variant="ghost" size="lg" onClick={handlePlan} isLoading={lifecycle.plan.isPending}>
                라운드 짜기
              </Button>
              <Button variant="primary" size="lg" onClick={handleStart} isLoading={lifecycle.start.isPending}>
                ▶ 파티 시작
              </Button>
            </>
          )}
          {party.status === 'live' && (
            <Link to={`/live/${party.id}`}>
              <Button variant="gold" size="lg">
                🔴 라이브로 이동
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className={`container ${styles.tabs}`}>
        <Tabs
          tabs={[
            { value: 'participants', label: `참가자 (${participants.length})`, icon: '🎟️' },
            { value: 'rounds', label: '라운드', icon: '🔄' },
            { value: 'cards', label: '질문 카드', icon: '🃏' },
            { value: 'orders', label: '주문', icon: '🍷' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className={`container ${styles.body}`}>
        {tab === 'participants' && (
          <Card padding="lg">
            <h2 className={styles.h2}>참가자 관리</h2>
            <p className={styles.muted}>도착한 사람부터 체크인해 주세요.</p>
            <div className={styles.partList}>
              {participants.map((p, i) => (
                <div key={p.id} className={styles.part}>
                  <Avatar
                    size="lg"
                    hue="#7A1F3D"
                    pattern="gradient"
                    emoji={p.user?.nickname?.[0]}
                    ring={p.status === 'checked-in' ? 'glow' : 'soft'}
                  />
                  <div className={styles.partInfo}>
                    <strong>{p.user?.nickname ?? '익명'}</strong>
                    <span>좌석 #{p.seatNumber ?? i + 1}</span>
                  </div>
                  <Button
                    variant={p.status === 'checked-in' ? 'soft' : 'primary'}
                    size="sm"
                    onClick={() => handleCheckIn(p.userId)}
                    disabled={p.status === 'checked-in'}
                  >
                    {p.status === 'checked-in' ? '✓ 체크인됨' : '체크인'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === 'rounds' && (
          <Card padding="lg">
            <h2 className={styles.h2}>라운드 시뮬레이션</h2>
            <p className={styles.muted}>
              {party.config.totalRounds}라운드 ×{' '}
              {Math.round(party.config.roundDurationSec / 60)}분 ({party.config.rotationMode})
            </p>
            <p className={styles.muted}>
              참가자 확정 후 “라운드 짜기”를 누르면 자동으로 모든 라운드의 좌석이 배치돼요.
              파티 시작 후 라이브에서 “다음 라운드 시작” 버튼을 사용하세요.
            </p>
            <div className={styles.actionsRow}>
              <Button onClick={handlePlan} isLoading={lifecycle.plan.isPending}>
                라운드 다시 짜기
              </Button>
            </div>
          </Card>
        )}

        {tab === 'cards' && (
          <Card padding="lg">
            <h2 className={styles.h2}>질문 카드</h2>
            <p className={styles.muted}>글로벌 카드 풀에서 자동으로 추첨되거나, 파티 전용 카드를 추가할 수 있어요.</p>
          </Card>
        )}

        {tab === 'orders' && (
          <Card padding="lg">
            <h2 className={styles.h2}>실시간 주문 현황</h2>
            <p className={styles.muted}>
              파티 시작 후 라이브 콘솔에서 들어오는 주문을 처리할 수 있어요.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
