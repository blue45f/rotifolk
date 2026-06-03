import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@services/api'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import { Input } from '@components/ui/Input/Input'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import styles from './MatchCards.module.css'

interface MatchCardItem {
  id: string
  partnerUserId: string
  partnerNickname: string
  partnerAvatarId: string | null
  partyId: string
  partyTitle: string
  matchedAt: string
}

type SortOption = '최근순' | '이름순'

export default function MatchCardsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-match-cards'],
    queryFn: () => api.get<MatchCardItem[]>('parties/me/match-cards'),
  })

  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortOption>('최근순')
  const [groupByParty, setGroupByParty] = useState(false)

  const filtered = useMemo(
    () => (data ?? []).filter((c) => c.partnerNickname.includes(q) || c.partyTitle.includes(q)),
    [data, q],
  )

  const sorted = useMemo(() => {
    const copy = [...filtered]
    if (sort === '최근순') {
      copy.sort((a, b) => new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime())
    } else {
      copy.sort((a, b) => a.partnerNickname.localeCompare(b.partnerNickname, 'ko'))
    }
    return copy
  }, [filtered, sort])

  const groupedByParty = useMemo(() => {
    const map = new Map<string, MatchCardItem[]>()
    for (const c of sorted) {
      const group = map.get(c.partyTitle) ?? []
      group.push(c)
      map.set(c.partyTitle, group)
    }
    return Array.from(map.entries())
  }, [sorted])

  if (isLoading) return <Loading />

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <Badge tone="gold" size="md">
          내 명함
        </Badge>
        <h1 className={styles.title}>오늘까지 만난 인연</h1>
        <p className={styles.muted}>
          총 {filtered.length}장 / {data?.length ?? 0}장
        </p>
      </header>

      <div className={styles.controls}>
        <Input
          leftIcon={<span>🔍</span>}
          placeholder="닉네임 또는 파티명으로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className={styles.chipRow}>
          <Chip selected={sort === '최근순'} onClick={() => setSort('최근순')}>
            최근순
          </Chip>
          <Chip selected={sort === '이름순'} onClick={() => setSort('이름순')}>
            이름순
          </Chip>
        </div>
        <div className={styles.chipRow}>
          <Chip
            leadingEmoji="🗂️"
            selected={groupByParty}
            onClick={() => setGroupByParty((v) => !v)}
          >
            파티별 보기
          </Chip>
        </div>
      </div>

      {!data || data.length === 0 ? (
        <EmptyState
          emoji="💌"
          title="아직 명함이 없어요"
          description="다음 모임에서 만나봐요."
          action={
            <Link to="/discover">
              <Button variant="primary">모임 탐색</Button>
            </Link>
          }
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="검색 결과가 없어요"
          description="다른 검색어를 입력해 보세요."
        />
      ) : groupByParty ? (
        <div>
          {groupedByParty.map(([partyTitle, cards]) => (
            <div key={partyTitle} className={styles.partyGroup}>
              <h2 className={styles.partyGroupTitle}>{partyTitle}</h2>
              <div className={styles.rail}>
                {cards.map((c, i) => (
                  <Link
                    key={c.id}
                    to={`/match-card/${c.partnerUserId}`}
                    className={styles.railCard}
                    style={{ ['--tilt' as never]: `${i % 2 === 0 ? -1 : 1}deg` } as never}
                  >
                    <Avatar
                      size="lg"
                      hue="#7A1F3D"
                      pattern="gradient"
                      emoji={c.partnerNickname[0]}
                      ring="gold"
                    />
                    <div className={styles.cardName}>{c.partnerNickname}</div>
                    <div className={styles.cardParty}>{c.partyTitle}</div>
                    <time className={styles.cardDate}>
                      {new Date(c.matchedAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {sorted.map((c, i) => (
            <Link
              key={c.id}
              to={`/match-card/${c.partnerUserId}`}
              className={styles.card}
              style={{ ['--tilt' as never]: `${i % 2 === 0 ? -1 : 1}deg` } as never}
            >
              <Avatar
                size="lg"
                hue="#7A1F3D"
                pattern="gradient"
                emoji={c.partnerNickname[0]}
                ring="gold"
              />
              <div className={styles.cardName}>{c.partnerNickname}</div>
              <div className={styles.cardParty}>{c.partyTitle}</div>
              <time className={styles.cardDate}>
                {new Date(c.matchedAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
