import { http, HttpResponse } from 'msw'
import type { Paginated, Participation, PartySummary } from '@rotifolk/shared'
import { quoteVenueBooking, recommendVenues, suggestOffHoursSlots } from '@rotifolk/shared'
import {
  MOCK_TOKEN,
  mockCards,
  mockMenus,
  mockParties,
  mockUsers,
  mockVenueBookings,
  mockVenues,
  toSummary,
} from './data'

const API = '*/api'

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms))
}

export const handlers = [
  http.get(`${API}/health`, () =>
    HttpResponse.json({ ok: true, app: 'rotifolk-mock', ts: new Date().toISOString() }),
  ),

  // Auth
  http.post(`${API}/auth/login`, async () => {
    return HttpResponse.json(await delay({ token: MOCK_TOKEN, user: mockUsers[0] }))
  }),
  http.post(`${API}/auth/signup`, async () => {
    return HttpResponse.json(await delay({ token: MOCK_TOKEN, user: mockUsers[1] }))
  }),
  http.get(`${API}/auth/me`, async () => {
    return HttpResponse.json(await delay({ user: mockUsers[0] }))
  }),

  // Parties
  http.get(`${API}/parties`, async ({ request }) => {
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const items = mockParties
      .filter((p) => (category ? p.config.category === category : true))
      .map(toSummary)
    const payload: Paginated<PartySummary> = {
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
      hasNext: false,
    }
    return HttpResponse.json(await delay(payload))
  }),
  http.get(`${API}/parties/mine`, async () =>
    HttpResponse.json(
      await delay(
        [] as Array<{ participation: { id: string; status: string }; party: PartySummary }>,
      ),
    ),
  ),
  http.get(`${API}/parties/hosted`, async () =>
    HttpResponse.json(await delay([mockParties[0]].map(toSummary))),
  ),
  http.get(`${API}/parties/:id`, async ({ params }) => {
    const party = mockParties.find((p) => p.id === params.id)
    if (!party) return new HttpResponse('not found', { status: 404 })
    const participants: Participation[] = mockUsers.map((u, i) => ({
      id: `pt_${i}`,
      partyId: party.id,
      userId: u.id,
      status: 'confirmed',
      seatNumber: i + 1,
      checkedInAt: null,
      user: u as never,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }))
    return HttpResponse.json(await delay({ party, participants }))
  }),
  http.post(`${API}/parties/:id/join`, async ({ params }) =>
    HttpResponse.json(
      await delay({
        id: 'pt_me',
        partyId: params.id as string,
        userId: mockUsers[0].id,
        status: 'confirmed',
        seatNumber: 99,
        checkedInAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ),
  ),

  // Venues — 정적 라우트(recommend/mine)를 :id 보다 먼저 등록
  http.get(`${API}/venues/recommend`, async ({ request }) => {
    const url = new URL(request.url)
    const num = (k: string) => {
      const v = url.searchParams.get(k)
      return v == null ? null : Number(v)
    }
    const brief = {
      category: (url.searchParams.get('category') ?? 'wine') as never,
      area: url.searchParams.get('area') ?? undefined,
      partySize: num('partySize') ?? 8,
      startAt: url.searchParams.get('startAt') ?? undefined,
      endAt: url.searchParams.get('endAt') ?? undefined,
      lat: num('lat'),
      lng: num('lng'),
      maxBudgetKRW: num('maxBudgetKRW'),
    }
    const recs = recommendVenues(mockVenues, brief, {
      viewer: { lat: brief.lat, lng: brief.lng },
      limit: 12,
    })
    return HttpResponse.json(await delay(recs))
  }),
  http.get(`${API}/venues/mine`, async () =>
    HttpResponse.json(
      await delay(
        mockVenues
          .filter((v) => v.ownerId === 'u_host')
          .map((v) => ({
            ...v,
            isMine: true,
            upcomingParties: mockParties.filter((p) => p.venueId === v.id).length,
            pendingRequests: mockVenueBookings.filter(
              (b) => b.venueId === v.id && b.status === 'requested',
            ).length,
          })),
      ),
    ),
  ),
  http.get(`${API}/venues`, async () => HttpResponse.json(await delay(mockVenues))),
  http.get(`${API}/venues/:id/availability`, async ({ params }) => {
    const v = mockVenues.find((vv) => vv.id === params.id)
    if (!v) return new HttpResponse('not found', { status: 404 })
    const offHours = suggestOffHoursSlots(v, { days: 14 })
    return HttpResponse.json(await delay({ venueId: v.id, busy: [], offHours }))
  }),
  http.get(`${API}/venues/:id/menu`, async ({ params }) =>
    HttpResponse.json(await delay(mockMenus[params.id as string] ?? [])),
  ),
  http.get(`${API}/venues/:id`, async ({ params }) => {
    const v = mockVenues.find((vv) => vv.id === params.id)
    if (!v) return new HttpResponse('not found', { status: 404 })
    return HttpResponse.json(await delay({ venue: v, menu: mockMenus[v.id] ?? [] }))
  }),
  http.post(`${API}/venues`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      await delay({
        id: `v_${Date.now()}`,
        rating: 0,
        reviewCount: 0,
        partnered: false,
        ...body,
        ownerId: 'u_host',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    )
  }),
  http.patch(`${API}/venues/:id`, async ({ params, request }) => {
    const v = mockVenues.find((vv) => vv.id === params.id)
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(await delay({ ...(v ?? {}), ...body, id: params.id }))
  }),

  // Venue bookings (섭외)
  http.get(`${API}/venue-bookings/mine`, async ({ request }) => {
    const url = new URL(request.url)
    const role = url.searchParams.get('role') ?? 'requester'
    const list =
      role === 'owner'
        ? mockVenueBookings.filter((b) => b.ownerId === 'u_host')
        : mockVenueBookings.filter((b) => b.requesterId === 'u_host')
    return HttpResponse.json(await delay(list))
  }),
  http.post(`${API}/venue-bookings`, async ({ request }) => {
    const body = (await request.json()) as {
      venueId: string
      startAt: string
      endAt: string
      partySize: number
      category: string
      noteToOwner?: string | null
    }
    const v = mockVenues.find((vv) => vv.id === body.venueId)
    const q = v ? quoteVenueBooking(v, body.startAt, body.endAt) : null
    const status = v?.instantBook ? 'confirmed' : 'requested'
    return HttpResponse.json(
      await delay({
        id: `vb_${Date.now()}`,
        venueId: body.venueId,
        venueName: v?.name,
        venueArea: v?.area,
        venuePhoto: v?.photos[0] ?? null,
        requesterId: 'u_host',
        requesterNickname: '소믈리에 도이',
        ownerId: v?.ownerId ?? null,
        partyId: null,
        startAt: body.startAt,
        endAt: body.endAt,
        partySize: body.partySize,
        category: body.category,
        noteToOwner: body.noteToOwner ?? null,
        status,
        hours: q?.hours ?? 0,
        baseKRW: q?.baseKRW ?? 0,
        multiplier: q?.multiplier ?? 1,
        discountKRW: q?.discountKRW ?? 0,
        cleaningFeeKRW: q?.cleaningFeeKRW ?? 0,
        totalKRW: q?.totalKRW ?? 0,
        ownerMessage: null,
        decidedAt: status === 'confirmed' ? new Date().toISOString() : null,
        arrivalGuide: status === 'confirmed' ? (v?.arrivalGuide ?? null) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    )
  }),
  http.patch(`${API}/venue-bookings/:id/:action`, async ({ params }) =>
    HttpResponse.json(await delay({ ok: true, id: params.id, action: params.action })),
  ),

  // Question cards
  http.get(`${API}/question-cards`, async () => HttpResponse.json(await delay(mockCards))),
  http.get(`${API}/question-cards/draw`, async () =>
    HttpResponse.json(await delay(mockCards[Math.floor(Math.random() * mockCards.length)])),
  ),

  // Chat (empty by default)
  http.get(`${API}/chat/rooms`, async () => HttpResponse.json(await delay([]))),
  http.get(`${API}/chat/rooms/:id/messages`, async () => HttpResponse.json(await delay([]))),
  http.get(`${API}/chat/unread-count`, async () =>
    HttpResponse.json(await delay({ count: 0, rooms: 0 })),
  ),

  // Payments (empty by default in mock mode)
  http.get(`${API}/payments/me`, async () => HttpResponse.json(await delay([]))),

  // Safety (empty list of blocks by default; reports succeed)
  http.get(`${API}/blocks`, async () => HttpResponse.json(await delay([]))),
  http.post(`${API}/blocks/:userId`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.delete(`${API}/blocks/:userId`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.post(`${API}/reports`, async () =>
    HttpResponse.json(await delay({ id: 'mock-report', status: 'open' })),
  ),

  // Orders / split
  http.get(`${API}/orders/party/:id/split`, async ({ request }) => {
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') ?? 'equal'
    return HttpResponse.json(
      await delay({
        mode,
        totalKRW: 184_000,
        headcount: 8,
        perPersonKRW: 23_000,
        breakdown: [],
      }),
    )
  }),

  // Orders (host management)
  http.get(`${API}/orders/party/:id`, async () => HttpResponse.json(await delay([]))),
  http.patch(`${API}/orders/:id/status`, async () => HttpResponse.json(await delay({ ok: true }))),

  // Follows
  http.get(`${API}/follows/me`, async () => HttpResponse.json(await delay([]))),
  http.post(`${API}/follows/:userId`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.delete(`${API}/follows/:userId`, async () => HttpResponse.json(await delay({ ok: true }))),

  // Saved parties
  http.get(`${API}/saved`, async () => HttpResponse.json(await delay([]))),
  http.post(`${API}/saved/:partyId`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.delete(`${API}/saved/:partyId`, async () => HttpResponse.json(await delay({ ok: true }))),

  // Notifications
  http.get(`${API}/notifications/unread-count`, async () =>
    HttpResponse.json(await delay({ count: 0 })),
  ),
  http.get(`${API}/notifications`, async () => HttpResponse.json(await delay([]))),
  http.patch(`${API}/notifications/read-all`, async () =>
    HttpResponse.json(await delay({ ok: true })),
  ),

  // Host profile (public)
  http.get(`${API}/hosts/:id`, async () =>
    HttpResponse.json(
      await delay({
        user: {
          ...mockUsers[0],
          bio: null,
          mbti: 'ENFP',
          interestsJson: '[]',
          trustScore: 92,
          hostedCount: 3,
          isVerified: true,
          role: 'host',
        },
        stats: { followerCount: 12, hostedCount: 3, averageRating: 4.7, reviewCount: 5 },
        reviews: [],
        recentParties: [mockParties[0]].map(toSummary),
      }),
    ),
  ),

  // Host revenue summary
  http.get(`${API}/payments/host/summary`, async () =>
    HttpResponse.json(await delay({ totalKRW: 0, paidCount: 0, refundedKRW: 0, recent: [] })),
  ),

  // Vibe matching
  http.post(`${API}/vibe`, async () =>
    HttpResponse.json(
      await delay({
        matches: mockParties.slice(0, 3).map(toSummary),
        explanation: '입력하신 분위기와 가장 잘 맞는 모임을 골라봤어요.',
      }),
    ),
  ),

  // Host applications
  http.get(`${API}/host-applications/mine`, async () => HttpResponse.json(await delay(null))),
  http.post(`${API}/host-applications`, async () =>
    HttpResponse.json(
      await delay({
        id: 'app-mock',
        userId: mockUsers[0].id,
        introduction: '',
        hostingStyle: '',
        plannedCategories: [],
        experience: null,
        status: 'pending',
        reviewedById: null,
        reviewedNote: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ),
  ),

  // Admin
  http.get(`${API}/admin/reports`, async ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    if (status === 'resolved') {
      return HttpResponse.json(await delay([]))
    }
    return HttpResponse.json(await delay([]))
  }),
  http.patch(`${API}/admin/reports/:id`, async () => HttpResponse.json(await delay({ ok: true }))),

  // Recent reviews (digest)
  http.get(`${API}/reviews/recent`, async () => HttpResponse.json(await delay([]))),

  // Account deletion
  http.delete(`${API}/users/me`, async () => HttpResponse.json(await delay({ ok: true }))),

  // Payments host summary (kakao quick create)
  http.post(`${API}/auth/kakao`, async ({ request }) => {
    const body = (await request.json()) as { kakaoId: string; nickname: string }
    return HttpResponse.json(
      await delay({
        token: MOCK_TOKEN,
        user: { ...mockUsers[0], nickname: body.nickname },
      }),
    )
  }),

  // Notes (쪽지)
  http.get(`${API}/notes/mine`, async () => HttpResponse.json(await delay([]))),
  http.get(`${API}/notes/party/:partyId`, async () =>
    HttpResponse.json(await delay({ received: [], sent: [] })),
  ),
  http.post(`${API}/notes`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      await delay({ id: `note_${Date.now()}`, ...body, deliveredAt: null, readAt: null }),
    )
  }),
  http.patch(`${API}/notes/:id/read`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.post(`${API}/notes/party/:partyId/deliver`, async () =>
    HttpResponse.json(await delay({ delivered: 0 })),
  ),

  // Me (사전 프로필 · 신상 인증 · 지인 회피)
  http.patch(`${API}/me/profile`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.patch(`${API}/me/trust`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.post(`${API}/me/verify`, async ({ request }) => {
    const body = (await request.json()) as { field?: string }
    return HttpResponse.json(await delay({ verifiedFields: body.field ? [body.field] : [] }))
  }),
  http.patch(`${API}/me/contact`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.get(`${API}/me/avoid-contacts`, async () => HttpResponse.json(await delay([]))),
  http.post(`${API}/me/avoid-contacts`, async () => HttpResponse.json(await delay({ count: 1 }))),
  http.delete(`${API}/me/avoid-contacts/:id`, async () =>
    HttpResponse.json(await delay({ ok: true })),
  ),
  http.get(`${API}/me/avoid-check`, async () => HttpResponse.json(await delay([]))),
]
