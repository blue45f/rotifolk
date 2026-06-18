import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import { Icon } from '@components/ui/Icon/Icon'
import { SEOUL_AREAS, formatDistanceKm, haversineKm } from '@rotifolk/shared'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import styles from './Neighborhood.module.css'

import type { PartySummary } from '@rotifolk/shared'

import { useGeolocation } from '@/domains/geo/useGeolocation'
import { PartyCard } from '@/domains/parties/PartyCard'
import { useVenueAreas } from '@/domains/venues/queries'
import { api } from '@/infrastructure/api'

const AREA_DESC: Record<string, string> = {
  한남동: '조용한 와인바와 갤러리가 많은 한강변 골목',
  연남동: '스페셜티 카페와 감성 공간이 밀집한 경의선 숲길',
  북촌: '한옥과 다실이 어우러진 고즈넉한 역사 마을',
  강남: '세련된 라운지와 위스키바가 모인 도심',
  성수: '뉴욕 브루클린 감성의 루프탑과 브루어리',
  망원: '로컬 감성 가득한 한강뷰 소셜 공간',
  이태원: '다국적 음식과 칵테일 바가 공존하는 글로벌 존',
  홍대: '라이브 뮤직과 인디 카페가 넘치는 젊음의 거리',
}

export default function NeighborhoodPage() {
  const [area, setArea] = useState<string | null>(null)
  const geo = useGeolocation(true)
  const { data: venueAreas } = useVenueAreas()
  const areaOptions = useMemo(
    () => (venueAreas?.length ? venueAreas : Object.keys(SEOUL_AREAS)),
    [venueAreas]
  )

  const distanceMap = useMemo(() => {
    if (!geo.coords) return null
    const map: Record<string, number> = {}
    for (const [name, coords] of Object.entries(SEOUL_AREAS)) {
      map[name] = haversineKm(geo.coords, coords)
    }
    return map
  }, [geo.coords])

  const sortedAreas = useMemo(() => {
    if (!distanceMap) return areaOptions
    return [...areaOptions].sort((a, b) => (distanceMap[a] ?? 999) - (distanceMap[b] ?? 999))
  }, [areaOptions, distanceMap])

  const { data, isLoading } = useQuery({
    queryKey: ['neighborhood', area],
    queryFn: () =>
      api.get<{ area: string | null; items: PartySummary[] }>(
        `parties/neighborhood${area ? `?area=${encodeURIComponent(area)}` : ''}`
      ),
  })

  const selectedDesc = area
    ? (AREA_DESC[area] ?? `${area}에서 열리는 로테이션 모임을 모아봤어요.`)
    : null

  const areaTitle = data?.area ?? '내 주변'
  const count = data?.items.length ?? 0

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true" />

      <header className={`container ${styles.head}`}>
        <p className={styles.kicker}>
          <Icon name="pin" aria-hidden="true" />
          우리 동네
        </p>
        <h1 className={styles.title}>{areaTitle} 모임</h1>
        <p className={styles.lead}>
          {selectedDesc ?? '걸어서 갈 만한 거리의 로테이션 모임만 모아봤어요.'}
        </p>
        <p className={styles.geoStatus} role="status" aria-live="polite">
          {geo.status === 'pending' ? (
            <>
              <Icon name="compass" aria-hidden="true" />
              현재 위치 감지 중…
            </>
          ) : geo.status === 'denied' ? (
            <>위치 권한 없이 보는 중 · 거리 표시 불가</>
          ) : null}
        </p>
      </header>

      <nav className={`container ${styles.chips}`} aria-label="동네 선택">
        <Chip
          selected={!area}
          onClick={() => setArea(null)}
          leadingIcon={<Icon name="home" aria-hidden="true" />}
        >
          내 동네
        </Chip>
        {sortedAreas.map((a) => {
          const km = distanceMap?.[a]
          return (
            <Chip
              key={a}
              selected={area === a}
              onClick={() => setArea(area === a ? null : a)}
              leadingIcon={<Icon name="pin" aria-hidden="true" />}
            >
              {a}
              {km != null && <span className={styles.chipDist}>{formatDistanceKm(km)}</span>}
            </Chip>
          )
        })}
      </nav>

      {geo.status === 'idle' && !geo.coords && (
        <div className={`container`}>
          <div className={styles.geoBanner}>
            <span className={styles.geoBannerText}>
              <Icon name="pin" aria-hidden="true" />
              위치를 허용하면 가까운 동네 순으로 정렬돼요.
            </span>
            <Button variant="soft" size="sm" onClick={geo.request}>
              위치 허용하기
            </Button>
          </div>
        </div>
      )}

      <section className={`container ${styles.list}`} aria-label={`${areaTitle} 모임 목록`}>
        {isLoading ? (
          <Loading />
        ) : count === 0 ? (
          <EmptyState
            emoji="🌙"
            title="이 동네엔 아직 모임이 없어요"
            description="첫 모임을 즉석으로 열어보는 건 어때요?"
            action={
              <Link to="/quick" className={styles.emptyLink}>
                <Button variant="gold" size="lg" leftIcon={<Icon name="bolt" aria-hidden="true" />}>
                  즉석 모임 열기
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className={styles.listHead}>
              <h2 className={styles.listTitle}>가까운 모임</h2>
              <span className={styles.count}>{count}개</span>
            </div>
            <div className={styles.grid}>
              {data!.items.map((p) => (
                <PartyCard key={p.id} party={p} />
              ))}
            </div>
            <p className={styles.onward}>
              찾는 모임이 없나요?{' '}
              <Link to="/discover" className={styles.onwardLink}>
                전체 둘러보기
                <Icon name="chevron-right" aria-hidden="true" />
              </Link>
            </p>
          </>
        )}
      </section>
    </div>
  )
}
