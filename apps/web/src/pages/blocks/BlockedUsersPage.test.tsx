import { ConfirmProvider } from '@components/feedback/Confirm/ConfirmProvider'
import { ToastProvider } from '@components/feedback/Toast/ToastProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import BlockedUsersPage from './BlockedUsersPage'

import { api } from '@/infrastructure/api'

vi.mock('@/infrastructure/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
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
      <ToastProvider>
        <ConfirmProvider>
          <MemoryRouter>
            <BlockedUsersPage />
          </MemoryRouter>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

function mockBlockApis(
  overrides: {
    blocks?: Array<{
      id: string
      nickname: string
      avatarId: string | null
      blockedAt?: string
      reason?: string | null
    }>
  } = {}
) {
  mockedApi.get.mockImplementation((path: string) => {
    if (path === 'blocks') return Promise.resolve(overrides.blocks ?? [])
    if (path === 'blocks/candidates') return Promise.resolve([])
    if (path === 'blocks/phones') {
      return Promise.resolve([
        {
          id: 'avoid_1',
          label: '전 직장 동료',
          createdAt: '2026-06-01T09:00:00.000Z',
        },
      ])
    }
    return Promise.resolve([])
  })
  mockedApi.post.mockResolvedValue({ ok: true })
  mockedApi.delete.mockResolvedValue({ ok: true })
}

describe('BlockedUsersPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows contact avoidance records without requiring or exposing raw phone numbers', async () => {
    const user = userEvent.setup()
    mockBlockApis()

    renderPage()

    await user.click(await screen.findByRole('tab', { name: '연락처 기반 지인 차단' }))

    const panel = await screen.findByRole('tabpanel', { name: '연락처 기반 지인 차단' })
    expect(within(panel).getByText('원본 번호는 저장하지 않아요')).toBeInTheDocument()
    expect(within(panel).getByText('전 직장 동료')).toBeInTheDocument()
    expect(within(panel).getByText('해시 등록됨')).toBeInTheDocument()
    expect(within(panel).queryByText(/010-/)).not.toBeInTheDocument()
  })

  it('opens an accessible bulk contact dialog and submits unique valid numbers only', async () => {
    const user = userEvent.setup()
    mockBlockApis()

    renderPage()

    await user.click(await screen.findByRole('tab', { name: '연락처 기반 지인 차단' }))
    await user.click(await screen.findByRole('button', { name: '연락처 대량 추가' }))

    const dialog = screen.getByRole('dialog', { name: '연락처 일괄 대량 차단' })
    await user.type(
      within(dialog).getByRole('textbox', { name: '전화번호 목록' }),
      '010-1111-2222\n+82 10-1111-2222\nnot-a-phone\n010-3333-4444'
    )
    await user.click(within(dialog).getByRole('button', { name: '일괄 등록' }))

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledTimes(2))
    expect(mockedApi.post).toHaveBeenNthCalledWith(1, 'blocks/phones', {
      phone: '010-1111-2222',
      reason: '지인 회피',
    })
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, 'blocks/phones', {
      phone: '010-3333-4444',
      reason: '지인 회피',
    })
  })

  it('shows a clear empty result when blocked user search has no matches', async () => {
    const user = userEvent.setup()
    mockBlockApis({
      blocks: [
        {
          id: 'u_1',
          nickname: '민우',
          avatarId: null,
          blockedAt: '2026-06-01T09:00:00.000Z',
          reason: '비매너',
        },
      ],
    })

    renderPage()

    await screen.findByText('민우')
    await user.type(screen.getByRole('searchbox', { name: '차단 유저 닉네임 검색' }), '없는 사람')

    expect(screen.getByText('"없는 사람"와 일치하는 차단 사용자가 없어요.')).toBeInTheDocument()
    expect(screen.queryByText('민우')).not.toBeInTheDocument()
  })
})
