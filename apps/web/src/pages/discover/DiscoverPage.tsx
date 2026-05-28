import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { PartyCategory } from '@rotifolk/shared'
import { SEOUL_AREAS, haversineKm } from '@rotifolk/shared'
import { useParties } from '@features/parties/queries'
import { PartyCard } from '@features/parties/PartyCard'
import { ALL_CATEGORIES } from '@features/categories/meta'
import { useGeolocation } from '@features/geo/useGeolocation'
import { Chip } from '@components/ui/Chip/Chip'
import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import styles from './DiscoverPage.module.css'

type SortKey = 'soonest' | 'popular' | 'nearby'

const SORTS: { value: SortKey; label: string; emoji: string }[] = [
  { value: 'soonest', label: '곧 시작', emoji: '⏰' },
  { value: 'popular', label: '인기', emoji: '🔥' },
  { value: 'nearby', label: '가까운', emoji: '📍' },
]

export default function DiscoverPage() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') as PartyCategory | null
  const area = params.get('area')
  const date = params.get('date')
  const tag = params.get('tag')

  const sort = (params.get('sort') as SortKey | null) ?? 'soonest'

  const query = useMemo(
    () => ({
      category: category ?? undefined,
      area: area ?? undefined,
      date: date ?? undefined,
      tag: tag ?? undefined,
      status: 'open' as const,
    }),
    [category, area, date, tag],
  )
  const { data, isLoading } = useParties(query)
  const geo = useGeolocation()

  const sortedItems = useMemo(() => {
    if (!data) return []
    const arr = [...data.items]
    if (sort === 'popular') {
      arr.sort((a, b) => {
        const fa = a.currentParticipants / Math.max(1, a.maxParticipants)
        const fb = b.currentParticipants / Math.max(1, b.maxParticipants)
        if (fb !== fa) return fb - fa
        return b.currentParticipants - a.currentParticipants
      })
    } else if (sort === 'nearby' && geo.coords) {
      const here = geo.coords
      const dist = (area: string) => {
        const c = SEOUL_AREAS[area]
        return c ? haversineKm(here, c) : Number.POSITIVE_INFINITY
      }
      arr.sort((a, b) => dist(a.venueArea) - dist(b.venueArea))
    } else {
      // 'soonest' (default — matches API ordering)
      arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    }
    return arr
  }, [data, sort, geo.coords])

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <h1>로테이션 파티 둘러보기</h1>
        <p>관심 있는 카테고리 · 지역으로 필터링해 보세요.</p>
      </header>

      <section className={`container ${styles.filters}`}>
        <div className={styles.filterRow} role="group" aria-label="카테고리 필터">
          <Chip
            selected={!category}
            onClick={() => setParam('category', null)}
            leadingEmoji="🌟"
          >
            전체
          </Chip>
          {ALL_CATEGORIES.filter((c) => c.value !== 'custom').map((c) => (
            <Chip
              key={c.value}
              selected={category === c.value}
              onClick={() => setParam('category', category === c.value ? null : c.value)}
              leadingEmoji={c.emoji}
            >
              {c.shortLabel}
            </Chip>
          ))}
        </div>

        <div className={styles.filterRow} role="group" aria-label="지역 필터">
          {['전체', '한남', '연남', '북촌', '강남', '성수'].map((a) => {
            const v = a === '전체' ? null : a
            const active = (v ?? '') === (area ?? '')
            return (
              <Chip key={a} selected={active} onClick={() => setParam('area', v)} leadingEmoji="📍">
                {a}
              </Chip>
            )
          })}
        </div>

        {tag && (
          <div className={styles.filterRow} role="group" aria-label="태그 필터">
            <Chip
              selected
              onClick={() => setParam('tag', null)}
              leadingEmoji="#"
            >
              {tag}  ✕
            </Chip>
          </div>
        )}

        <div className={styles.filterRow} role="group" aria-label="정렬">
          {SORTS.map((s) => {
            const disabled = s.value === 'nearby' && !geo.coords
            const active = sort === s.value
            return (
              <Chip
                key={s.value}
                selected={active}
                leadingEmoji={s.emoji}
                onClick={() => {
                  if (s.value === 'nearby' && !geo.coords) {
                    geo.request()
                  }
                  setParam('sort', s.value === 'soonest' ? null : s.value)
                }}
                aria-disabled={disabled}
                title={disabled ? '위치 권한이 필요해요' : ''}
              >
                {s.label}
                {disabled && ' (위치 허용 필요)'}
              </Chip>
            )
          })}
        </div>
      </section>

      <section className={`container ${styles.list}`}>
        {isLoading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            emoji="🍷"
            title="조건에 맞는 파티가 없어요"
            description="필터를 조금 풀어보거나, 직접 파티를 열어보는 건 어떠세요?"
          />
        ) : (
          <>
            <p className={styles.count}>
              총 <strong>{data.total}</strong>개의 파티
            </p>
            <div className={styles.grid}>
              {sortedItems.map((p) => (
                <PartyCard key={p.id} party={p} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
