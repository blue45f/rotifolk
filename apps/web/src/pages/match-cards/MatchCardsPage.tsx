import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import { EnchantingTitle } from '@components/ui/EnchantingTitle/EnchantingTitle'
import { Icon } from '@components/ui/Icon/Icon'
import { Input } from '@components/ui/Input/Input'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import styles from './MatchCards.module.css'

import { api } from '@/infrastructure/api'

interface MatchCardItem {
  id: string
  partnerUserId: string
  partnerNickname: string
  partnerAvatarId: string | null
  partnerAvatarImage?: string | null
  partyId: string
  partyTitle: string
  matchedAt: string
}

type SortOption = '최근순' | '이름순'

function formatMatchedAt(value: string) {
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function MatchCardRow({ card }: { card: MatchCardItem }) {
  return (
    <li className={styles.rowItem}>
      <Link
        to={`/match-card/${card.partnerUserId}`}
        className={styles.row}
        aria-label={`${card.partnerNickname} 님의 명함 보기`}
      >
        <Avatar
          size="lg"
          hue="var(--color-primary)"
          pattern="gradient"
          emoji={card.partnerNickname[0]}
          imageSrc={card.partnerAvatarImage ?? null}
          ring="gold"
        />
        <span className={styles.rowText}>
          <span className={styles.rowName}>{card.partnerNickname}</span>
          <span className={styles.rowMeta}>
            <Icon name="sparkle" aria-hidden />
            <span className={styles.rowParty}>{card.partyTitle}</span>
          </span>
          <time className={styles.rowDate} dateTime={card.matchedAt}>
            <Icon name="clock" aria-hidden />
            {formatMatchedAt(card.matchedAt)}
          </time>
        </span>
        <span className={styles.rowGo} aria-hidden="true">
          <Icon name="chevron-right" />
        </span>
      </Link>
    </li>
  )
}

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
    [data, q]
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

  const total = data?.length ?? 0
  const hasCards = total > 0

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <Badge tone="gold" size="md">
          내 명함
        </Badge>
        <EnchantingTitle className={styles.title}>라운드에서 만난 인연</EnchantingTitle>
        <p className={styles.lede}>
          여러 라운드에서 마주친 사람들의 명함이에요. 이어가고 싶은 상대를 골라 1:1로 연결해 보세요.
        </p>
      </header>

      {hasCards && (
        <section className={styles.controls} aria-label="명함 검색 및 정렬">
          <Input
            label="명함 검색"
            leftIcon={<Icon name="search" aria-hidden />}
            placeholder="닉네임 또는 파티명으로 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className={styles.toolbar}>
            <div className={styles.chipGroup} role="group" aria-label="정렬 기준">
              <Chip selected={sort === '최근순'} onClick={() => setSort('최근순')}>
                최근순
              </Chip>
              <Chip selected={sort === '이름순'} onClick={() => setSort('이름순')}>
                이름순
              </Chip>
            </div>
            <Chip
              leadingIcon={<Icon name="archive" aria-hidden />}
              selected={groupByParty}
              onClick={() => setGroupByParty((v) => !v)}
            >
              파티별 보기
            </Chip>
          </div>
          <p className={styles.count} aria-live="polite">
            {q ? `${filtered.length}장 표시 중 · 전체 ${total}장` : `전체 ${total}장`}
          </p>
        </section>
      )}

      {!hasCards ? (
        <EmptyState
          emoji="💌"
          title="아직 명함이 없어요"
          description="다음 모임에서 새로운 인연을 만들어 보세요."
          action={
            <Link to="/discover">
              <Button variant="primary" leftIcon={<Icon name="compass" aria-hidden />}>
                모임 탐색
              </Button>
            </Link>
          }
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="검색 결과가 없어요"
          description="다른 검색어를 입력해 보세요."
          action={
            <Button variant="soft" onClick={() => setQ('')}>
              검색 초기화
            </Button>
          }
        />
      ) : groupByParty ? (
        <div className={styles.groups}>
          {groupedByParty.map(([partyTitle, cards]) => (
            <section key={partyTitle} className={styles.partyGroup} aria-label={partyTitle}>
              <h2 className={styles.partyGroupTitle}>
                <span>{partyTitle}</span>
                <span className={styles.partyGroupCount}>{cards.length}</span>
              </h2>
              <ul className={styles.rows}>
                {cards.map((c) => (
                  <MatchCardRow key={c.id} card={c} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className={styles.rows}>
          {sorted.map((c) => (
            <MatchCardRow key={c.id} card={c} />
          ))}
        </ul>
      )}
    </div>
  )
}
