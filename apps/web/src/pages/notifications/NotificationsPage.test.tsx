import { api } from '@services/api'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import NotificationsPage from './NotificationsPage'

vi.mock('@infrastructure/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const mockedApi = vi.mocked(api)

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('NotificationsPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the hook order stable when notifications finish loading', async () => {
    mockedApi.get.mockResolvedValueOnce([
      {
        id: 'nt_1',
        kind: 'party_join',
        title: '새 참가자',
        body: '와인 모임에 새 참가자가 들어왔어요.',
        link: '/host/parties/p_wine',
        isRead: false,
        createdAt: '2026-06-01T10:00:00.000Z',
      },
    ])

    renderPage()

    expect(await screen.findByRole('heading', { name: '알림' })).toBeInTheDocument()
    expect(screen.getByText('새 참가자')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '읽음으로 표시' })).toBeInTheDocument()
  })
})
