/**
 * 파티 상세 → schema.org Event JSON-LD 빌더.
 *
 * 검색엔진이 파티를 이벤트 리치 결과(날짜·장소·가격)로 노출할 수 있도록
 * 구조화 데이터를 생성한다. 주입은 usePageMeta({ jsonLd })가 담당하고
 * (src/hooks/usePageMeta.ts), 사이트 공통 WebSite/Organization 블록은
 * index.html에 정적으로 있다.
 *
 * Party 상세 응답에는 venueId만 있고 장소 정보가 없으므로 location(Place)은
 * 공개 venue 단건 조회 결과로 보강한다 — venue가 아직 없어도 유효한 Event를
 * 반환하고, 로드되면 usePageMeta가 script를 갱신한다.
 */

import type { Party, Venue } from '@rotifolk/shared'

/** PartyStatus → schema.org eventStatus. 취소만 구분하고 나머지는 예정으로 본다. */
function toEventStatus(status: Party['status']): string {
  return status === 'cancelled'
    ? 'https://schema.org/EventCancelled'
    : 'https://schema.org/EventScheduled'
}

/**
 * 파티 1건을 schema.org Event 객체로 변환한다.
 *
 * @param party 파티 상세 (useParty 응답의 party)
 * @param pageUrl 이 파티의 정식 URL (예: `${SITE_ORIGIN}/parties/:id` — usePageMeta.ts의 canonical과 동일 출처)
 * @param venue 파티 장소 (로딩 전이면 생략 — location 없이 생성)
 */
export function buildPartyEventJsonLd(
  party: Party,
  pageUrl: string,
  venue?: Pick<Venue, 'name' | 'address'>
): Record<string, unknown> {
  const soldOut = party.status === 'full' || party.currentParticipants >= party.maxParticipants
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: party.title,
    description: party.description,
    url: pageUrl,
    inLanguage: 'ko',
    startDate: party.startAt,
    endDate: party.endAt,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: toEventStatus(party.status),
    // 커버 이미지가 없으면 사이트 공용 OG 이미지로 폴백 (리치 결과에 image 권장).
    image: party.coverImageUrl || new URL('/og.png', pageUrl).toString(),
    maximumAttendeeCapacity: party.maxParticipants,
    ...(venue ? { location: { '@type': 'Place', name: venue.name, address: venue.address } } : {}),
    ...(party.host?.nickname
      ? { organizer: { '@type': 'Person', name: party.host.nickname } }
      : {}),
    offers: {
      '@type': 'Offer',
      price: party.pricing.basePriceKRW,
      priceCurrency: 'KRW',
      url: pageUrl,
      availability: soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    },
  }
}
