import EmptyState from '@components/feedback/EmptyState'
import PartyCardSkeletonGrid from '@components/feedback/PartyCardSkeleton'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import { Icon, type IconName } from '@components/ui/Icon/Icon'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { Tabs } from '@components/ui/Tabs/Tabs'
import { ALL_CATEGORIES } from '@domains/categories/meta'
import { useGeolocation } from '@domains/geo/useGeolocation'
import { PartyCard } from '@domains/parties/PartyCard'
import { useParties } from '@domains/parties/queries'
import { usePageMeta } from '@hooks/usePageMeta'
import { SEOUL_AREAS, haversineKm } from '@rotifolk/shared'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import styles from './DiscoverPage.module.css'

import type { PartyCategory } from '@rotifolk/shared'

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

const QUICK_AREAS = ['한남', '연남', '북촌', '강남', '성수'] as const

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

  const [pageSize, setPageSize] = useState(PAGE_INCREMENT)
  const [areaSheetOpen, setAreaSheetOpen] = useState(false)
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
    [category, area, dateIso, tag, status, pageSize]
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

  // List rhythm: lift "happening now / about to start" out of the uniform grid
  // so the list reads as a feed with a pulse, not an endless identical card wall.
  const { featured, rest } = useMemo(() => {
    if (status !== 'open') return { featured: [], rest: sortedItems }
    const soonCutoff = todayBase.getTime() + 6 * 3_600_000
    const feat = sortedItems.filter(
      (p) => p.status === 'live' || new Date(p.startAt).getTime() <= soonCutoff
    )
    if (feat.length === 0 || feat.length === sortedItems.length) {
      return { featured: [], rest: sortedItems }
    }
    const featSet = new Set(feat.map((p) => p.id))
    return { featured: feat, rest: sortedItems.filter((p) => !featSet.has(p.id)) }
  }, [sortedItems, status, todayBase])

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const areaActive = (a: string | null) => (a ?? '') === (area ?? '')
  const otherAreas = Object.keys(SEOUL_AREAS).filter(
    (a) => !QUICK_AREAS.includes(a as (typeof QUICK_AREAS)[number])
  )

  // Active secondary filters drive a small summary + reset affordance.
  const activeChips: { key: string; label: string }[] = []
  if (category) {
    const meta = ALL_CATEGORIES.find((c) => c.value === category)
    if (meta) activeChips.push({ key: 'category', label: `${meta.emoji} ${meta.shortLabel}` })
  }
  if (area) activeChips.push({ key: 'area', label: area })
  if (date) {
    const d = DATE_FILTERS.find((e) => e.value === date)
    activeChips.push({ key: 'date', label: d?.label ?? date })
  }
  if (tag) activeChips.push({ key: 'tag', label: `#${tag}` })

  const clearAll = () => {
    const next = new URLSearchParams(params)
    for (const k of ['category', 'area', 'date', 'tag']) next.delete(k)
    setParams(next, { replace: true })
  }

  const renderCards = (items: typeof sortedItems) =>
    items.map((p) => <PartyCard key={p.id} party={p} />)

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <h1>로테이션 파티 둘러보기</h1>
        <p>관심 있는 카테고리 · 지역으로 필터링해 보세요.</p>
      </header>

      <section className={`container ${styles.filters}`} aria-label="모임 필터">
        {/* Primary axis: what am I browsing (status) + how it's ordered (sort). */}
        <div className={styles.controlRow}>
          <Tabs
            label="모임 상태"
            value={status}
            onChange={(v) => setParam('status', v === 'open' ? null : v)}
            tabs={STATUSES.map((s) => ({
              value: s.value,
              label: s.label,
              icon: <Icon name={s.icon} />,
            }))}
          />
          <Tabs
            label="정렬 기준"
            variant="underline"
            size="sm"
            value={sort}
            onChange={(v) => {
              if (v === 'nearby' && !geo.coords) geo.request()
              setParam('sort', v === 'soonest' ? null : v)
            }}
            tabs={SORTS.map((s) => ({
              value: s.value,
              label: s.value === 'nearby' && !geo.coords ? `${s.label} (위치)` : s.label,
              icon: <Icon name={s.icon} />,
            }))}
          />
        </div>

        {/* Category — the primary content filter, keeps brand emoji. */}
        <div className={styles.chipScroll} role="group" aria-label="카테고리 필터">
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

        {/* Secondary refinement: area + date, clearly labeled and grouped. */}
        <div className={styles.refine}>
          <div className={styles.refineGroup} role="group" aria-label="지역 필터">
            <span className={styles.refineLabel}>
              <Icon name="pin" /> 지역
            </span>
            <div className={styles.chipScroll}>
              <Chip selected={areaActive(null)} onClick={() => setParam('area', null)}>
                전체
              </Chip>
              {QUICK_AREAS.map((a) => (
                <Chip key={a} selected={areaActive(a)} onClick={() => setParam('area', a)}>
                  {a}
                </Chip>
              ))}
              {area && !QUICK_AREAS.includes(area as (typeof QUICK_AREAS)[number]) && (
                <Chip selected onClick={() => setParam('area', null)}>
                  {area}
                </Chip>
              )}
              {otherAreas.length > 0 && (
                <Chip
                  onClick={() => setAreaSheetOpen(true)}
                  leadingIcon={<Icon name="plus" />}
                  aria-haspopup="dialog"
                >
                  더보기
                </Chip>
              )}
            </div>
          </div>

          <div className={styles.refineGroup} role="group" aria-label="날짜 필터">
            <span className={styles.refineLabel}>
              <Icon name="clock" /> 날짜
            </span>
            <div className={styles.chipScroll}>
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
        </div>

        {/* Active-filter summary + one-tap reset. */}
        {activeChips.length > 0 && (
          <div className={styles.activeBar} role="group" aria-label="적용된 필터">
            <span className={styles.activeLabel}>필터</span>
            {activeChips.map((c) => (
              <Chip
                key={c.key}
                selected
                onClick={() => setParam(c.key, null)}
                aria-label={`${c.label} 필터 해제`}
              >
                <span className={styles.activeChipInner}>
                  {c.label}
                  <Icon name="close" />
                </span>
              </Chip>
            ))}
            <Button variant="ghost" size="sm" onClick={clearAll} leftIcon={<Icon name="close" />}>
              모두 지우기
            </Button>
          </div>
        )}
      </section>

      <section className={`container ${styles.list}`} aria-busy={isFetching || undefined}>
        {isLoading ? (
          <PartyCardSkeletonGrid />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            emoji="🍷"
            title="조건에 맞는 파티가 없어요"
            description="필터를 조금 풀어보거나, 직접 파티를 열어보는 건 어떠세요?"
            action={
              activeChips.length > 0 ? (
                <Button variant="soft" size="md" onClick={clearAll}>
                  필터 초기화
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className={styles.resultHead}>
              <p className={styles.count}>
                총 <strong>{data.total}</strong>개의 파티
              </p>
            </div>

            {featured.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <Icon name="bolt" /> 지금 · 곧 시작
                </h2>
                <div className={styles.featGrid}>{renderCards(featured)}</div>
              </div>
            )}

            <div className={styles.section}>
              {featured.length > 0 && (
                <h2 className={styles.sectionTitle}>
                  <Icon name="sparkle" /> 둘러보기
                </h2>
              )}
              <div className={styles.grid}>{renderCards(rest)}</div>
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

      <Sheet
        open={areaSheetOpen}
        onClose={() => setAreaSheetOpen(false)}
        title="지역 선택"
        description="원하는 동네를 골라 모임을 좁혀보세요."
      >
        <div className={styles.sheetChips} role="group" aria-label="전체 지역">
          <Chip
            selected={areaActive(null)}
            onClick={() => {
              setParam('area', null)
              setAreaSheetOpen(false)
            }}
          >
            전체
          </Chip>
          {Object.keys(SEOUL_AREAS).map((a) => (
            <Chip
              key={a}
              selected={areaActive(a)}
              leadingIcon={<Icon name="pin" />}
              onClick={() => {
                setParam('area', a)
                setAreaSheetOpen(false)
              }}
            >
              {a}
            </Chip>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
