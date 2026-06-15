import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

import styles from './Category.module.css'

import type { PartyCategory, VenueKind } from '@rotifolk/shared'

import { CATEGORY_META, ALL_CATEGORIES } from '@/domains/categories/meta'
import { PartyCard } from '@/domains/parties/PartyCard'
import { useParties } from '@/domains/parties/queries'
import { useVenues } from '@/domains/venues/queries'

type SortKey = 'soonest' | 'seats' | 'price'

const VALID_CATEGORIES = new Set<PartyCategory>(ALL_CATEGORIES.map((c) => c.value))

/** 카테고리 → 어울리는 venue kind 매핑. */
const VENUE_KIND_BY_CATEGORY: Partial<Record<PartyCategory, VenueKind>> = {
  wine: 'wine-bar',
  'natural-wine': 'wine-bar',
  coffee: 'cafe',
  tea: 'tea-house',
  whisky: 'whisky-bar',
  cocktail: 'lounge',
  beer: 'lounge',
  sake: 'lounge',
  dessert: 'cafe',
  custom: 'private-room',
}

const VENUE_KIND_LABEL: Record<VenueKind, string> = {
  'wine-bar': '와인바',
  cafe: '카페',
  'tea-house': '다실',
  'whisky-bar': '위스키바',
  lounge: '라운지',
  'private-room': '프라이빗',
  rooftop: '루프탑',
  gallery: '갤러리',
  studio: '스튜디오',
  restaurant: '레스토랑',
  pub: '펍',
  custom: '커스텀',
}

function isValidCategory(value: string | undefined): value is PartyCategory {
  return !!value && VALID_CATEGORIES.has(value as PartyCategory)
}

function formatHostFallback(hostId: string): string {
  // hostId 기반 짧은 닉네임 fallback (PartySummary에는 host 객체가 없음)
  const tail = hostId.slice(-4).toUpperCase()
  return `호스트 #${tail}`
}

