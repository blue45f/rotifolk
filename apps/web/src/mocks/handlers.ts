import { http, HttpResponse } from 'msw'
import type { Paginated, Participation, PartySummary } from '@rotifolk/shared'
import {
  MOCK_TOKEN,
  mockCards,
  mockMenus,
  mockParties,
  mockUsers,
  mockVenues,
  toSummary,
} from './data'

const API = '*/api'

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms))
}

export const handlers = [
  http.get(`${API}/health`, () => HttpResponse.json({ ok: true, app: 'rotifolk-mock', ts: new Date().toISOString() })),

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
  http.get(`${API}/parties/mine`, async () => HttpResponse.json(await delay([] as Array<{ participation: { id: string; status: string }; party: PartySummary }>))),
  http.get(`${API}/parties/hosted`, async () => HttpResponse.json(await delay([mockParties[0]].map(toSummary)))),
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
    HttpResponse.json(await delay({
      id: 'pt_me',
      partyId: params.id as string,
      userId: mockUsers[0].id,
      status: 'confirmed',
      seatNumber: 99,
      checkedInAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  ),

  // Venues
  http.get(`${API}/venues`, async () => HttpResponse.json(await delay(mockVenues))),
  http.get(`${API}/venues/:id`, async ({ params }) => {
    const v = mockVenues.find((vv) => vv.id === params.id)
    if (!v) return new HttpResponse('not found', { status: 404 })
    return HttpResponse.json(await delay({ venue: v, menu: mockMenus[v.id] ?? [] }))
  }),
  http.get(`${API}/venues/:id/menu`, async ({ params }) =>
    HttpResponse.json(await delay(mockMenus[params.id as string] ?? [])),
  ),

  // Question cards
  http.get(`${API}/question-cards`, async () => HttpResponse.json(await delay(mockCards))),
  http.get(`${API}/question-cards/draw`, async () =>
    HttpResponse.json(await delay(mockCards[Math.floor(Math.random() * mockCards.length)])),
  ),

  // Chat (empty by default)
  http.get(`${API}/chat/rooms`, async () => HttpResponse.json(await delay([]))),
  http.get(`${API}/chat/rooms/:id/messages`, async () => HttpResponse.json(await delay([]))),
  http.get(`${API}/chat/unread-count`, async () => HttpResponse.json(await delay({ count: 0, rooms: 0 }))),

  // Payments (empty by default in mock mode)
  http.get(`${API}/payments/me`, async () => HttpResponse.json(await delay([]))),

  // Safety (empty list of blocks by default; reports succeed)
  http.get(`${API}/blocks`, async () => HttpResponse.json(await delay([]))),
  http.post(`${API}/blocks/:userId`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.delete(`${API}/blocks/:userId`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.post(`${API}/reports`, async () => HttpResponse.json(await delay({ id: 'mock-report', status: 'open' }))),

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
  http.get(`${API}/orders/party/:id`, async () =>
    HttpResponse.json(await delay([])),
  ),
  http.patch(`${API}/orders/:id/status`, async () =>
    HttpResponse.json(await delay({ ok: true })),
  ),

  // Follows
  http.get(`${API}/follows/me`, async () => HttpResponse.json(await delay([]))),
  http.post(`${API}/follows/:userId`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.delete(`${API}/follows/:userId`, async () => HttpResponse.json(await delay({ ok: true }))),

  // Saved parties
  http.get(`${API}/saved`, async () => HttpResponse.json(await delay([]))),
  http.post(`${API}/saved/:partyId`, async () => HttpResponse.json(await delay({ ok: true }))),
  http.delete(`${API}/saved/:partyId`, async () => HttpResponse.json(await delay({ ok: true }))),

  // Notifications
  http.get(`${API}/notifications`, async () => HttpResponse.json(await delay([]))),
  http.patch(`${API}/notifications/read-all`, async () => HttpResponse.json(await delay({ ok: true }))),

  // Host profile (public)
  http.get(`${API}/hosts/:id`, async () =>
    HttpResponse.json(await delay({
      user: { ...mockUsers[0], bio: null, mbti: 'ENFP', interestsJson: '[]', trustScore: 92, hostedCount: 3, isVerified: true, role: 'host' },
      stats: { followerCount: 12, hostedCount: 3, averageRating: 4.7, reviewCount: 5 },
      reviews: [],
      recentParties: [mockParties[0]].map(toSummary),
    })),
  ),

  // Host revenue summary
  http.get(`${API}/payments/host/summary`, async () =>
    HttpResponse.json(await delay({ totalKRW: 0, paidCount: 0, refundedKRW: 0, recent: [] })),
  ),

  // Vibe matching
  http.post(`${API}/vibe`, async () =>
    HttpResponse.json(await delay({
      matches: mockParties.slice(0, 3).map(toSummary),
      explanation: '입력하신 분위기와 가장 잘 맞는 모임을 골라봤어요.',
    })),
  ),

  // Host applications
  http.get(`${API}/host-applications/mine`, async () =>
    HttpResponse.json(await delay(null)),
  ),
  http.post(`${API}/host-applications`, async () =>
    HttpResponse.json(await delay({
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
    })),
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
  http.patch(`${API}/admin/reports/:id`, async () =>
    HttpResponse.json(await delay({ ok: true })),
  ),

  // Payments host summary (kakao quick create)
  http.post(`${API}/auth/kakao`, async ({ request }) => {
    const body = await request.json() as { kakaoId: string; nickname: string }
    return HttpResponse.json(await delay({
      token: MOCK_TOKEN,
      user: { ...mockUsers[0], nickname: body.nickname },
    }))
  }),
]
