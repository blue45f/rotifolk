import { useToast } from '@components/feedback/Toast/useToast'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Icon } from '@components/ui/Icon/Icon'
import { api } from '@services/api'
import { useAuthStore } from '@store/authStore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import styles from './AfterPartyManager.module.css'

interface Props {
  partyId: string
  isHost: boolean
}

interface AfterPartyData {
  status: 'voting' | 'confirmed' | 'cancelled'
  votes: { userId: string; status: 'go' | 'maybe' | 'no'; nickname: string; avatarId?: string }[]
  suggestedVenues: {
    id: string
    name: string
    type: string
    area: string
    distance: string
    votes: string[]
  }[]
  confirmedVenue?: {
    name: string
    type: string
    area: string
    address: string
    time: string
    link: string
  } | null
}

export function AfterPartyManager({ partyId, isHost }: Props) {
  const me = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const toast = useToast()

  const [confirming, setConfirming] = useState(false)
  const [targetVenue, setTargetVenue] = useState('')
  const [targetAddress, setTargetAddress] = useState('')
  const [targetTime, setTargetTime] = useState('오후 9시 30분')

  const { data: apData, isLoading } = useQuery<AfterPartyData>({
    queryKey: ['after-party', partyId],
    queryFn: () => api.get<AfterPartyData>(`parties/${partyId}/after-party`),
    staleTime: 10_000,
  })

  const voteMutation = useMutation({
    mutationFn: (status: 'go' | 'maybe' | 'no') =>
      api.post(`parties/${partyId}/after-party/vote`, {
        status,
        nickname: me?.nickname ?? '참가자',
        userId: me?.id ?? 'me',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['after-party', partyId] })
      toast.show('참석 투표가 반영되었어요', 'success')
    },
  })

  const venueVoteMutation = useMutation({
    mutationFn: (venueId: string) =>
      api.post(`parties/${partyId}/after-party/venue-vote`, {
        venueId,
        userId: me?.id ?? 'me',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['after-party', partyId] })
      toast.show('장소 투표가 반영되었어요', 'success')
    },
  })

  const confirmMutation = useMutation({
    mutationFn: () =>
      api.post(`parties/${partyId}/after-party/confirm`, {
        venueName: targetVenue,
        address: targetAddress,
        time: targetTime,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['after-party', partyId] })
      toast.show('2차 모임이 최종 확정되었어요!', 'success')
      setConfirming(false)
    },
  })

  if (isLoading || !apData) {
    return <div className={styles.loading}>2차 모임 정보를 불러오는 중...</div>
  }

  const myVote = apData.votes.find((v) => v.userId === (me?.id ?? 'me'))?.status
  const goCount = apData.votes.filter((v) => v.status === 'go').length
  const maybeCount = apData.votes.filter((v) => v.status === 'maybe').length
  const noCount = apData.votes.filter((v) => v.status === 'no').length
  const totalVotes = goCount + maybeCount + noCount
  const goRate = totalVotes > 0 ? Math.round((goCount / totalVotes) * 100) : 0

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetVenue) {
      toast.show('장소명을 입력해 주세요', 'warning')
      return
    }
    confirmMutation.mutate()
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Badge tone="gold" size="sm">
            <Icon name="bolt" size={0.8} style={{ marginRight: '3px' }} /> After Party
          </Badge>
          <h2>실시간 2차 모임 뒷풀이</h2>
        </div>
        <p className={styles.subtitle}>
          1차 모임이 끝나기 전, 오늘 만난 사람들과의 흐름을 2차로 자연스럽게 이어보세요.
        </p>
      </header>

      {apData.status === 'confirmed' && apData.confirmedVenue ? (
        <div className={styles.confirmedBox}>
          <div className={styles.confirmedBadge}>
            <span className={styles.livePulse} />
            호스트 확정 2차 모임
          </div>
          <h3 className={styles.confirmedVenueName}>📍 {apData.confirmedVenue.name}</h3>
          <p className={styles.confirmedMeta}>
            <span>🕒 {apData.confirmedVenue.time}</span>
            <span className={styles.divider} />
            <span>🗺️ {apData.confirmedVenue.address}</span>
          </p>
          <div className={styles.confirmedActions}>
            <a href={apData.confirmedVenue.link} target="_blank" rel="noreferrer">
              <Button variant="gold" size="lg" leftIcon={<Icon name="pin" />}>
                지도 길찾기
              </Button>
            </a>
            <Button variant="primary" size="lg" leftIcon={<Icon name="sparkle" />}>
              2차 단톡방 입장
            </Button>
          </div>
        </div>
      ) : (
        <>
          <section className={styles.rsvpSection}>
            <h3 className={styles.sectionTitle}>🙋 참석 여부 조사</h3>
            <div className={styles.rsvpGrid}>
              <button
                type="button"
                className={`${styles.rsvpBtn} ${styles.rsvpGo} ${myVote === 'go' ? styles.active : ''}`}
                onClick={() => voteMutation.mutate('go')}
              >
                <strong>👍 참석할래요</strong>
                <span>{goCount}명</span>
              </button>
              <button
                type="button"
                className={`${styles.rsvpBtn} ${styles.rsvpMaybe} ${myVote === 'maybe' ? styles.active : ''}`}
                onClick={() => voteMutation.mutate('maybe')}
              >
                <strong>🤔 고민돼요</strong>
                <span>{maybeCount}명</span>
              </button>
              <button
                type="button"
                className={`${styles.rsvpBtn} ${styles.rsvpNo} ${myVote === 'no' ? styles.active : ''}`}
                onClick={() => voteMutation.mutate('no')}
              >
                <strong>👎 안갈래요</strong>
                <span>{noCount}명</span>
              </button>
            </div>

            {totalVotes > 0 && (
              <div className={styles.progressArea}>
                <div className={styles.progressLabel}>
                  <span>참석률 {goRate}%</span>
                  <span>총 {totalVotes}명 투표</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${goRate}%` }} />
                </div>
              </div>
            )}

            <div className={styles.votersAvatars}>
              {apData.votes
                .filter((v) => v.status === 'go' || v.status === 'maybe')
                .map((v) => (
                  <span
                    key={v.userId}
                    className={`${styles.avatarBadge} ${styles[v.status]}`}
                    title={`${v.nickname} (${v.status === 'go' ? '참석' : '고민중'})`}
                  >
                    {v.nickname.slice(0, 2)}
                  </span>
                ))}
            </div>
          </section>

          <section className={styles.venuesSection}>
            <h3 className={styles.sectionTitle}>🍷 근처 2차 추천 장소 투표</h3>
            <p className={styles.sectionDesc}>
              1차 모임 장소와 도보 5분 거리의 세련된 와인바/펍입니다.
            </p>
            <div className={styles.venuesGrid}>
              {apData.suggestedVenues.map((v) => {
                const votedByMe = v.votes.includes(me?.id ?? 'me')
                return (
                  <div
                    key={v.id}
                    className={`${styles.venueCard} ${votedByMe ? styles.venueVoted : ''}`}
                  >
                    <div className={styles.venueBody}>
                      <span className={styles.venueDist}>{v.distance}</span>
                      <h4>{v.name}</h4>
                      <small>
                        {v.type} · {v.area}
                      </small>
                    </div>
                    <button
                      type="button"
                      className={`${styles.venueVoteBtn} ${votedByMe ? styles.voted : ''}`}
                      onClick={() => venueVoteMutation.mutate(v.id)}
                    >
                      <span className={styles.voteCount}>{v.votes.length}표</span>
                      <strong>{votedByMe ? '✓ 투표됨' : '투표하기'}</strong>
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          {isHost && (
            <section className={styles.hostSection}>
              {confirming ? (
                <form onSubmit={handleConfirmSubmit} className={styles.confirmForm}>
                  <h3 className={styles.sectionTitle}>📢 2차 모임 최종 확정 개설</h3>
                  <div className={styles.formGroup}>
                    <label htmlFor="venue-name">확정 장소명</label>
                    <input
                      id="venue-name"
                      type="text"
                      value={targetVenue}
                      onChange={(e) => setTargetVenue(e.target.value)}
                      placeholder="예: 연남 어스름 (2차)"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="venue-address">주소</label>
                    <input
                      id="venue-address"
                      type="text"
                      value={targetAddress}
                      onChange={(e) => setTargetAddress(e.target.value)}
                      placeholder="예: 서울 마포구 연남동 123-45 2층"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="venue-time">시간</label>
                    <input
                      id="venue-time"
                      type="text"
                      value={targetTime}
                      onChange={(e) => setTargetTime(e.target.value)}
                      placeholder="예: 오후 9시 30분"
                    />
                  </div>
                  <div className={styles.formActions}>
                    <Button
                      type="submit"
                      variant="gold"
                      size="md"
                      isLoading={confirmMutation.isPending}
                    >
                      최종 확정 알림 발송
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => setConfirming(false)}
                    >
                      취소
                    </Button>
                  </div>
                </form>
              ) : (
                <div className={styles.hostPrompt}>
                  <p>
                    👑 호스트이신가요? 투표 현황을 보고 2차 뒷풀이 장소를 확정해 공지할 수 있습니다.
                  </p>
                  <Button variant="gold" size="lg" onClick={() => setConfirming(true)}>
                    2차 모임 최종 개설하기
                  </Button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