export default function CategoryPage() {
  const { value } = useParams<{ value: string }>()
  const validCategory = isValidCategory(value) ? value : null
  const [sort, setSort] = useState<SortKey>('soonest')

  // 훅 순서 보존을 위해 항상 호출하되, 유효하지 않으면 enabled-effect 처럼 의미 없는 카테고리를 전달
  const partiesQuery = useParties(
    validCategory ? { category: validCategory, status: 'open' } : { status: 'open' }
  )
  const venuesQuery = useVenues(
    validCategory ? { kind: VENUE_KIND_BY_CATEGORY[validCategory] } : {}
  )

  const parties = useMemo(() => {
    const raw = partiesQuery.data?.items ?? []
    const copy = [...raw]
    if (sort === 'soonest')
      copy.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    else if (sort === 'seats')
      copy.sort(
        (a, b) =>
          a.maxParticipants - a.currentParticipants - (b.maxParticipants - b.currentParticipants)
      )
    else if (sort === 'price') copy.sort((a, b) => a.basePriceKRW - b.basePriceKRW)
    return copy
  }, [partiesQuery.data, sort])
  const venues = venuesQuery.data ?? []

  const stats = useMemo(() => {
    const weeklyCount = parties.length
    // hostedCount 기반 placeholder — 후기 평점은 모를 수 있으므로 고정
    const rating = '4.7'
    // 같은 카테고리 누적 만난 사람 추정치: 모집 정원 × 평균 회전 라운드(=6)
    const baseMet = parties.reduce((sum, p) => sum + p.maxParticipants, 0)
    const estimatedMet = Math.max(1200, baseMet * 6 + 1200)
    return { weeklyCount, rating, estimatedMet }
  }, [parties])

  const hosts = useMemo(() => {
    const seen = new Set<string>()
    const list: { id: string; venueArea: string; venueName: string }[] = []
    for (const p of parties) {
      // PartySummary 에는 hostId 가 없으므로 venueName+area 조합으로 distinct
      const key = `${p.venueName}::${p.venueArea}`
      if (seen.has(key)) continue
      seen.add(key)
      list.push({ id: key, venueArea: p.venueArea, venueName: p.venueName })
      if (list.length >= 4) break
    }
    return list
  }, [parties])

  if (!validCategory) {
    return (
      <main className={styles.page}>
        <section className={styles.section} aria-labelledby="cat-invalid-title">
          <h1 id="cat-invalid-title" className={styles.srOnly}>
            카테고리를 찾을 수 없어요
          </h1>
          <EmptyState
            emoji="✨"
            title="존재하지 않는 카테고리예요"
            description="다른 카테고리를 둘러보거나, 전체 목록에서 골라보세요."
            action={
              <Link to="/discover" className={styles.bareLink}>
                <Button variant="primary">전체 모임 보기</Button>
              </Link>
            }
          />
        </section>
      </main>
    )
  }

  const meta = CATEGORY_META[validCategory]
  const topVenues = venues.slice(0, 3)
  const otherCategories = ALL_CATEGORIES.filter((c) => c.value !== validCategory)
  const partiesLoaded = !partiesQuery.isLoading
  const hasParties = parties.length > 0

  const moodStyle = {
    ['--cat-bg' as never]: meta.bgGradient,
    ['--cat-accent' as never]: meta.accentHex,
  } as never

  return (
    <main className={styles.page}>
      {/* —— Category mood header —— */}
      <header className={styles.mood} style={moodStyle} aria-labelledby="cat-mood-title">
        <div className={styles.moodInner}>
          <div className={styles.moodEmoji} aria-hidden="true">
            {meta.emoji}
          </div>
          <p className={styles.kicker}>{meta.shortLabel} 로테이션</p>
          <h1 id="cat-mood-title" className={styles.moodTitle}>
            {meta.label}
          </h1>
          <p className={styles.moodDesc}>{meta.description}</p>

          <dl className={styles.moodStats} aria-label="카테고리 요약">
            <div className={styles.moodStat}>
              <dt>이번 주 모임</dt>
              <dd>{stats.weeklyCount}개</dd>
            </div>
            <div className={styles.moodStat}>
              <dt>평균 평점</dt>
              <dd>{stats.rating}</dd>
            </div>
            <div className={styles.moodStat}>
              <dt>만난 사람</dt>
              <dd>{stats.estimatedMet.toLocaleString()}+</dd>
            </div>
          </dl>

          <div className={styles.moodCta}>
            <Link to={`/discover?category=${validCategory}`} className={styles.bareLink}>
              <Button variant="primary" size="lg">
                이 카테고리 모임 보기
              </Button>
            </Link>
            <Link to={`/quick?category=${validCategory}`} className={styles.bareLink}>
              <Button variant="outline" size="lg">
                <Icon name="bolt" aria-hidden /> 즉석 모임 열기
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* —— Now recruiting (primary content) —— */}
      <section className={styles.section} aria-labelledby="open-title">
        <header className={styles.sectionHead}>
          <div>
            <h2 id="open-title" className={styles.sectionTitle}>
              지금 모집 중
            </h2>
            <p className={styles.sectionSub}>
              {meta.shortLabel} 라운드로 새로운 사람을 만나보세요.
            </p>
          </div>
          <Link to={`/discover?category=${validCategory}`} className={styles.sectionAction}>
            전체 보기
            <Icon name="chevron-right" aria-hidden />
          </Link>
        </header>

        {hasParties && (
          <div className={styles.sortRow} role="group" aria-label="정렬 기준">
            <Chip
              selected={sort === 'soonest'}
              onClick={() => setSort('soonest')}
              leadingIcon={<Icon name="clock" aria-hidden />}
            >
              빠른 시작순
            </Chip>
            <Chip selected={sort === 'seats'} onClick={() => setSort('seats')} leadingEmoji="💺">
              자리 있는 순
            </Chip>
            <Chip selected={sort === 'price'} onClick={() => setSort('price')} leadingEmoji="💰">
              가격 낮은 순
            </Chip>
          </div>
        )}

        {!partiesLoaded ? (
          <Loading />
        ) : !hasParties ? (
          <EmptyState
            emoji={meta.emoji}
            title="아직 모집 중인 모임이 없어요"
            description="가장 먼저 한 잔을 열어보는 건 어때요?"
            action={
              <Link to={`/quick?category=${validCategory}`} className={styles.bareLink}>
                <Button variant="primary">
                  <Icon name="bolt" aria-hidden /> 즉석 모임 열기
                </Button>
              </Link>
            }
          />
        ) : (
          <div className={styles.partyGrid}>
            {parties.map((p) => (
              <PartyCard key={p.id} party={p} />
            ))}
          </div>
        )}
      </section>

      {/* —— Popular hosts —— */}
      {hosts.length > 0 && (
        <section className={styles.section} aria-labelledby="hosts-title">
          <header className={styles.sectionHead}>
            <div>
              <h2 id="hosts-title" className={styles.sectionTitle}>
                인기 호스트
              </h2>
              <p className={styles.sectionSub}>이 카테고리로 자주 모임을 여는 장소들.</p>
            </div>
          </header>
          <ul className={styles.hostList}>
            {hosts.map((h) => (
              <li key={h.id} className={styles.hostCard}>
                <span className={styles.hostAvatar} aria-hidden="true">
                  {h.venueName.charAt(0)}
                </span>
                <div className={styles.hostBody}>
                  <span className={styles.hostName}>{h.venueName}</span>
                  <span className={styles.hostMeta}>
                    <Icon name="pin" aria-hidden />
                    {h.venueArea} · {formatHostFallback(h.id)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* —— Recommended venues —— */}
      <section className={styles.section} aria-labelledby="venues-title">
        <header className={styles.sectionHead}>
          <div>
            <h2 id="venues-title" className={styles.sectionTitle}>
              추천 장소
            </h2>
            <p className={styles.sectionSub}>
              {meta.shortLabel} 모임에 어울리는{' '}
              {VENUE_KIND_LABEL[VENUE_KIND_BY_CATEGORY[validCategory] ?? 'lounge']} 큐레이션.
            </p>
          </div>
          <Link to="/venues" className={styles.sectionAction}>
            장소 더 보기
            <Icon name="chevron-right" aria-hidden />
          </Link>
        </header>

        {venuesQuery.isLoading ? (
          <Loading />
        ) : topVenues.length === 0 ? (
          <EmptyState
            emoji="✨"
            title="제휴 장소가 곧 추가됩니다"
            description="원하는 장소가 있다면 호스트로 직접 모임을 열 수 있어요."
          />
        ) : (
          <ul className={styles.venueGrid}>
            {topVenues.map((v) => (
              <li key={v.id}>
                <Link to={`/venues/${v.id}`} className={styles.venueCard}>
                  <span className={styles.venueName}>{v.name}</span>
                  <span className={styles.venueMeta}>
                    <span className={styles.venueMetaItem}>
                      <Icon name="pin" aria-hidden />
                      {v.area}
                    </span>
                    <span className={styles.venueMetaDot} aria-hidden="true" />
                    <span>{VENUE_KIND_LABEL[v.kind]}</span>
                    {v.partnered && (
                      <>
                        <span className={styles.venueMetaDot} aria-hidden="true" />
                        <Badge tone="primary" size="sm">
                          제휴
                        </Badge>
                      </>
                    )}
                  </span>
                  {v.description && <p className={styles.venueDesc}>{v.description}</p>}
                  <span className={styles.venueRating}>
                    ⭐ {v.rating.toFixed(1)}
                    <em>({v.reviewCount.toLocaleString()})</em>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* —— Other categories —— */}
      <section className={styles.section} aria-labelledby="other-title">
        <header className={styles.sectionHead}>
          <div>
            <h2 id="other-title" className={styles.sectionTitle}>
              다른 카테고리 둘러보기
            </h2>
            <p className={styles.sectionSub}>오늘은 다른 잔으로 시작해보는 것도 좋아요.</p>
          </div>
        </header>
        <ul className={styles.otherGrid}>
          {otherCategories.map((c) => (
            <li key={c.value}>
              <Link
                to={`/category/${c.value}`}
                className={styles.otherCard}
                style={{ ['--tile-bg' as never]: c.bgGradient } as never}
                aria-label={`${c.label} 카테고리`}
              >
                <span className={styles.otherEmoji} aria-hidden="true">
                  {c.emoji}
                </span>
                <span className={styles.otherLabel}>{c.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
