import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { PartyCategory } from '@rotifolk/shared'
import { SEOUL_AREAS, haversineKm } from '@rotifolk/shared'
import { useParties } from '@features/parties/queries'
import { PartyCard } from '@features/parties/PartyCard'
import { ALL_CATEGORIES } from '@features/categories/meta'
import { useGeolocation } from '@features/geo/useGeolocation'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import { Icon, type IconName } from '@components/ui/Icon/Icon'
import EmptyState from '@components/feedback/EmptyState'
import PartyCardSkeletonGrid from '@components/feedback/PartyCardSkeleton'
import { usePageMeta } from '@hooks/usePageMeta'
import styles from './DiscoverPage.module.css'

const PAGE_INCREMENT = 20
const MAX_PAGE_SIZE = 50

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

type SortKey = 'soonest' | 'popular' | 'nearby'
type StatusKey = 'open' | 'live' | 'ended'

const DATE_FILTERS = [
  { label: '전체', value: null as string | null },
  { label: '오늘', value: 'today' },
  { label: '내일', value: 'tomorrow' },
  { label: '이번 주말', value: 'weekend' },
] as const

const SORTS: { value: SortKey; label: string; icon: IconName }[] = [
  { value: 'soonest', label: '곧 시작', icon: 'clock' },
  { value: 'popular', label: '인기', icon: 'flame' },
  { value: 'nearby', label: '가까운', icon: 'pin' },
]

const STATUSES: { value: StatusKey; label: string; icon: IconName }[] = [
  { value: 'open', label: '모집 중', icon: 'moon' },
  { value: 'live', label: '진행 중', icon: 'live' },
  { value: 'ended', label: '지난 모임', icon: 'archive' },
]

export default function DiscoverPage() {
  usePageMeta({
    title: '로테이션 파티 둘러보기',
    description: '와인·커피·차·위스키 로테이션 모임을 카테고리·지역·날짜로 둘러보세요.',
  })
  const [params, setParams] = useSearchParams()
  const category = params.get('category') as PartyCategory | null
  const area = params.get('area')
  const date = params.get('date')
  const tag = params.get('tag')

  const sort = (params.get('sort') as SortKey | null) ?? 'soonest'
  const status = (params.get('status') as StatusKey | null) ?? 'open'

  // 카테고리만 기본 노출하고, 지역·상태·정렬·날짜는 토글 뒤로 접어 초기 복잡도를 낮춘다.
  const activeSecondaryCount =
    (area ? 1 : 0) + (status !== 'open' ? 1 : 0) + (sort !== 'soonest' ? 1 : 0) + (date ? 1 : 0)
  const [showFilters, setShowFilters] = useState(() => activeSecondaryCount > 0)

  const [pageSize, setPageSize] = useState(PAGE_INCREMENT)
  const [todayBase] = useState(() => new Date())

  const today = isoDate(todayBase)
  const tomorrow = isoDate(new Date(todayBase.getTime() + 86_400_000))
  const nextSaturday = (() => {
    const d = new Date(todayBase)
    const day = d.getDay()
    const diff = (6 - day + 7) % 7 || 7
    d.setDate(d.getDate() + diff)
    return isoDate(d)
  })()
  const dateIso =
    date === 'today'
      ? today
      : date === 'tomorrow'
        ? tomorrow
        : date === 'weekend'
          ? nextSaturday
          : (date ?? undefined)

  const query = useMemo(
    () => ({
      category: category ?? undefined,
      area: area ?? undefined,
      date: dateIso,
      tag: tag ?? undefined,
      status,
      pageSize,
    }),
    [category, area, dateIso, tag, status, pageSize],
  )
  const { data, isLoading, isFetching } = useParties(query)
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
            leadingIcon={<Icon name="sparkle" />}
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

        {tag && (
          <div className={styles.filterRow} role="group" aria-label="태그 필터">
            <Chip selected onClick={() => setParam('tag', null)} leadingEmoji="#">
              {tag} ✕
            </Chip>
          </div>
        )}

        <button
          type="button"
          className={styles.moreToggle}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          aria-controls="discover-more-filters"
        >
          <Icon name="sliders" />
          <span>{showFilters ? '필터 접기' : '지역 · 상태 · 정렬 · 날짜'}</span>
          {activeSecondaryCount > 0 && (
            <span className={styles.moreBadge} aria-label={`적용된 필터 ${activeSecondaryCount}개`}>
              {activeSecondaryCount}
            </span>
          )}
        </button>

        {showFilters && (
          <div id="discover-more-filters" className={styles.moreFilters}>
            <div className={styles.filterRow} role="group" aria-label="지역 필터">
              {['전체', '한남', '연남', '북촌', '강남', '성수'].map((a) => {
                const v = a === '전체' ? null : a
                const active = (v ?? '') === (area ?? '')
                return (
                  <Chip
                    key={a}
                    selected={active}
                    onClick={() => setParam('area', v)}
                    leadingIcon={<Icon name="pin" />}
                  >
                    {a}
                  </Chip>
                )
              })}
            </div>

            <div className={styles.filterRow} role="group" aria-label="상태 필터">
              {STATUSES.map((s) => (
                <Chip
                  key={s.value}
                  selected={status === s.value}
                  leadingIcon={<Icon name={s.icon} />}
                  onClick={() => setParam('status', s.value === 'open' ? null : s.value)}
                >
                  {s.label}
                </Chip>
              ))}
            </div>

            <div className={styles.filterRow} role="group" aria-label="정렬">
              {SORTS.map((s) => {
                const disabled = s.value === 'nearby' && !geo.coords
                const active = sort === s.value
                return (
                  <Chip
                    key={s.value}
                    selected={active}
                    leadingIcon={<Icon name={s.icon} />}
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

            <div className={styles.filterRow} role="group" aria-label="날짜 필터">
              {DATE_FILTERS.map((entry) => {
                const active = entry.value === null ? !date : date === entry.value
                return (
                  <Chip
                    key={entry.value ?? '전체'}
                    selected={active}
                    onClick={() => setParam('date', entry.value)}
                  >
                    {entry.label}
                  </Chip>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <section className={`container ${styles.list}`}>
        {isLoading ? (
          <PartyCardSkeletonGrid />
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
            {data.hasNext && pageSize < MAX_PAGE_SIZE && (
              <div className={styles.loadMore}>
                <Button
                  variant="outline"
                  size="lg"
                  isLoading={isFetching}
                  onClick={() => setPageSize((n) => Math.min(MAX_PAGE_SIZE, n + PAGE_INCREMENT))}
                >
                  더 보기 ({data.total - data.items.length}개 남음)
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
