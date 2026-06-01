import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { PartySummary } from '@rotifolk/shared'
import { SEOUL_AREAS, formatDistanceKm, haversineKm } from '@rotifolk/shared'
import { api } from '@services/api'
import { useGeolocation } from '@features/geo/useGeolocation'
import { useVenueAreas } from '@features/venues/queries'
import { PartyCard } from '@features/parties/PartyCard'
import { Chip } from '@components/ui/Chip/Chip'
import { Badge } from '@components/ui/Badge/Badge'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { Link } from 'react-router-dom'
import { Button } from '@components/ui/Button/Button'
import styles from './Neighborhood.module.css'

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
    [venueAreas],
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
        `parties/neighborhood${area ? `?area=${encodeURIComponent(area)}` : ''}`,
      ),
  })

  const selectedDesc = area
    ? (AREA_DESC[area] ?? `${area}에서 열리는 로테이션 모임을 모아봤어요.`)
    : null

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true" />
      <header className={`container ${styles.head}`}>
        <Badge tone="info" size="md">
          📍 우리 동네
        </Badge>
        <h1 className={styles.title}>{data?.area ?? '내 주변'} 모임</h1>
        <p className={styles.lead}>
          {selectedDesc ?? '걸어서 갈 만한 거리의 로테이션 모임만 모아봤어요.'}
        </p>
        {geo.status === 'pending' && <p className={styles.geoStatus}>📡 현재 위치 감지 중…</p>}
        {geo.status === 'denied' && (
          <p className={styles.geoStatus}>위치 권한 없이 보는 중 · 거리 표시 불가</p>
        )}
      </header>

      <section className={`container ${styles.chips}`}>
        <Chip selected={!area} onClick={() => setArea(null)}>
          🏠 내 동네
        </Chip>
        {sortedAreas.map((a) => {
          const km = distanceMap?.[a]
          return (
            <Chip key={a} selected={area === a} onClick={() => setArea(area === a ? null : a)}>
              📍 {a}
              {km != null && <span className={styles.chipDist}>{formatDistanceKm(km)}</span>}
            </Chip>
          )
        })}
      </section>

      {geo.status === 'idle' && !geo.coords && (
        <div className={`container ${styles.geoBanner}`}>
          <span>📍 위치를 허용하면 가까운 동네 순으로 정렬돼요.</span>
          <button type="button" className={styles.geoBtn} onClick={geo.request}>
            위치 허용하기
          </button>
        </div>
      )}

      <section className={`container ${styles.list}`}>
        {isLoading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            emoji="🌙"
            title="이 동네엔 아직 모임이 없어요"
            description="첫 모임을 즉석으로 열어보는 건 어때요?"
            action={
              <Link to="/quick">
                <Button variant="gold" size="lg">
                  ⚡ 즉석 모임 열기
                </Button>
              </Link>
            }
          />
        ) : (
          <div className={styles.grid}>
            {data.items.map((p) => (
              <PartyCard key={p.id} party={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
