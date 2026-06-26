import EmptyState from '@components/feedback/EmptyState'
import PartyCardSkeletonGrid from '@components/feedback/PartyCardSkeleton'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import { EnchantingTitle } from '@components/ui/EnchantingTitle/EnchantingTitle'
import { Icon, type IconName } from '@components/ui/Icon/Icon'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { Tabs } from '@components/ui/Tabs/Tabs'
import { usePageMeta } from '@hooks/usePageMeta'
import {
  PRICE_BANDS,
  SEOUL_AREAS,
  filterByPriceBand,
  getPriceBand,
  haversineKm,
} from '@rotifolk/shared'
import { useCallback, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

import { SponsoredRail } from '../../domains/deskcloud/SponsoredRail'

import styles from './DiscoverPage.module.css'

import type { PartyCategory, PriceBandKey } from '@rotifolk/shared'

import { ALL_CATEGORIES } from '@/domains/categories/meta'
import { useGeolocation } from '@/domains/geo/useGeolocation'
import { GuestConversionBanner } from '@/domains/guest/GuestConversionBanner'
import { PartyCard } from '@/domains/parties/PartyCard'
import { useParties } from '@/domains/parties/queries'
import { useAuthStore } from '@/store/authStore'

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

type QuickIntentState = {
  status: StatusKey | null
  sort: SortKey | null
  date: string | null
  price: PriceBandKey | null
}

type QuickIntent = {
  key: string
  label: string
  icon: IconName
  sub: string
  state: QuickIntentState
}

const QUICK_INTENTS: QuickIntent[] = [
  {
    key: 'live',
    label: '지금 진행',
    icon: 'live',
    sub: 'LIVE 라운드부터',
    state: { status: 'live', sort: null, date: null, price: null },
  },
  {
    key: 'tonight',
    label: '오늘 즉시',
    icon: 'moon',
    sub: '오늘 시작 모임',
    state: { status: 'open', sort: 'soonest', date: 'today', price: null },
  },
  {
    key: 'nearby',
    label: '내 주변',
    icon: 'pin',
    sub: '거리순 정렬',
    state: { status: 'open', sort: 'nearby', date: null, price: null },
  },
  {
    key: 'popular',
    label: '인기',
    icon: 'flame',
    sub: '가장 뜨거운 모임',
    state: { status: 'open', sort: 'popular', date: null, price: null },
  },
  {
    key: 'weekend',
    label: '주말',
    icon: 'moon',
    sub: '이번 주말 집중',
    state: { status: 'open', sort: 'soonest', date: 'weekend', price: null },
  },
  {
    key: 'free',
    label: '가성비',
    icon: 'sparkle',
    sub: '무료 라운드',
    state: { status: 'open', sort: 'soonest', date: null, price: 'free' },
  },
]

export default function DiscoverPage() {
  usePageMeta({
    title: '로테이션 파티 둘러보기',
    description: '와인·커피·차·위스키 로테이션 모임을 카테고리·지역·날짜로 둘러보세요.',
  })
  const [params, setParams] = useSearchParams()
  const me = useAuthStore((s) => s.user)
  const location = useLocation()
  const currentPath = `${location.pathname}${location.search}${location.hash}`
  const category = params.get('category') as PartyCategory | null
  const area = params.get('area')
  const date = params.get('date')
  const tag = params.get('tag')
  const price = params.get('price') as PriceBandKey | null
  const statusParam = params.get('status') as StatusKey | null
  const sortParam = params.get('sort') as SortKey | null
  const sort = sortParam ?? 'soonest'
  const status = statusParam ?? 'open'
  const activeSort = sortParam ?? 'soonest'

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
  const resetPage = useCallback(() => {
    setPageSize(PAGE_INCREMENT)
  }, [])
  const activeQuickState = useMemo(
    () => ({
      status: statusParam ?? 'open',
      sort: activeSort,
      date,
      price,
    }),
    [activeSort, date, price, statusParam]
  )
  const applyQuickIntent = (next: QuickIntentState) => {
    resetPage()
    const nextParams = new URLSearchParams(params)
    ;(['status', 'sort', 'date', 'price'] as const).forEach((k) => {
      const value = next[k]
      if (value == null) {
        nextParams.delete(k)
      } else {
        nextParams.set(k, value)
      }
    })
    if (next.sort === 'nearby' && !geo.coords) geo.request()
    setParams(nextParams, { replace: true })
  }
  const isQuickIntentActive = (intent: QuickIntent) =>
    intent.state.status === activeQuickState.status &&
    (intent.state.sort == null || intent.state.sort === activeQuickState.sort) &&
    (intent.state.date == null || intent.state.date === activeQuickState.date) &&
    (intent.state.price == null || intent.state.price === activeQuickState.price)

  const priceBand = getPriceBand(price)

  const filterSummary = useMemo(() => {
    const parts: string[] = [
      status === 'open' ? '모집 중' : status === 'live' ? '진행 중' : '지난 모임',
    ]
    if (date) {
      const found = DATE_FILTERS.find((entry) => entry.value === date)
      if (found) parts.push(found.label)
    }
    if (sort === 'popular') parts.push('인기순')
    if (sort === 'nearby') parts.push('거리순')
    if (priceBand) parts.push(`참가비 ${priceBand.label}`)
    if (category) {
      const foundCategory = ALL_CATEGORIES.find((entry) => entry.value === category)
      if (foundCategory) parts.push(foundCategory.shortLabel)
    }
    if (area) parts.push(area)
    return parts.join(' · ')
  }, [area, category, date, priceBand, sort, status])

  const sortedItems = useMemo(() => {
    if (!data) return []
    const arr = filterByPriceBand(data.items, price)
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
  }, [data, sort, geo.coords, price])

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

  const setParamWithReset = (key: string, value: string | null) => {
    resetPage()
    setParam(key, value)
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
  if (priceBand) activeChips.push({ key: 'price', label: `💸 ${priceBand.label}` })

  const clearAll = () => {
    resetPage()
    const next = new URLSearchParams(params)
    for (const k of ['category', 'area', 'date', 'tag', 'price']) next.delete(k)
    setParams(next, { replace: true })
  }

  const renderCards = (items: typeof sortedItems) =>
    items.map((p) => <PartyCard key={p.id} party={p} />)

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <EnchantingTitle>로테이션 파티 둘러보기</EnchantingTitle>
        <p>관심 있는 카테고리 · 지역으로 필터링해 보세요.</p>
      </header>
      {!me && (
        <section className={`container ${styles.guestBannerWrap}`}>
          <GuestConversionBanner from={currentPath} />
        </section>
      )}

      <section className={`container ${styles.filters}`} aria-label="모임 필터">
        <div className={styles.quickIntents} role="group" aria-label="빠른 탐색">
          {QUICK_INTENTS.map((intent) => {
            const active = isQuickIntentActive(intent)
            return (
              <button
                key={intent.key}
                type="button"
                className={`${styles.quickIntent} ${active ? styles.quickIntentActive : ''}`}
                onClick={() => applyQuickIntent(intent.state)}
                aria-pressed={active}
              >
                <Icon name={intent.icon} />
                <span>
                  <strong>{intent.label}</strong>
                  <small>{intent.sub}</small>
                </span>
              </button>
            )
          })}
        </div>

        {/* Primary axis: what am I browsing (status) + how it's ordered (sort). */}
        <div className={styles.controlRow}>
          <Tabs
            label="모임 상태"
            value={status}
            onChange={(v) => setParamWithReset('status', v === 'open' ? null : v)}
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
              setParamWithReset('sort', v === 'soonest' ? null : v)
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
            onClick={() => setParamWithReset('category', null)}
            leadingIcon={<Icon name="sparkle" />}
          >
            전체
          </Chip>
          {ALL_CATEGORIES.filter((c) => c.value !== 'custom').map((c) => (
            <Chip
              key={c.value}
              selected={category === c.value}
              onClick={() => setParamWithReset('category', category === c.value ? null : c.value)}
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
              <Chip selected={areaActive(null)} onClick={() => setParamWithReset('area', null)}>
                전체
              </Chip>
              {QUICK_AREAS.map((a) => (
                <Chip key={a} selected={areaActive(a)} onClick={() => setParamWithReset('area', a)}>
                  {a}
                </Chip>
              ))}
              {area && !QUICK_AREAS.includes(area as (typeof QUICK_AREAS)[number]) && (
                <Chip selected onClick={() => setParamWithReset('area', null)}>
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
                    onClick={() => setParamWithReset('date', entry.value)}
                  >
                    {entry.label}
                  </Chip>
                )
              })}
            </div>
          </div>

          <div className={styles.refineGroup} role="group" aria-label="참가비 필터">
            <span className={styles.refineLabel}>
              <Icon name="sliders" /> 참가비
            </span>
            <div className={styles.chipScroll}>
              <Chip selected={!price} onClick={() => setParamWithReset('price', null)}>
                전체
              </Chip>
              {PRICE_BANDS.map((b) => (
                <Chip
                  key={b.key}
                  selected={price === b.key}
                  onClick={() => setParamWithReset('price', price === b.key ? null : b.key)}
                >
                  {b.label}
                </Chip>
              ))}
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
                onClick={() => setParamWithReset(c.key, null)}
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
        ) : !data || sortedItems.length === 0 ? (
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
              <p className={styles.count} role="status" aria-live="polite">
                <strong>{sortedItems.length}</strong>개 조회
                <span className={styles.countMeta}>{filterSummary}</span>
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

            {/* 추천(Sponsored) 모임 — 네이티브 AdDesk 레일; 서빙될 때만 렌더 */}
            <SponsoredRail />

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
              setParamWithReset('area', null)
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
                setParamWithReset('area', a)
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
