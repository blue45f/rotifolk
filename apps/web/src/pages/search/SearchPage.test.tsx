import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import type { Paginated, PartySummary } from '@rotifolk/shared'
import { api } from '@services/api'
import SearchPage from './SearchPage'

vi.mock('@services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(api)

/** 최소 PartySummary mock. 검색 필터에 필요한 필드만 의미 있게 채운다. */
function party(
  over: Partial<PartySummary> & Pick<PartySummary, 'id' | 'title' | 'category'>,
): PartySummary {
  return {
    coverImageUrl: null,
    startAt: '2026-06-10T19:00:00.000Z',
    currentParticipants: 2,
    maxParticipants: 10,
    status: 'open',
    tags: [],
    maritalRequirement: [],
    childrenPolicy: 'any',
    format: 'mixer',
    venueName: '플레이스',
    venueArea: '강남',
    basePriceKRW: 0,
    drinkPackage: 'none',
    snackPackage: 'none',
    hostId: 'h_1',
    hostNickname: '호스트',
    ...over,
  } as PartySummary
}

function renderSearch(initialQuery: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/search?q=${encodeURIComponent(initialQuery)}`]}>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function mockParties(items: PartySummary[]) {
  const payload: Paginated<PartySummary> = {
    items,
    total: items.length,
    page: 1,
    pageSize: items.length,
    hasNext: false,
  }
  mockedApi.get.mockImplementation((path: string) => {
    if (path.startsWith('parties')) return Promise.resolve(payload)
    return Promise.resolve([])
  })
}

describe('SearchPage smart search', () => {
  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('ADDITIVE: 제목에만 "와인"이 있는 비-wine 파티도 결과에 포함된다(슈퍼셋 보존)', async () => {
    // 핵심 회귀: '와인'을 검색하면 category!=='wine' 이라도 제목/태그에 '와인'이 있으면 잡혀야 한다.
    const naturalWineCustom = party({
      id: 'p_custom',
      title: '내추럴 와인 살롱',
      category: 'custom', // 정형 category 필터로는 절대 매칭 안 됨
    })
    const plainWine = party({
      id: 'p_wine',
      title: '강남 디너 모임', // 제목엔 '와인' 없음 → 정형 category=wine 필터로만 잡힘
      category: 'wine',
    })
    const unrelated = party({
      id: 'p_x',
      title: '커피 클래스',
      category: 'coffee',
      tags: ['핸드드립'],
    })
    mockParties([naturalWineCustom, plainWine, unrelated])

    renderSearch('와인')

    // custom 파티(제목 substring) + wine 파티(정형 필터) 둘 다 = 2개, 무관 파티는 제외.
    // 제목은 PartyCard의 <h3>로 렌더되므로 heading role로 정확히 조회한다.
    expect(
      await screen.findByRole('heading', { name: '내추럴 와인 살롱', level: 3 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '강남 디너 모임', level: 3 })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '커피 클래스', level: 3 })).not.toBeInTheDocument()
    expect(screen.getByText(/개의 결과/)).toHaveTextContent('2개의 결과')
  })

  it('ADDITIVE: 태그에만 "와인"이 있는 파티도 결과에 포함된다', async () => {
    const tagOnly = party({
      id: 'p_tag',
      title: '주말 소셜', // 제목엔 없음
      category: 'cocktail', // 정형 필터로도 안 잡힘
      tags: ['내추럴와인', '캐주얼'],
    })
    mockParties([tagOnly])

    renderSearch('와인')

    expect(await screen.findByRole('heading', { name: '주말 소셜', level: 3 })).toBeInTheDocument()
    expect(screen.getByText(/개의 결과/)).toHaveTextContent('1개의 결과')
  })

  it('genderRatio는 인식 조건으로 노출되지 않는다 (성비 칩 없음)', async () => {
    mockParties([party({ id: 'p_wine', title: '와인 나이트', category: 'wine' })])

    renderSearch('와인 5:5')

    // 결과는 정상 렌더되고
    expect(
      await screen.findByRole('heading', { name: '와인 나이트', level: 3 }),
    ).toBeInTheDocument()
    const parsedRow = screen.getByLabelText('인식된 검색 필터')
    // '인식한 조건'에 와인 칩은 있지만 '성비' 칩은 없어야 한다.
    expect(within(parsedRow).getByText('와인')).toBeInTheDocument()
    expect(within(parsedRow).queryByText(/성비/)).not.toBeInTheDocument()
    expect(within(parsedRow).queryByText(/5:5/)).not.toBeInTheDocument()
  })

  it('인식한 조건 칩은 비대화형(버튼/포커스 불가)이다', async () => {
    mockParties([party({ id: 'p_wine', title: '와인 나이트', category: 'wine' })])

    renderSearch('와인')

    await screen.findByRole('heading', { name: '와인 나이트', level: 3 })
    const parsedRow = screen.getByLabelText('인식된 검색 필터')
    // 읽기 전용 정보 칩 → button 이나 link 등 인터랙티브 role 이 없어야 한다.
    expect(within(parsedRow).queryByRole('button')).toBeNull()
    expect(within(parsedRow).queryAllByRole('link')).toHaveLength(0)
    expect(parsedRow.querySelector('button')).toBeNull()
  })

  it('정형 category 필터가 substring 결과를 빼앗지 않는다(예전엔 좁혀서 제외하던 케이스)', async () => {
    // 회귀 시나리오: 예전 AND 구현은 category!=='wine' 인 custom 파티를 제외했다.
    const custom = party({ id: 'p_c', title: '와인 페어링 디너', category: 'custom' })
    const wine = party({ id: 'p_w', title: '소믈리에의 밤', category: 'wine' })
    mockParties([custom, wine])

    renderSearch('와인')

    // 둘 다 살아남아야 한다(custom은 substring, wine은 정형 필터).
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: '와인 페어링 디너', level: 3 }),
      ).toBeInTheDocument(),
    )
    expect(screen.getByRole('heading', { name: '소믈리에의 밤', level: 3 })).toBeInTheDocument()
  })

  it('최근 검색 기록 패널에서 개별 삭제/전체 삭제가 바로 반영된다', async () => {
    mockParties([])
    const recents = ['와인', '칵테일', '브런치']
    localStorage.setItem('rotifolk-recent-searches', JSON.stringify(recents))

    renderSearch('')

    const input = await screen.findByRole('searchbox', { name: '파티 검색' })
    await userEvent.click(input)

    expect(await screen.findByText('최근 검색')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '와인 검색 기록 삭제' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '와인 검색 기록 삭제' }))
    expect(screen.queryByRole('button', { name: '와인 검색 기록 삭제' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '칵테일 검색 기록 삭제' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '전체 삭제' }))
    expect(screen.queryByText('최근 검색')).not.toBeInTheDocument()
  })
})
